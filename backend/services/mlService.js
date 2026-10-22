// Client for the ML service (ml-service/). There is deliberately no simulated fallback:
// if the satellite analysis is unavailable, the request fails with a clear message instead
// of producing made-up results.

const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 5 * 60 * 1000);

const mlBase = () => {
  const base = (process.env.ML_SERVICE_URL || '').replace(/\/$/, '');
  if (!base) {
    throw Object.assign(new Error('The satellite analysis service is not configured (ML_SERVICE_URL in backend/.env).'), { status: 503 });
  }
  return base;
};

const postToMl = async (route, body) => {
  const url = `${mlBase()}${route}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ML_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error.name === 'TimeoutError' ? 'it did not answer in time' : 'it is not reachable';
    throw Object.assign(new Error(`The satellite analysis service failed: ${reason} (${url}). Is the ML service running?`), { status: 503 });
  }
  if (!response.ok) {
    let detail = await response.text();
    try {
      detail = JSON.parse(detail).detail || detail;
    } catch {
      // keep the raw text
    }
    throw Object.assign(new Error(`The satellite analysis service returned an error: ${detail}`), { status: 502 });
  }
  return response.json();
};

/** Ecosystem check, anomaly check and carbon estimate for one plot and time window. */
const runMrvModels = async (project, options = {}) => {
  const strictRealData = options.strictRealData ?? (String(process.env.STRICT_REAL_DATA || 'false') === 'true');
  const data = await postToMl('/mrv/infer', {
    plotId: project.plotId,
    coordinates: project.coordinates,
    vegetationType: project.vegetationType,
    area: project.area,
    previousCycles: (project.monitoringCycles || []).map((c) => ({ cycleNumber: c.cycleNumber, ndvi: c.ndvi })),
    startDate: options.startDate || null,
    endDate: options.endDate || null,
    strictRealData,
  });
  return {
    ndvi: data.ndvi === null || data.ndvi === undefined ? null : Number(data.ndvi),
    ecosystemMatchesClaim: Boolean(data.ecosystemMatchesClaim),
    identifiedEcosystem: data.identifiedEcosystem || 'unknown',
    ecosystemConfidence: Number(data.ecosystemConfidence || 0),
    classificationDecision: data.classificationDecision || 'reject',
    classProbabilities: data.classProbabilities || {},
    anomalyDetected: Boolean(data.anomalyDetected),
    anomalyStatus: data.anomalyStatus || 'insufficient_data',
    anomalyScore: data.anomalyScore ?? null,
    estimatedCo2Tonnes: Number(data.estimatedCo2Tonnes || 0),
    carbon: data.carbon || null,
    carbonPreviousYear: data.carbonPreviousYear || null,
    source: data.source || 'ml-service',
    windowStart: data.windowStart || options.startDate || '',
    windowEnd: data.windowEnd || options.endDate || '',
    geeImageCount: Number(data.geeImageCount || 0),
  };
};

const buildBaseline = ({ coordinates, preWindows, excludePolygons }) => postToMl('/mrv/baseline', {
  coordinates, preWindows, excludePolygons,
});

const actualDonorChange = ({ donors, windows }) => postToMl('/mrv/baseline/actual', { donors, windows });

/** Quick reachability check for the status panel. */
const mlHealth = async () => {
  try {
    const response = await fetch(`${mlBase()}/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

module.exports = {
  runMrvModels,
  buildBaseline,
  actualDonorChange,
  mlHealth,
};
