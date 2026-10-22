require('dotenv').config({ path: `${__dirname}/.env`, quiet: true });
// Contract address etc. written by `npm run deploy:local:export`; fills only values not set above.
require('dotenv').config({ path: `${__dirname}/.generated-blockchain.env`, quiet: true });
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Project = require('./models/Project');
const { runMrvModels, actualDonorChange, mlHealth } = require('./services/mlService');
const { uploadMrvReportToIpfs } = require('./services/ipfsService');
const {
  chainHealth, ensurePlotOnChain, explainChainError, registerPlotOnChain, commitBaselineOnChain,
  recordObservationOnChain, finalizeYearOnChain, readYearOnChain, toWad,
} = require('./services/blockchainService');
const { createSealedBaseline, sha256Hex } = require('./services/baselineService');
const { quarterObservation, computeYearCredits } = require('./services/credits');
const { yearWindows, nextYearWindows, windowHasEnded } = require('./services/windows');
const { isWalletAddress, createLoginChallenge, verifyLoginSignature, requireAuth } = require('./services/auth');

const app = express();
let dbConnected = false;

// The Vite dev server proxies /api, so cross-origin access is only needed when CORS_ORIGIN is set.
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : false }));
app.use(express.json());

if (!process.env.MONGODB_URI) {
  console.error('MongoDB connection error: MONGODB_URI is missing in backend/.env');
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      dbConnected = true;
      console.log('MongoDB connected successfully');
    })
    .catch((err) => console.error('MongoDB connection error:', err));
}

const ensureDbConnected = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      error: 'Database is not connected. Set MONGODB_URI in backend/.env and restart backend server.',
    });
  }
  next();
};

// Wraps an async route so thrown errors become JSON responses.
const route = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error(err);
    const chainAdvice = explainChainError(err);
    res.status(chainAdvice ? 409 : err.status || 500).json({ success: false, error: chainAdvice || err.message });
  }
};

const fail = (status, message) => Object.assign(new Error(message), { status });

