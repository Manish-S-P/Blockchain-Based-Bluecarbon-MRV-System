require('dotenv').config({ path: `${__dirname}/.env` });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Project = require('./models/Project');
const { runMrvModels } = require('./services/mlService');
const { uploadMrvReportToIpfs } = require('./services/ipfsService');
const { registerPlotOnChain, mintCreditOnChain } = require('./services/blockchainService');
const { ECOSYSTEM_CARBON_DENSITY, calculateExpectedCredits } = require('./services/credits');
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

const createPlotId = () => `PLOT-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const isConfigured = (value) => Boolean(value && String(value).trim().length > 0);

const pad2 = (value) => String(value).padStart(2, '0');
const fmtDate = (date) => `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
const strictRealDataEnabled = () => String(process.env.STRICT_REAL_DATA || 'false') === 'true';
const demoHistoricalModeEnabled = () => String(process.env.MRV_DEMO_HISTORICAL_MODE || 'true') === 'true';

const toUtcMidnight = (value) => new Date(Date.UTC(
  value.getUTCFullYear(),
  value.getUTCMonth(),
  value.getUTCDate(),
));

const addUtcMonths = (value, months) => new Date(Date.UTC(
  value.getUTCFullYear(),
  value.getUTCMonth() + months,
  value.getUTCDate(),
));

const toRadians = (value) => (value * Math.PI) / 180;
const computePolygonAreaHectares = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 3) {
    return 0;
  }

  const earthRadiusMeters = 6378137;
  const meanLatRad = toRadians(
    coordinates.reduce((sum, point) => sum + Number(point[0] || 0), 0) / coordinates.length,
  );
  const projected = coordinates.map((point) => {
    const lat = Number(point[0] || 0);
    const lon = Number(point[1] || 0);
    return [
      earthRadiusMeters * toRadians(lon) * Math.cos(meanLatRad),
      earthRadiusMeters * toRadians(lat),
    ];
  });

  let twiceArea = 0;
  for (let i = 0; i < projected.length; i += 1) {
    const [x1, y1] = projected[i];
    const [x2, y2] = projected[(i + 1) % projected.length];
    twiceArea += (x1 * y2) - (x2 * y1);
  }
  const sqMeters = Math.abs(twiceArea) / 2;
  return Number((sqMeters / 10000).toFixed(4));
};

const buildQuarterWindowForCycle = (projectCreatedAt, cycleIndex, demoHistoricalMode) => {
  const today = toUtcMidnight(new Date());

  if (demoHistoricalMode) {
    const end = addUtcMonths(today, -(cycleIndex * 3));
    end.setUTCDate(end.getUTCDate() - 1);
    const start = addUtcMonths(end, -3);
    start.setUTCDate(start.getUTCDate() + 1);
    return {
      startDate: fmtDate(start),
      endDate: fmtDate(end),
      mode: 'demo-historical',
    };
  }

  const registrationDate = toUtcMidnight(new Date(projectCreatedAt));
  const start = addUtcMonths(registrationDate, cycleIndex * 3);
  const end = addUtcMonths(registrationDate, (cycleIndex + 1) * 3);
  end.setUTCDate(end.getUTCDate() - 1);
  return {
    startDate: fmtDate(start),
    endDate: fmtDate(end),
    mode: 'registration-anchored',
  };
};

const getLastCompletedQuarterWindows = (count = 4) => {
  const now = new Date();
  const currentQuarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
  const currentQuarterStart = new Date(Date.UTC(now.getUTCFullYear(), currentQuarterStartMonth, 1));
  const windows = [];

  let quarterEnd = new Date(currentQuarterStart);
  quarterEnd.setUTCDate(quarterEnd.getUTCDate() - 1);

  for (let index = 0; index < count; index += 1) {
    const quarterStart = new Date(Date.UTC(quarterEnd.getUTCFullYear(), Math.floor(quarterEnd.getUTCMonth() / 3) * 3, 1));
    windows.unshift({
      label: `Q${Math.floor(quarterStart.getUTCMonth() / 3) + 1}-${quarterStart.getUTCFullYear()}`,
      startDate: fmtDate(quarterStart),
      endDate: fmtDate(quarterEnd),
    });
    quarterEnd = new Date(quarterStart);
    quarterEnd.setUTCDate(quarterEnd.getUTCDate() - 1);
  }

  return windows;
};

