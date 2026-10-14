// Builds a plot's day-0 baseline and seals it (commit-reveal). See docs/baseline-and-verification.md.
//
// 1. The ML service builds a synthetic control: weighted unenrolled mangrove "donors" that match
//    the plot's tree carbon over the 4 quarters before day 0, and forecasts their change.
// 2. The full baseline (donors, weights, fit, forecast) is written to an audit file; its
//    SHA-256 fingerprint is the auditHash.
// 3. commitment = keccak256(plotId, year, dayZero, forecast changes, half-widths, auditHash, salt)
//    with a secret random salt. Only the commitment goes on-chain; everything is revealed at
//    month 12, and the contract re-checks it.

const crypto = require('crypto');
const { buildBaseline } = require('./mlService');
const { computeCommitment, toWad } = require('./blockchainService');

const sha256Hex = (text) => `0x${crypto.createHash('sha256').update(text, 'utf8').digest('hex')}`;

/**
 * Forecast for each of the 4 monitoring quarters. Monitoring quarter k is the same season as
 * pre-period window k. If the plot had no clear data in a pre-period window, that quarter uses
 * the largest forecast change and the widest range of the other quarters (the cautious choice).
 */
const forecastPerQuarter = (baseline) => {
  const byWindow = new Map(baseline.forecast.map((f) => [f.window, f]));
  const cautious = {
    change: Math.max(...baseline.forecast.map((f) => f.change)),
    halfWidth: Math.max(...baseline.forecast.map((f) => f.halfWidth)),
    filled: true,
  };
  return [0, 1, 2, 3].map((k) => {
    const f = byWindow.get(k);
    return f ? { change: f.change, halfWidth: f.halfWidth, filled: false } : { ...cautious };
  });
};

const createSealedBaseline = async ({ project, year, windows, excludePolygons }) => {
  const result = await buildBaseline({
    coordinates: project.coordinates,
    preWindows: windows.preWindows,
    excludePolygons,
  });
  if (result.status !== 'ok') {
    const error = new Error(result.reason || 'Baseline could not be built');
    error.status = 422;
    throw error;
  }

  const forecast = forecastPerQuarter(result);
  const audit = {
    plotId: project.plotId,
    year,
    mode: windows.mode,
    dayZero: windows.dayZero,
    preWindows: windows.preWindows,
    monitoringWindows: windows.monitoringWindows,
    method: result.method,
    candidates: result.candidates,
    donors: result.donors,
    plotLevels: result.plotLevels,
    syntheticLevels: result.syntheticLevels,
    plotChanges: result.plotChanges,
    syntheticChanges: result.syntheticChanges,
    fitRmse: result.fitRmse,
    forecast,
  };
  const auditJson = JSON.stringify(audit);
  const auditHash = sha256Hex(auditJson);
  const salt = `0x${crypto.randomBytes(32).toString('hex')}`;
  const dayZeroUnix = Math.floor(new Date(`${windows.dayZero}T00:00:00Z`).getTime() / 1000);
  const changesWad = forecast.map((f) => toWad(f.change));
  const halfWidthsWad = forecast.map((f) => toWad(f.halfWidth));
  const commitment = computeCommitment({
    plotId: project.plotId, year, dayZero: dayZeroUnix, changesWad, halfWidthsWad, auditHash, salt,
  });

  return {
    year,
    mode: windows.mode,
    dayZero: windows.dayZero,
    dayZeroUnix,
    preWindows: windows.preWindows,
    monitoringWindows: windows.monitoringWindows,
    auditJson,
    auditHash,
    salt, // secret until the year is finalized
    changesWad,
    halfWidthsWad,
    commitment,
    revealed: false,
    summary: {
      donors: result.donors.length,
      candidates: result.candidates,
      fitRmse: result.fitRmse,
      plotLevels: result.plotLevels,
      syntheticLevels: result.syntheticLevels,
    },
  };
};

module.exports = { createSealedBaseline, sha256Hex };
