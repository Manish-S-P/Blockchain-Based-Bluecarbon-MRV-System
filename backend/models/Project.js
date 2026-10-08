const mongoose = require('mongoose');

const monitoringCycleSchema = new mongoose.Schema({
  cycleNumber: { type: Number, required: true },
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
  estimatedCo2Tonnes: { type: Number, required: true },
  geeImageCount: { type: Number, default: 0 },
  source: { type: String, default: 'unknown' },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  plotId: { type: String, unique: true, index: true },
  walletAddress: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  aadhar: { type: String, required: true }, // never returned by the API (see toJSON below)
  landMethod: { type: String, required: true },
  rtcNumber: { type: String },
  coordinates: { type: [[Number]], default: [] },
  vegetationType: { type: String, required: true, enum: ['mangrove', 'seagrass', 'saltmarsh'] },
  status: { type: String, default: 'Pending Verification' },
  carbonCredits: { type: Number, default: 0 },
  area: { type: Number, required: true, min: 0 },
  initialIdentifiedEcosystem: { type: String, default: '' },
  initialEcosystemConfidence: { type: Number, default: 0 },
  initialClassificationDecision: { type: String, default: '' },
  initialClassProbabilities: { type: Map, of: Number, default: {} },
  monitoringCycles: { type: [monitoringCycleSchema], default: [] },
  averageNdvi: { type: Number, default: 0 },
  reportIpfsHash: { type: String, default: '' },
  creditTokenId: { type: String, default: '' },
  registerTxHash: { type: String, default: '' },
  mintTxHash: { type: String, default: '' },
  mintNetwork: { type: String, default: '' }, // local | amoy
  contractVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

projectSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.aadhar;
    return ret;
  },
});

module.exports = mongoose.model('Project', projectSchema);