const SUPPORTED_ECOSYSTEMS = new Set(Object.keys(ECOSYSTEM_CARBON_DENSITY));
const SUPPORTED_CHAINS = new Set(['local', 'amoy']);
const MIN_CYCLES_WITH_DATA = 2;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const walletQuery = (address) => ({ walletAddress: new RegExp(`^${escapeRegex(address)}$`, 'i') });

// Loads a project by plotId and confirms it belongs to the authenticated wallet.
const findOwnedProject = async (req, res, filter) => {
  const project = await Project.findOne(filter);
  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return null;
  }
  if (project.walletAddress.toLowerCase() !== req.walletAddress) {
    res.status(403).json({ success: false, error: 'This project belongs to a different wallet' });
    return null;
  }
  return project;
};

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

app.post('/api/projects', ensureDbConnected, requireAuth, async (req, res) => {
  try {
    const vegetationType = String(req.body.vegetationType || '').toLowerCase();
    if (!SUPPORTED_ECOSYSTEMS.has(vegetationType)) {
      return res.status(400).json({ success: false, error: 'vegetationType must be mangrove, seagrass, or saltmarsh' });
    }

    const mappedCoordinates = Array.isArray(req.body.coordinates) ? req.body.coordinates : [];
    const isMapLandMethod = req.body.landMethod === 'map';
    const computedMapArea = isMapLandMethod ? computePolygonAreaHectares(mappedCoordinates) : 0;
    if (isMapLandMethod && computedMapArea <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Unable to compute area from map polygon. Plot at least 3 valid points.',
      });
    }
    const resolvedArea = isMapLandMethod
      ? computedMapArea
      : Number(req.body.area || 0);
    if (!Number.isFinite(resolvedArea) || resolvedArea <= 0) {
      return res.status(400).json({ success: false, error: 'Plot area must be a positive number of hectares' });
    }

    const candidateProject = {
      plotId: createPlotId(),
      walletAddress: req.walletAddress,
      coordinates: mappedCoordinates,
      vegetationType,
      area: resolvedArea,
      monitoringCycles: [],
    };
    const ecosystemCheck = await runMrvModels(candidateProject, {
      strictRealData: strictRealDataEnabled(),
    });
    // The classifier decides what the plot is before looking at the claim; see ml-service/app/classifier.py.
    if (ecosystemCheck.classificationDecision !== 'accept') {
      const identified = ecosystemCheck.identifiedEcosystem;
      const confidencePct = Math.round((ecosystemCheck.ecosystemConfidence || 0) * 100);
      let error;
      if (identified === 'unknown') {
        error = 'Satellite data for this plot could not be retrieved, so its ecosystem could not be verified. Please try again later.';
      } else if (identified === vegetationType) {
        error = `The satellite data suggests "${identified}", but only with ${confidencePct}% confidence. Please redraw the plot boundary more tightly around the ${vegetationType} area and try again.`;
      } else if (SUPPORTED_ECOSYSTEMS.has(identified)) {
        error = `The satellite data shows this plot is "${identified}" (${confidencePct}% confidence), not "${vegetationType}". Please check your plot boundary or ecosystem type.`;
      } else {
        error = `The satellite data shows this plot is not a supported blue-carbon ecosystem (identified as "${identified}"). We support mangrove, seagrass and saltmarsh.`;
      }
      return res.status(400).json({
        success: false,
        error,
        identifiedEcosystem: identified,
        ecosystemConfidence: ecosystemCheck.ecosystemConfidence,
        classProbabilities: ecosystemCheck.classProbabilities,
      });
    }
    const project = new Project({
      plotId: candidateProject.plotId,
      walletAddress: candidateProject.walletAddress,
      name: req.body.name,
      phone: req.body.phone,
      address: req.body.address,
      aadhar: req.body.aadhar,
      landMethod: req.body.landMethod,
      rtcNumber: req.body.rtcNumber,
      coordinates: mappedCoordinates,
      vegetationType,
      area: candidateProject.area,
      initialIdentifiedEcosystem: ecosystemCheck.identifiedEcosystem,
      initialEcosystemConfidence: ecosystemCheck.ecosystemConfidence,
      initialClassificationDecision: ecosystemCheck.classificationDecision,
      initialClassProbabilities: ecosystemCheck.classProbabilities,
      status: 'Registered',
    });
    const registerResult = await registerPlotOnChain({
      plotId: project.plotId,
      walletAddress: project.walletAddress,
      area: project.area,
      vegetationType: project.vegetationType,
    });
    project.registerTxHash = registerResult.txHash || '';
    await project.save();
    res.status(201).json({ success: true, project, registerTxHash: project.registerTxHash });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/system/status', (req, res) => {
  res.status(200).json({
    success: true,
    services: {
      database: dbConnected,
      mlService: isConfigured(process.env.ML_SERVICE_URL),
      pinata: isConfigured(process.env.PINATA_API_KEY) && isConfigured(process.env.PINATA_API_SECRET),
      blockchain: (
        isConfigured(process.env.BLOCKCHAIN_RPC_URL)
        && isConfigured(process.env.BLOCKCHAIN_PRIVATE_KEY)
        && isConfigured(process.env.CARBON_CONTRACT_ADDRESS)
        && (isConfigured(process.env.CARBON_CONTRACT_ABI) || isConfigured(process.env.CARBON_CONTRACT_ABI_PATH))
      ),
      gee: isConfigured(process.env.GEE_PROJECT),
    },
  });
});

