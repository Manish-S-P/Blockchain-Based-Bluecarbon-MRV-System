console.log("🔥 MY SERVER FILE IS RUNNING");
require('dotenv').config({ path: `${__dirname}/.env` });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Project = require('./models/Project');
const { runMrvModels } = require('./services/mlService');
const { uploadMrvReportToIpfs } = require('./services/ipfsService');
const { registerPlotOnChain, mintCreditOnChain } = require('./services/blockchainService');
const { DEFAULT_TIME_YEARS, CONTRACT_TOLERANCE, calculateExpectedCredits, ECOSYSTEM_SAFETY_BASELINES } = require('./services/credits');

const app = express();
let dbConnected = false;

app.use(cors());
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

const safeRandom = (min, max) => Number((Math.random() * (max - min) + min).toFixed(4));

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

console.log("Before route");

app.post('/api/projects', ensureDbConnected, async (req, res) => {
  console.log("🔥 POST ROUTE HIT");
  try {
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

    const candidateProject = {
      plotId: createPlotId(),
      walletAddress: req.body.walletAddress,
      coordinates: mappedCoordinates,
      vegetationType: req.body.vegetationType,
      area: resolvedArea,
      monitoringCycles: [],
    };
    const ecosystemCheck = await runMrvModels(candidateProject, {
      strictRealData: false,
    });
    const allowedEcosystems = new Set(['mangrove', 'seagrass', 'saltmarsh']);
    if (!allowedEcosystems.has(ecosystemCheck.identifiedEcosystem)) {
      return res.status(400).json({
        success: false,
        error: `Registration failed because this plot was identified as "${ecosystemCheck.identifiedEcosystem}". We currently only support mangrove, seagrass, or saltmarsh ecosystems.`,
        identifiedEcosystem: ecosystemCheck.identifiedEcosystem,
        ecosystemConfidence: ecosystemCheck.ecosystemConfidence,
      });
    }
    if (!ecosystemCheck.ecosystemMatchesClaim) {
      return res.status(400).json({
        success: false,
        error: `The identified ecosystem ("${ecosystemCheck.identifiedEcosystem}") does not match your selection ("${candidateProject.vegetationType}"). Please verify your plot boundaries or ecosystem type.`,
        identifiedEcosystem: ecosystemCheck.identifiedEcosystem,
        ecosystemConfidence: ecosystemCheck.ecosystemConfidence,
      });
    }

    const project = new Project({
      ...req.body,
      coordinates: mappedCoordinates,
      area: candidateProject.area,
      plotId: candidateProject.plotId,
      initialIdentifiedEcosystem: ecosystemCheck.identifiedEcosystem,
      initialEcosystemConfidence: ecosystemCheck.ecosystemConfidence,
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

console.log("After route");

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

app.get('/api/projects/:walletAddress', ensureDbConnected, async (req, res) => {
  try {
    const projects = await Project.find({ walletAddress: req.params.walletAddress });
    res.status(200).json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/projects/:id', ensureDbConnected, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/mrv/quarterly-run/:plotId', ensureDbConnected, async (req, res) => {
  try {
    const project = await Project.findOne({ plotId: req.params.plotId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found for plotId' });
    }

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

app.post('/api/mrv/backfill/:plotId', ensureDbConnected, async (req, res) => {
  try {
    const project = await Project.findOne({ plotId: req.params.plotId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found for plotId' });
    }

    if (project.monitoringCycles.length > 0) {
      return res.status(400).json({ success: false, error: 'Backfill only allowed before first cycle is added' });
    }

    const windows = getLastCompletedQuarterWindows(4);
    const createdCycles = [];

    for (const window of windows) {
      const cycleMetrics = await runMrvModels(project, {
        startDate: window.startDate,
        endDate: window.endDate,
        strictRealData: false,
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

app.post('/api/mrv/annual-finalize/:plotId', ensureDbConnected, async (req, res) => {
  try {
    const project = await Project.findOne({ plotId: req.params.plotId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found for plotId' });
    }

    if (project.monitoringCycles.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Annual MRV requires 4 quarterly cycles',
      });
    }

    const ndviValues = project.monitoringCycles.map(cycle => cycle.ndvi);
    const averageNdvi = Number((ndviValues.reduce((sum, current) => sum + current, 0) / ndviValues.length).toFixed(4));
    
    const cycleEstimates = project.monitoringCycles.map(c => c.estimatedCo2Tonnes || 0);
    let expectedCredits = Number((cycleEstimates.reduce((sum, val) => sum + val, 0) / cycleEstimates.length).toFixed(4));

    const NDVI_THRESHOLD = 0.45;
    const baselineRate = ECOSYSTEM_SAFETY_BASELINES[project.vegetationType?.toLowerCase()] || 5;
    
    if (averageNdvi >= NDVI_THRESHOLD && expectedCredits < (project.area * baselineRate)) {
      const baseline = project.area * baselineRate;
      console.log(`[MRV] Safety Net Triggered for Plot ${project.plotId} (${project.vegetationType}). Avg NDVI: ${averageNdvi}, Credits: ${expectedCredits} -> ${baseline}`);
      expectedCredits = baseline;
    }
    
    const submittedCredits = Number((expectedCredits * (1 + safeRandom(-0.01, 0.01))).toFixed(4));

    const deviation = Math.abs(submittedCredits - expectedCredits) / expectedCredits;
    if (deviation > CONTRACT_TOLERANCE) {
      return res.status(400).json({
        success: false,
        error: 'Submitted credits outside 5% contract tolerance',
        expectedCredits,
        submittedCredits,
      });
    }

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
      network: req.body?.chain || 'local',
      area: project.area,
      vegetationType: project.vegetationType,
    });

    project.averageNdvi = averageNdvi;
    project.reportIpfsHash = ipfsHash;
    project.contractVerified = true;
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


