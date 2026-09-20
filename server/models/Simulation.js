const mongoose = require('mongoose');

const SimulationSchema = new mongoose.Schema({
  networkId: {
    type: String,
    required: true
  },
  userId: {
    type: String
  },
  sourceDevice: String,
  destDevice: String,
  inputData: String,
  modulationType: {
    type: String,
    enum: ['STANDARD', 'FSK', 'ASK', 'PSK'],
    default: 'FSK'
  },
  parameters: {
    f0: Number,
    f1: Number,
    carrierFreq: Number,
    bitDuration: Number,
    noisePercent: Number,
    attenuation: Number
  },
  results: {
    txBits: [Number],
    rxBits: [Number],
    errors: Number,
    ber: Number,
    berPercent: Number,
    snrDb: Number,
    bandwidthHz: Number,
    status: String,
    latencyMs: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Simulation', SimulationSchema);