app.get('/api/projects/:walletAddress', ensureDbConnected, requireAuth, async (req, res) => {
  try {
    if (!isWalletAddress(req.params.walletAddress) || req.params.walletAddress.toLowerCase() !== req.walletAddress) {
      return res.status(403).json({ success: false, error: 'You can only view your own projects' });
    }
    const projects = await Project.find(walletQuery(req.walletAddress));
    res.status(200).json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/projects/:id', ensureDbConnected, requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    const project = await findOwnedProject(req, res, { _id: req.params.id });
    if (!project) return;
    await project.deleteOne();
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/mrv/quarterly-run/:plotId', ensureDbConnected, requireAuth, async (req, res) => {
  try {
    const project = await findOwnedProject(req, res, { plotId: req.params.plotId });
    if (!project) return;

    if (project.monitoringCycles.length >= 4) {
      return res.status(400).json({ success: false, error: '4 monitoring cycles already completed' });
    }

    const requestedStartDate = req.body?.startDate || null;
    const requestedEndDate = req.body?.endDate || null;
    const cycleIndex = project.monitoringCycles.length;
    const autoWindow = (!requestedStartDate && !requestedEndDate)
      ? buildQuarterWindowForCycle(project.createdAt, cycleIndex, demoHistoricalModeEnabled())
      : null;

    if (autoWindow && autoWindow.mode === 'registration-anchored') {
      const now = new Date();
      const dueDate = new Date(`${autoWindow.endDate}T23:59:59Z`);
      if (dueDate > now) {
        return res.status(400).json({
          success: false,
          error: `Cycle ${cycleIndex + 1} is not due yet. Expected window end date: ${autoWindow.endDate}`,
        });
      }
    }

    const cycleMetrics = await runMrvModels(project, {
      startDate: requestedStartDate || autoWindow?.startDate || null,
      endDate: requestedEndDate || autoWindow?.endDate || null,
      strictRealData: strictRealDataEnabled(),
    });
    project.monitoringCycles.push({
      cycleNumber: project.monitoringCycles.length + 1,
      observedAt: (requestedEndDate || autoWindow?.endDate)
        ? new Date(`${requestedEndDate || autoWindow.endDate}T23:59:59Z`)
        : new Date(),
      ...cycleMetrics,
    });

    project.status = project.monitoringCycles.length < 4 ? 'Monitoring In Progress' : 'Ready For Annual MRV';
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Quarterly MRV cycle completed',
      cycle: project.monitoringCycles[project.monitoringCycles.length - 1],
      totalCycles: project.monitoringCycles.length,
      windowSelection: autoWindow?.mode || 'manual-request',
      project,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/mrv/backfill/:plotId', ensureDbConnected, requireAuth, async (req, res) => {
  try {
    const project = await findOwnedProject(req, res, { plotId: req.params.plotId });
    if (!project) return;

    if (project.monitoringCycles.length > 0) {
      return res.status(400).json({ success: false, error: 'Backfill only allowed before first cycle is added' });
    }

    const windows = getLastCompletedQuarterWindows(4);
    const createdCycles = [];

    for (const window of windows) {
      const cycleMetrics = await runMrvModels(project, {
        startDate: window.startDate,
        endDate: window.endDate,
        strictRealData: strictRealDataEnabled(),
      });
      const cycle = {
        cycleNumber: project.monitoringCycles.length + 1,
        observedAt: new Date(`${window.endDate}T23:59:59Z`),
        ...cycleMetrics,
      };
      project.monitoringCycles.push(cycle);
      createdCycles.push({ ...cycle, label: window.label });
    }

    project.status = 'Ready For Annual MRV';
    await project.save();
    res.status(200).json({
      success: true,
      message: 'Historical quarterly backfill completed',
      windows,
      cycles: createdCycles,
      project,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/mrv/annual-finalize/:plotId', ensureDbConnected, requireAuth, async (req, res) => {
  try {
    const project = await findOwnedProject(req, res, { plotId: req.params.plotId });
    if (!project) return;

    if (project.monitoringCycles.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Annual MRV requires 4 quarterly cycles',
      });
    }

    const network = req.body?.chain || 'local';
    if (!SUPPORTED_CHAINS.has(network)) {
      return res.status(400).json({ success: false, error: 'chain must be "local" or "amoy"' });
    }
    if (project.creditTokenId) {
      return res.status(400).json({ success: false, error: 'Credits have already been minted for this plot' });
    }

    const ndviValues = project.monitoringCycles.map((cycle) => cycle.ndvi).filter((ndvi) => typeof ndvi === 'number');
    const averageNdvi = ndviValues.length > 0
      ? Number((ndviValues.reduce((sum, current) => sum + current, 0) / ndviValues.length).toFixed(4))
      : null;

    // Plot health is judged by the anomaly detector (year-on-year change per ecosystem), not by
    // a fixed NDVI threshold, which would always fail underwater seagrass.
    const cyclesWithData = project.monitoringCycles.filter((cycle) => cycle.anomalyStatus !== 'insufficient_data');
    if (cyclesWithData.length < MIN_CYCLES_WITH_DATA) {
      return res.status(400).json({
        success: false,
        error: `Only ${cyclesWithData.length} of 4 quarters had enough clear satellite data to check the plot. At least ${MIN_CYCLES_WITH_DATA} are needed to mint credits.`,
      });
    }

    const anomalousCycles = project.monitoringCycles.filter((cycle) => cycle.anomalyDetected);
    if (anomalousCycles.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Anomalies were detected in cycle(s) ${anomalousCycles.map((cycle) => cycle.cycleNumber).join(', ')}. Credits cannot be minted until the plot is reviewed.`,
      });
    }

    const mismatchedCycles = project.monitoringCycles.filter((cycle) => !cycle.ecosystemMatchesClaim);
    if (mismatchedCycles.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Satellite classification did not match the claimed ecosystem in cycle(s) ${mismatchedCycles.map((cycle) => cycle.cycleNumber).join(', ')}. Credits cannot be minted.`,
      });
    }

    // Credits follow the smart contract's density-based policy formula exactly, so the
    // on-chain tolerance check passes deterministically.
    const expectedCredits = calculateExpectedCredits(project);
    const submittedCredits = expectedCredits;

    const reportPayload = {
      plotId: project.plotId,
      walletAddress: project.walletAddress,
      coordinates: project.coordinates,
      vegetationType: project.vegetationType,
      area: project.area,
      monitoringCycles: project.monitoringCycles,
      averageNdvi,
      expectedCredits,
      submittedCredits,
      finalizedAt: new Date().toISOString(),
    };

    const ipfsHash = await uploadMrvReportToIpfs(reportPayload);
    const mintResult = await mintCreditOnChain({
      plotId: project.plotId,
      walletAddress: project.walletAddress,
      submittedCredits,
      reportIpfsHash: ipfsHash,
      network,
      area: project.area,
      vegetationType: project.vegetationType,
    });

    project.averageNdvi = averageNdvi;
    project.reportIpfsHash = ipfsHash;
    project.contractVerified = mintResult.onChain;
    project.creditTokenId = mintResult.tokenId;
    project.mintTxHash = mintResult.txHash || '';
    project.carbonCredits = submittedCredits;
    project.status = 'Credit Minted';
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Annual MRV finalized and NFT credit minted',
      plotId: project.plotId,
      tokenId: project.creditTokenId,
      ipfsHash: project.reportIpfsHash,
      txHash: mintResult.txHash,
      expectedCredits,
      submittedCredits,
      averageNdvi,
      project,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


