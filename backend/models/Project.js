const mongoose = require('mongoose');

const monitoringCycleSchema = new mongoose.Schema({
  cycleNumber: { type: Number, required: true },
  observedAt: { type: Date, default: Date.now },
  windowStart: { type: String, default: '' },
  windowEnd: { type: String, default: '' },
  ndvi: { type: Number, required: true },
  ecosystemMatchesClaim: { type: Boolean, required: true },
  identifiedEcosystem: { type: String, default: '' },
  ecosystemConfidence: { type: Number, default: 0 },
  anomalyDetected: { type: Boolean, required: true },
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
  aadhar: { type: String, required: true },
  landMethod: { type: String, required: true },
  rtcNumber: { type: String },
  coordinates: { type: [[Number]], default: [] },
  vegetationType: { type: String, required: true },
  status: { type: String, default: 'Pending Verification' },
  carbonCredits: { type: Number, default: 0 },
  area: { type: Number, default: 12.5 },
  initialIdentifiedEcosystem: { type: String, default: '' },
  initialEcosystemConfidence: { type: Number, default: 0 },
  monitoringCycles: { type: [monitoringCycleSchema], default: [] },
  averageNdvi: { type: Number, default: 0 },
  reportIpfsHash: { type: String, default: '' },
  creditTokenId: { type: String, default: '' },
  registerTxHash: { type: String, default: '' },
  mintTxHash: { type: String, default: '' },
  contractVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
