const safeRandom = (min, max) => Number((Math.random() * (max - min) + min).toFixed(4));

const fallbackMrvModels = (project) => {
  const ndvi = safeRandom(0.35, 0.86);
  const ecosystemMatchesClaim = Math.random() >= 0.08;
  const identifiedEcosystem = ecosystemMatchesClaim ? project.vegetationType : 'other';
  const ecosystemConfidence = ecosystemMatchesClaim ? 0.55 : 0.5;
  const anomalyDetected = Math.random() < 0.1;
  // No carbon estimate without the ML service, so a simulated plot can never earn credits.
  const carbon = { status: 'unavailable' };

  return {
    ndvi,
    ecosystemMatchesClaim,
    identifiedEcosystem,
    ecosystemConfidence,
    classificationDecision: ecosystemMatchesClaim ? 'accept' : 'reject',
    classProbabilities: {},
    anomalyDetected,
    anomalyStatus: anomalyDetected ? 'anomaly' : 'normal',
    estimatedCo2Tonnes: 0,
    carbon,
    carbonPreviousYear: carbon,
    source: 'fallback-simulation',
  };
};

const runMrvModels = async (project, options = {}) => {
  const strictRealData = options.strictRealData ?? (String(process.env.STRICT_REAL_DATA || 'false') === 'true');
  const mlServiceUrl = process.env.ML_SERVICE_URL;
  if (!mlServiceUrl) {
    if (strictRealData) {
      throw new Error('ML service URL is missing while STRICT_REAL_DATA=true');
    }
    return fallbackMrvModels(project);
  }

  try {
    const normalizedBase = mlServiceUrl.replace(/\/$/, '');
    const candidateBases = [normalizedBase];
    if (normalizedBase.includes('localhost')) {
      candidateBases.push(normalizedBase.replace('localhost', '127.0.0.1'));
    } else if (normalizedBase.includes('127.0.0.1')) {
      candidateBases.push(normalizedBase.replace('127.0.0.1', 'localhost'));
    }

    let lastError = null;
    for (const baseUrl of candidateBases) {
      try {
        const response = await fetch(`${baseUrl}/mrv/infer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plotId: project.plotId,
            coordinates: project.coordinates,
            vegetationType: project.vegetationType,
            area: project.area,
            previousCycles: project.monitoringCycles || [],
            startDate: options.startDate || null,
            endDate: options.endDate || null,
            strictRealData,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`ML service responded with ${response.status}: ${body}`);
        }

        const data = await response.json();
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
          estimatedCo2Tonnes: Number(data.estimatedCo2Tonnes),
          carbon: data.carbon || null,
          carbonPreviousYear: data.carbonPreviousYear || null,
          source: data.source || 'ml-service',
          windowStart: data.windowStart || options.startDate || '',
          windowEnd: data.windowEnd || options.endDate || '',
          geeImageCount: Number(data.geeImageCount || 0),
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unknown ML service error');
  } catch (error) {
    if (strictRealData) {
      throw new Error(`Strict real-data mode: ML service unreachable at ${mlServiceUrl}. ${error.message}`);
    }
    console.warn('ML service unavailable, using fallback simulation:', error.message);
    return fallbackMrvModels(project);
  }
};

module.exports = {
  runMrvModels,
};