const createPlotId = () => `PLOT-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const isConfigured = (value) => Boolean(value && String(value).trim().length > 0);
const strictRealDataEnabled = () => String(process.env.STRICT_REAL_DATA || 'false') === 'true';

const toRadians = (value) => (value * Math.PI) / 180;
const computePolygonAreaHectares = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 3) return 0;
  const earthRadiusMeters = 6378137;
  const meanLatRad = toRadians(coordinates.reduce((sum, point) => sum + Number(point[0] || 0), 0) / coordinates.length);
  const projected = coordinates.map(([lat, lon]) => [
    earthRadiusMeters * toRadians(Number(lon)) * Math.cos(meanLatRad),
    earthRadiusMeters * toRadians(Number(lat)),
  ]);
  let twiceArea = 0;
  for (let i = 0; i < projected.length; i += 1) {
    const [x1, y1] = projected[i];
    const [x2, y2] = projected[(i + 1) % projected.length];
    twiceArea += (x1 * y2) - (x2 * y1);
  }
  return Number((Math.abs(twiceArea) / 2 / 10000).toFixed(4));
};

/** [lat, lon] corners -> closed GeoJSON ring of [lon, lat]. */
const toGeoJsonPolygon = (coordinates) => {
  const ring = coordinates.map(([lat, lon]) => [Number(lon), Number(lat)]);
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
};

// Prototype identity: a stable demo ID instead of a real identity document.
const mockIdentityId = (wallet, name, phone) => `DEMO-${crypto.createHash('sha256')
  .update(`${wallet}|${name.trim().toLowerCase()}|${phone.replace(/\D/g, '')}`).digest('hex').slice(0, 10).toUpperCase()}`;

const SUPPORTED_ECOSYSTEMS = new Set(['mangrove', 'seagrass', 'saltmarsh']);
// Ecosystems that can be registered today. Seagrass and saltmarsh are planned future additions:
// the classifier and data model already know them, but they can't be registered yet.
const ENABLED_ECOSYSTEMS = new Set(['mangrove']);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const walletQuery = (address) => ({ walletAddress: new RegExp(`^${escapeRegex(address)}$`, 'i') });

// Loads a project and confirms it belongs to the authenticated wallet.
const findOwnedProject = async (req, filter) => {
  const project = await Project.findOne(filter);
  if (!project) throw fail(404, 'Project not found');
  if (project.walletAddress.toLowerCase() !== req.walletAddress) throw fail(403, 'This project belongs to a different wallet');
  return project;
};

const currentCycles = (project) => project.monitoringCycles.filter((cycle) => (cycle.year || 1) === project.year);

// ---------------------------------------------------------------------------------- auth

app.post('/api/auth/nonce', (req, res) => {
  try {
    res.status(200).json({ success: true, message: createLoginChallenge(req.body?.address) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const token = verifyLoginSignature(req.body?.address, req.body?.signature);
    res.status(200).json({ success: true, token });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------------------- registration

app.post('/api/projects', ensureDbConnected, requireAuth, route(async (req, res) => {
  const vegetationType = String(req.body.vegetationType || '').toLowerCase();
  if (!ENABLED_ECOSYSTEMS.has(vegetationType)) {
    throw fail(400, 'Only mangrove plots can be registered right now. Seagrass and saltmarsh are planned for a future version.');
  }
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim();
  if (!name || !phone || !address) throw fail(400, 'Name, phone number and village/town are required.');

  const coordinates = Array.isArray(req.body.coordinates) ? req.body.coordinates : [];
  const area = computePolygonAreaHectares(coordinates);
  if (area <= 0) throw fail(400, 'Could not work out the plot area. Click at least 3 corners, going around the plot in order so the lines do not cross.');

  // Overlap check: a piece of land can only be registered once.
  const boundary = toGeoJsonPolygon(coordinates);
  let overlapping;
  try {
    overlapping = await Project.findOne({ boundary: { $geoIntersects: { $geometry: boundary } } }, 'plotId');
  } catch {
    throw fail(400, 'The plot boundary lines cross each other. Please redraw the corners in order around the plot.');
  }
  if (overlapping) throw fail(409, `This plot overlaps an already registered plot (${overlapping.plotId}).`);

  const plotId = createPlotId();
  const ecosystemCheck = await runMrvModels(
    { plotId, walletAddress: req.walletAddress, coordinates, vegetationType, area, monitoringCycles: [] },
    { strictRealData: strictRealDataEnabled() },
  );
  // The classifier decides what the plot is before looking at the claim; see ml-service/app/classifier.py.
  if (ecosystemCheck.classificationDecision !== 'accept') {
    const identified = ecosystemCheck.identifiedEcosystem;
    const confidencePct = Math.round((ecosystemCheck.ecosystemConfidence || 0) * 100);
    let error;
    if (identified === 'unknown') {
      error = 'We could not get satellite images for this plot right now, so it could not be checked. Please try again later.';
    } else if (identified === vegetationType) {
      error = `The satellite images suggest ${identified}, but only with ${confidencePct}% confidence, which is not enough. Please redraw the boundary more tightly around the ${vegetationType} area and try again.`;
    } else if (SUPPORTED_ECOSYSTEMS.has(identified)) {
      error = `The satellite images show ${identified} (${confidencePct}% confidence), not ${vegetationType}. Please check your plot boundary or the ecosystem you chose.`;
    } else {
      error = `The satellite images show that this plot is not ${vegetationType}. It looks like other land or open water (${confidencePct}% confidence).`;
    }
    return res.status(400).json({
      success: false, error, identifiedEcosystem: identified,
      ecosystemConfidence: ecosystemCheck.ecosystemConfidence, classProbabilities: ecosystemCheck.classProbabilities,
    });
  }

  const project = new Project({
    plotId,
    walletAddress: req.walletAddress,
    name,
    phone,
    address,
    identityId: mockIdentityId(req.walletAddress, name, phone),
    rtcNumber: req.body.rtcNumber,
    coordinates,
    boundary,
    vegetationType,
    area,
    initialIdentifiedEcosystem: ecosystemCheck.identifiedEcosystem,
    initialEcosystemConfidence: ecosystemCheck.ecosystemConfidence,
    initialClassificationDecision: ecosystemCheck.classificationDecision,
    initialClassProbabilities: ecosystemCheck.classProbabilities,
    status: 'Registered',
  });
  const registered = await registerPlotOnChain({ plotId, walletAddress: req.walletAddress, area, vegetationType });
  project.registerTxHash = registered.txHash;
  project.onChain = registered.onChain;
  await project.save();
  res.status(201).json({ success: true, project, registerTxHash: project.registerTxHash });
}));

// Real readiness check (used by the dashboard and `npm run check` before a demo).
app.get('/api/system/status', route(async (req, res) => {
  const [ml, chain] = await Promise.all([mlHealth(), chainHealth()]);
  const modelsLoaded = Boolean(ml && ml.classifierLoaded && ml.anomalyDetectorLoaded && ml.carbonModelLoaded);
  res.status(200).json({
    success: true,
    services: {
      database: dbConnected,
      mlService: modelsLoaded,
      gee: Boolean(ml && ml.earthEngine),
      blockchain: chain.ok,
      pinata: isConfigured(process.env.PINATA_API_KEY) && isConfigured(process.env.PINATA_API_SECRET),
    },
    details: {
      mlService: ml ? (modelsLoaded ? 'reachable, all models loaded' : 'reachable, but a model is missing') : 'not reachable',
      gee: ml ? (ml.earthEngine ? 'signed in' : 'not signed in (check the key file and GEE_PROJECT)') : 'unknown (ML service down)',
      blockchain: chain.message,
      pinata: isConfigured(process.env.PINATA_API_KEY) ? 'configured' : 'not configured (local placeholder hashes)',
    },
  });
}));

app.get('/api/projects/:walletAddress', ensureDbConnected, requireAuth, route(async (req, res) => {
  if (!isWalletAddress(req.params.walletAddress) || req.params.walletAddress.toLowerCase() !== req.walletAddress) {
    throw fail(403, 'You can only view your own projects');
  }
  const projects = await Project.find(walletQuery(req.walletAddress));
  res.status(200).json({ success: true, projects });
}));

app.delete('/api/projects/:id', ensureDbConnected, requireAuth, route(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, 'Project not found');
  const project = await findOwnedProject(req, { _id: req.params.id });
  await project.deleteOne();
  res.status(200).json({ success: true, message: 'Project deleted' });
}));

// ------------------------------------------------------------------ day 0: lock baseline

app.post('/api/mrv/baseline/:plotId', ensureDbConnected, requireAuth, route(async (req, res) => {
  const project = await findOwnedProject(req, { plotId: req.params.plotId });
  if (project.baseline) throw fail(400, 'The baseline for this year is already sealed.');
  if (currentCycles(project).length > 0) throw fail(400, 'This year already has quarterly checks.');

  let windows;
  if (project.year === 1) {
    const mode = req.body?.mode === 'replay' ? 'replay' : 'live';
    windows = yearWindows(mode);
  } else {
    const previous = project.yearResults[project.yearResults.length - 1];
    if (project.mode === 'replay') throw fail(400, 'Replay covers one past year. Later years run live, as time passes.');
    windows = nextYearWindows(previous.baseline.dayZero, 'live');
  }

  // Make sure the plot exists on-chain (it may be missing after a local chain restart).
  await ensurePlotOnChain(project);
  const others = await Project.find({ plotId: { $ne: project.plotId } }, 'coordinates');
  const sealed = await createSealedBaseline({
    project, year: project.year, windows, excludePolygons: others.map((p) => p.coordinates),
  });
  const committed = await commitBaselineOnChain({ plotId: project.plotId, commitment: sealed.commitment, dayZero: sealed.dayZeroUnix });

  project.mode = windows.mode;
  project.baseline = sealed;
  project.baselineTxHash = committed.txHash;
  project.status = 'Baseline locked';
  project.markModified('baseline');
  await project.save();
  res.status(200).json({ success: true, message: 'Baseline built and sealed on-chain', project });
}));

// ---------------------------------------------------------------------- quarterly checks

app.post('/api/mrv/quarterly-run/:plotId', ensureDbConnected, requireAuth, route(async (req, res) => {
  const project = await findOwnedProject(req, { plotId: req.params.plotId });
  if (!project.baseline) throw fail(400, 'Seal the baseline first.');
  const done = currentCycles(project).length;
  if (done >= 4) throw fail(400, 'All 4 quarterly checks for this year are done.');

  const [startDate, endDate] = project.baseline.monitoringWindows[done];
  if (project.mode === 'live' && !windowHasEnded([startDate, endDate])) {
    throw fail(400, `Quarterly check ${done + 1} is not due yet. Its window ends on ${endDate}.`);
  }

  const metrics = await runMrvModels(project, { startDate, endDate, strictRealData: strictRealDataEnabled() });
  const cycle = {
    ...metrics,
    year: project.year,
    cycleNumber: done + 1,
    observedAt: new Date(`${endDate}T23:59:59Z`),
    windowStart: startDate,
    windowEnd: endDate,
  };
  // What goes on-chain: the plot's measured change for the quarter, plus a fingerprint of all evidence.
  const observation = quarterObservation(cycle);
  const dataHash = sha256Hex(JSON.stringify({
    plotId: project.plotId, year: project.year, quarter: done + 1, window: [startDate, endDate],
    carbon: cycle.carbon, carbonPreviousYear: cycle.carbonPreviousYear,
    anomalyStatus: cycle.anomalyStatus, anomalyScore: cycle.anomalyScore, ndvi: cycle.ndvi,
  }));
  const recorded = await recordObservationOnChain({ plotId: project.plotId, quarter: done + 1, observation, dataHash });

  project.monitoringCycles.push({ ...cycle, observation, observationDataHash: dataHash, observationTxHash: recorded.txHash });
  project.status = done + 1 < 4 ? 'Monitoring' : 'Ready to finish year';
  await project.save();
  res.status(200).json({ success: true, message: 'Quarterly check recorded', cycle: project.monitoringCycles.at(-1), project });
}));

// ------------------------------------------------------------- month 12: reveal and credit

app.post('/api/mrv/annual-finalize/:plotId', ensureDbConnected, requireAuth, route(async (req, res) => {
  const project = await findOwnedProject(req, { plotId: req.params.plotId });
  const cycles = currentCycles(project);
  if (!project.baseline) throw fail(400, 'No baseline is sealed for this year yet.');
  if (cycles.length < 4) throw fail(400, 'Finishing the year needs all 4 quarterly checks.');

  const audit = JSON.parse(project.baseline.auditJson);
  // What the donors really did this year: the baseline can only go up from the forecast.
  const actual = await actualDonorChange({ donors: audit.donors, windows: project.baseline.monitoringWindows });
  const actualChanges = actual.quarters.map((q) => (q.status === 'ok' ? q.change : null));

  const observations = cycles.map((cycle) => cycle.observation);
  const mirror = computeYearCredits({
    observations, baseline: audit.forecast, actualDonorChange: actualChanges, areaHa: project.area, state: project.chainState,
  });

  const reveal = {
    baselineChange: project.baseline.changesWad,
    baselineHalfWidth: project.baseline.halfWidthsWad,
    auditHash: project.baseline.auditHash,
    salt: project.baseline.salt,
    actualDonorChange: actualChanges.map((value) => toWad(value === null ? -1e6 : value)), // unknown -> forecast is used
  };
  const report = {
    plotId: project.plotId,
    year: project.year,
    area: project.area,
    coordinates: project.coordinates,
    baselineAudit: audit,
    baselineReveal: { commitment: project.baseline.commitment, auditHash: project.baseline.auditHash, salt: project.baseline.salt },
    actualDonorChange: actual.quarters,
    quarterlyChecks: cycles,
    creditCalculation: mirror,
    methodology: 'docs/carbon-calculation.md, docs/baseline-and-verification.md',
    finalizedAt: new Date().toISOString(),
  };
  const reportIpfsHash = await uploadMrvReportToIpfs(report);
  const chain = await finalizeYearOnChain({ plotId: project.plotId, reveal, reportIpfsHash, simulated: mirror });
  if (Math.abs(chain.credits - mirror.credits) > 1e-6) {
    console.warn(`Credit mismatch for ${project.plotId}: contract ${chain.credits}, mirror ${mirror.credits}`);
  }

  const result = {
    year: project.year,
    outcome: chain.outcome,
    credits: chain.credits,
    tokenId: chain.tokenId,
    txHash: chain.txHash,
    onChain: chain.onChain,
    reportIpfsHash,
    calculation: mirror,
    forecastVsActual: audit.forecast.map((f, i) => ({ forecast: f.change, actual: actualChanges[i] })),
    baseline: { ...project.baseline, revealed: true },
    finalizedAt: new Date().toISOString(),
  };
  project.yearResults.push(result);
  project.carbonCredits = Number((project.carbonCredits + chain.credits).toFixed(6));
  project.chainState = { ...mirror.newState, issued: project.chainState.issued + chain.credits };
  project.baseline = null;
  project.year += 1;
  project.status = {
    Minted: 'Credit received',
    NoProvableGain: 'Year done - no provable gain',
    AnomalyDetected: 'Year done - damage detected',
    InsufficientData: 'Year done - not enough data',
  }[chain.outcome];
  project.markModified('chainState');
  await project.save();
  res.status(200).json({ success: true, message: `Year ${result.year} finalized: ${chain.outcome}`, result, project });
}));

// ------------------------------------------------------- public verification (no login)

const publicView = (project) => ({
  plotId: project.plotId,
  vegetationType: project.vegetationType,
  area: project.area,
  coordinates: project.coordinates,
  status: project.status,
  registeredAt: project.createdAt,
  registerTxHash: project.registerTxHash,
  initialIdentifiedEcosystem: project.initialIdentifiedEcosystem,
  initialEcosystemConfidence: project.initialEcosystemConfidence,
  year: project.year,
  mode: project.mode,
  carbonCredits: project.carbonCredits,
  // A sealed baseline shows only its commitment; everything else is revealed at month 12.
  currentBaseline: project.baseline ? {
    commitment: project.baseline.commitment,
    dayZero: project.baseline.dayZero,
    txHash: project.baselineTxHash,
    monitoringWindows: project.baseline.monitoringWindows,
    summary: project.baseline.summary,
  } : null,
  quarterlyChecks: project.monitoringCycles.map((c) => ({
    year: c.year, quarter: c.cycleNumber, window: [c.windowStart, c.windowEnd], ndvi: c.ndvi,
    anomalyStatus: c.anomalyStatus, carbon: c.carbon, carbonPreviousYear: c.carbonPreviousYear,
    observation: c.observation, dataHash: c.observationDataHash, txHash: c.observationTxHash,
  })),
  years: project.yearResults,
});

app.get('/api/public/plots', ensureDbConnected, route(async (req, res) => {
  const projects = await Project.find({}, 'plotId vegetationType area status carbonCredits coordinates year createdAt');
  res.status(200).json({
    success: true,
    plots: projects.map((p) => ({
      plotId: p.plotId, vegetationType: p.vegetationType, area: p.area, status: p.status,
      carbonCredits: p.carbonCredits, year: p.year, registeredAt: p.createdAt,
      centre: p.coordinates.length ? [
        p.coordinates.reduce((s, c) => s + c[0], 0) / p.coordinates.length,
        p.coordinates.reduce((s, c) => s + c[1], 0) / p.coordinates.length,
      ] : null,
    })),
  });
}));

app.get('/api/public/plots/:plotId', ensureDbConnected, route(async (req, res) => {
  const project = await Project.findOne({ plotId: req.params.plotId });
  if (!project) throw fail(404, 'Plot not found');
  const chain = {};
  for (let year = 1; year <= project.year; year += 1) {
    // eslint-disable-next-line no-await-in-loop
    chain[year] = await readYearOnChain(project.plotId, year).catch(() => null);
  }
  res.status(200).json({ success: true, plot: publicView(project), chain });
}));

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
