const mongoose = require('mongoose');

const ExperimentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    default: 'Student'
  },
  rollNumber: {
    type: String,
    default: ''
  },
  sessionId: {
    type: String,
    default: ''
  },
  sessionCode: {
    type: String,
    default: ''
  },
  experimentType: {
    type: String,
    default: 'FSK'
  },
  experimentTitle: {
    type: String,
    default: 'Binary Frequency Shift Keying (BFSK)'
  },
  networkTopology: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  fskParameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  transmittedData: {
    type: String,
    default: ''
  },
  receivedData: {
    type: String,
    default: ''
  },
  ber: {
    type: Number,
    default: 0
  },
  noiseLevel: {
    type: Number,
    default: 0
  },
  latency: {
    type: Number,
    default: 0
  },
  packetLoss: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Running', 'Submitted', 'Completed', 'Needs Revision'],
    default: 'Submitted'
  },
  score: {
    type: Number,
    default: 0
  },
  feedback: {
    type: String,
    default: ''
  },
  evaluationBreakdown: [
    {
      criterion: String,
      marksAwarded: Number,
      maxMarks: Number,
      feedback: String
    }
  ],
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Experiment', ExperimentSchema);
