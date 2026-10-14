// Annual credit calculation for mangrove plots. See docs/carbon-calculation.md.
//
// Tree carbon comes from the ML service's carbon model (satellite canopy height -> Simard 2019
// mangrove allometry -> IPCC root:shoot and carbon fraction). Soil carbon uses India's
// official default rate. Uncertainty is discounted with CDM AR-TOOL14 (adopted by India's
// BEE BM FR05.001), and a buffer is withheld for non-permanence.

const CO2_PER_CARBON = 44 / 12;
const SOIL_RATE_T_C_HA_YR = Number(process.env.SOIL_RATE_T_C_HA_YR || 0.5); // BEE BM FR05.001
const COVER_MIN = 0.15;   // VM0033-style cover factor: no soil accrual below 15% cover,
const COVER_FULL = 0.5;   // full rate from 50% cover
const BUFFER_SHARE = Number(process.env.CREDIT_BUFFER_SHARE || 0.12);
const MIN_APPLICABLE_SHARE = 0.5; // the model must be applicable to most of the plot
const MIN_QUARTERS_WITH_CARBON = 2;

const coverFactor = (cover) => {
  if (cover <= COVER_MIN) return 0;
  if (cover >= COVER_FULL) return 1;
  return (cover - COVER_MIN) / (COVER_FULL - COVER_MIN);
};

// CDM AR-TOOL14 v04.2 Appendix 2: share of the 90% CI half-width to deduct, by relative uncertainty.
const arTool14Discount = (relativeUncertainty) => {
  if (relativeUncertainty <= 0.10) return 0;
  if (relativeUncertainty <= 0.15) return 0.25;
  if (relativeUncertainty <= 0.20) return 0.5;
  if (relativeUncertainty <= 0.30) return 0.75;
  return 1;
};

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const halfWidth = (range) => (range.high - range.low) / 2;

/**
 * Credits for one monitoring year.
 *
 * Each quarter carries tree carbon now and in the same season one year earlier (same pixels,
 * same model), so seasonal effects cancel. The gain is averaged over quarters that have both.
 * Errors of the two years are treated as independent (sqrt of summed squares) and are not
 * reduced by averaging quarters, both of which overstate rather than understate uncertainty.
 */
const computeAnnualCredits = ({ cycles, areaHa, alreadyIssued = 0 }) => {
  const usable = cycles.filter((cycle) => {
    const now = cycle.carbon;
    const before = cycle.carbonPreviousYear;
    return now?.status === 'ok' && before?.status === 'ok' && now.applicableShare >= MIN_APPLICABLE_SHARE;
  });
  if (usable.length < MIN_QUARTERS_WITH_CARBON) {
    return {
      eligible: false,
      reason: `Only ${usable.length} of ${cycles.length} quarters had a reliable carbon estimate (clear satellite data and a plot similar to the training data). At least ${MIN_QUARTERS_WITH_CARBON} are needed.`,
    };
  }

  const gains = usable.map((cycle) => cycle.carbon.treeCo2.mid - cycle.carbonPreviousYear.treeCo2.mid);
  const halfWidths = usable.map((cycle) => Math.sqrt(
    halfWidth(cycle.carbon.treeCo2) ** 2 + halfWidth(cycle.carbonPreviousYear.treeCo2) ** 2,
  ));
  const treeGain = gains.reduce((sum, g) => sum + g, 0) / gains.length;
  const treeGainHalfWidth = halfWidths.reduce((sum, h) => sum + h, 0) / halfWidths.length;

  const relativeUncertainty = treeGain > 0 ? treeGainHalfWidth / treeGain : Infinity;
  const discountShare = arTool14Discount(relativeUncertainty);
  const provenTreeGain = Math.max(0, treeGain - discountShare * treeGainHalfWidth);

  const mangroveCover = Math.min(...usable.map((cycle) => cycle.carbon.mangroveCover));
  const soilGain = SOIL_RATE_T_C_HA_YR * 1 * coverFactor(mangroveCover) * CO2_PER_CARBON;

  const perHectare = provenTreeGain + soilGain;
  const beforeBuffer = perHectare * areaHa;
  const buffer = beforeBuffer * BUFFER_SHARE;
  const credits = Math.max(0, beforeBuffer - buffer - alreadyIssued);

  return {
    eligible: true,
    method: 'Tree carbon: stock difference vs same season last year (satellite canopy height -> Simard 2019 allometry -> IPCC factors), CDM AR-TOOL14 uncertainty discount. Soil: BEE BM FR05.001 default 0.5 t C/ha/yr x cover factor.',
    quartersUsed: usable.length,
    treeGainPerHa: round(treeGain),
    treeGainHalfWidthPerHa: round(treeGainHalfWidth),
    relativeUncertainty: Number.isFinite(relativeUncertainty) ? round(relativeUncertainty, 3) : null,
    uncertaintyDiscountShare: discountShare,
    provenTreeGainPerHa: round(provenTreeGain),
    mangroveCover: round(mangroveCover, 3),
    soilGainPerHa: round(soilGain),
    perHectare: round(perHectare),
    areaHa: round(areaHa, 4),
    beforeBuffer: round(beforeBuffer, 4),
    bufferShare: BUFFER_SHARE,
    buffer: round(buffer, 4),
    alreadyIssued: round(alreadyIssued, 4),
    credits: round(credits, 4),
  };
};

module.exports = {
  CO2_PER_CARBON,
  BUFFER_SHARE,
  arTool14Discount,
  coverFactor,
  computeAnnualCredits,
};
