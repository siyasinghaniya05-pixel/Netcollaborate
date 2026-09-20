const mongoose = require('mongoose');

const LabReportSchema = new mongoose.Schema({
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
  experimentId: {
    type: String,
    required: true
  },
  experimentTitle: {
    type: String,
    default: 'Network & Communication Lab Experiment'
  },
  sessionId: {
    type: String,
    default: ''
  },
  sessionCode: {
    type: String,
    default: ''
  },
  reportData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LabReport', LabReportSchema);
