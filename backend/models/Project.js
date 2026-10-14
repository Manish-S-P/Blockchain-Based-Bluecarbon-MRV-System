const mongoose = require('mongoose');

const monitoringCycleSchema = new mongoose.Schema({
  year: { type: Number, default: 1 },
  cycleNumber: { type: Number, required: true }, // 1-4 within the year
  observedAt: { type: Date, default: Date.now },
  windowStart: { type: String, default: '' },
  windowEnd: { type: String, default: '' },
  ndvi: { type: Number, default: null }, // null when the quarter had no clear optical image
  ecosystemMatchesClaim: { type: Boolean, required: true },
  identifiedEcosystem: { type: String, default: '' },
  ecosystemConfidence: { type: Number, default: 0 },
  classificationDecision: { type: String, default: '' },
  anomalyDetected: { type: Boolean, required: true },
  anomalyStatus: { type: String, default: '' }, // normal | anomaly | insufficient_data
  anomalyScore: { type: Number, default: null },
  carbon: { type: mongoose.Schema.Types.Mixed, default: null },             // tree carbon now (t CO2/ha)
  carbonPreviousYear: { type: mongoose.Schema.Types.Mixed, default: null }, // same pixels, same season, a year earlier
  observation: { type: mongoose.Schema.Types.Mixed, default: null },        // what was recorded on-chain
  observationDataHash: { type: String, default: '' },
  observationTxHash: { type: String, default: '' },
  estimatedCo2Tonnes: { type: Number, default: 0 },
  geeImageCount: { type: Number, default: 0 },
  source: { type: String, default: 'unknown' },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  plotId: { type: String, unique: true, index: true },
  walletAddress: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  // Prototype: a mock identity derived from wallet + name + phone instead of a real ID document.
  identityId: { type: String, required: true },
  landMethod: { type: String, default: 'map' },
  rtcNumber: { type: String },
  coordinates: { type: [[Number]], default: [] }, // [lat, lon] corners, as drawn
  boundary: { // the same polygon as GeoJSON, for the overlap check
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], default: undefined },
  },
  vegetationType: { type: String, required: true, enum: ['mangrove', 'seagrass', 'saltmarsh'] },
  status: { type: String, default: 'Registered' },
  area: { type: Number, required: true, min: 0 },
  initialIdentifiedEcosystem: { type: String, default: '' },
  initialEcosystemConfidence: { type: Number, default: 0 },
  initialClassificationDecision: { type: String, default: '' },
  initialClassProbabilities: { type: Map, of: Number, default: {} },
  registerTxHash: { type: String, default: '' },

  // Current monitoring year
  year: { type: Number, default: 1 },
  mode: { type: String, enum: ['live', 'replay', ''], default: '' },
  baseline: { type: mongoose.Schema.Types.Mixed, default: null },     // see services/baselineService.js
  baselineTxHash: { type: String, default: '' },
  monitoringCycles: { type: [monitoringCycleSchema], default: [] },

  // Running totals, mirroring the contract's plot state
  chainState: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({ year: 1, cumulativeTreeGain: 0, cumulativeSoil: 0, issued: 0 }),
  },
  carbonCredits: { type: Number, default: 0 },                     // total issued so far
  yearResults: { type: [mongoose.Schema.Types.Mixed], default: [] }, // one entry per finished year
  onChain: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

projectSchema.index({ boundary: '2dsphere' });

projectSchema.set('toJSON', {
  transform: (_doc, ret) => {
    // The salt stays secret until the baseline is revealed at the end of the year.
    if (ret.baseline && !ret.baseline.revealed) {
      ret.baseline = { ...ret.baseline };
      delete ret.baseline.salt;
      delete ret.baseline.auditJson;
      delete ret.baseline.changesWad;
      delete ret.baseline.halfWidthsWad;
    }
    return ret;
  },
});

module.exports = mongoose.model('Project', projectSchema);
