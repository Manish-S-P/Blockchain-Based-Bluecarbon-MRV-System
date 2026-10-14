// Annual credit rule for mangrove plots. The authoritative calculation runs on-chain in
// BlueCarbonRegistry.finalizeYear; this file mirrors it so the backend and dashboard can explain
// every step (and so tests can check both give the same answer). See docs/carbon-calculation.md.

const CO2_PER_CARBON = 44 / 12;
const SOIL_CO2_PER_HA_YEAR = 0.5 * CO2_PER_CARBON; // India BEE BM FR05.001: 0.5 t C/ha/yr
const SOIL_MAX_YEARS = 20;
const COVER_MIN = 0.15;
const COVER_FULL = 0.5;
const BUFFER_SHARE = 0.12;
const MIN_USABLE_QUARTERS = 2;
const MIN_APPLICABLE_SHARE = 0.5;

const coverFactor = (cover) => {
  if (cover <= COVER_MIN) return 0;
  if (cover >= COVER_FULL) return 1;
  return (cover - COVER_MIN) / (COVER_FULL - COVER_MIN);
};

// CDM AR-TOOL14 v4.2 Appendix 2: share of the 90% half-width deducted, by relative uncertainty.
const arTool14Discount = (relative) => {
  if (relative <= 0.10) return 0;
  if (relative <= 0.15) return 0.25;
  if (relative <= 0.20) return 0.5;
  if (relative <= 0.30) return 0.75;
  return 1;
};

const halfWidth = (range) => (range.high - range.low) / 2;

/** What one quarterly check contributes, in the form recorded on-chain. */
const quarterObservation = (cycle) => {
  const now = cycle.carbon;
  const before = cycle.carbonPreviousYear;
  const usable = now?.status === 'ok' && before?.status === 'ok' && now.applicableShare >= MIN_APPLICABLE_SHARE;
  return {
    usable,
    anomaly: cycle.anomalyStatus === 'anomaly' || Boolean(cycle.anomalyDetected),
    plotChange: usable ? now.treeCo2.mid - before.treeCo2.mid : 0,
    plotHalfWidth: usable ? Math.hypot(halfWidth(now.treeCo2), halfWidth(before.treeCo2)) : 0,
    cover: usable ? now.mangroveCover : 0,
  };
};

/**
 * One year's credits.
 * @param observations 4 quarterly observations (quarterObservation output), in season order
 * @param baseline     committed forecast: 4 x { change, halfWidth }
 * @param actualDonorChange 4 x number|null: what the donors really did (null = unknown)
 * @param state        { year, cumulativeTreeGain, cumulativeSoil, issued } before this year
 */
const computeYearCredits = ({ observations, baseline, actualDonorChange, areaHa, state }) => {
  const perQuarter = observations.map((o, i) => {
    const actual = actualDonorChange[i];
    const baselineUsed = actual === null || actual === undefined ? baseline[i].change : Math.max(baseline[i].change, actual);
    return {
      ...o,
      forecastChange: baseline[i].change,
      actualDonorChange: actual ?? null,
      baselineUsed,
      additional: o.plotChange - baselineUsed,
      halfWidth: Math.hypot(o.plotHalfWidth, baseline[i].halfWidth),
    };
  });

  const base = { perQuarter, newState: { ...state, year: state.year + 1 }, credits: 0 };
  if (observations.some((o) => o.anomaly)) return { ...base, outcome: 'AnomalyDetected' };
  const usable = perQuarter.filter((q) => q.usable);
  if (usable.length < MIN_USABLE_QUARTERS) return { ...base, outcome: 'InsufficientData' };

  const yearGain = usable.reduce((s, q) => s + q.additional, 0) / usable.length;
  const yearHalfWidth = usable.reduce((s, q) => s + q.halfWidth, 0) / usable.length;
  const cumulativeTreeGain = state.cumulativeTreeGain + yearGain;
  const relativeUncertainty = cumulativeTreeGain > 0 ? yearHalfWidth / cumulativeTreeGain : null;
  const discountShare = relativeUncertainty === null ? 1 : arTool14Discount(relativeUncertainty);
  const provenTreeGain = cumulativeTreeGain > 0 ? Math.max(0, cumulativeTreeGain - discountShare * yearHalfWidth) : 0;

  const minCover = Math.min(...usable.map((q) => q.cover));
  const soilThisYear = state.year <= SOIL_MAX_YEARS ? SOIL_CO2_PER_HA_YEAR * coverFactor(minCover) : 0;
  const cumulativeSoil = state.cumulativeSoil + soilThisYear;

  const perHectare = provenTreeGain + cumulativeSoil;
  const total = perHectare * areaHa;
  const buffer = total * BUFFER_SHARE;
  const afterBuffer = total - buffer;
  const credits = Math.max(0, afterBuffer - state.issued);

  return {
    perQuarter,
    outcome: credits > 0 ? 'Minted' : 'NoProvableGain',
    usableQuarters: usable.length,
    yearGain,
    yearHalfWidth,
    cumulativeTreeGain,
    relativeUncertainty,
    discountShare,
    provenTreeGain,
    minCover,
    soilThisYear,
    cumulativeSoil,
    perHectare,
    areaHa,
    total,
    bufferShare: BUFFER_SHARE,
    buffer,
    afterBuffer,
    alreadyIssued: state.issued,
    credits,
    newState: {
      year: state.year + 1,
      cumulativeTreeGain,
      cumulativeSoil,
      issued: state.issued + credits,
    },
  };
};

module.exports = {
  CO2_PER_CARBON,
  SOIL_CO2_PER_HA_YEAR,
  BUFFER_SHARE,
  arTool14Discount,
  coverFactor,
  quarterObservation,
  computeYearCredits,
};
