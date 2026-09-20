const mongoose = require('mongoose');

const LabResultSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  rollNumber: {
    type: String
  },
  sessionId: {
    type: String
  },
  sessionCode: {
    type: String
  },
  experimentId: {
    type: String,
    required: true
  },
  experimentTitle: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  letterGrade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'F'],
    default: 'A'
  },
  ber: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Completed', 'Pending Evaluation', 'Needs Revision'],
    default: 'Completed'
  },
  evaluationBreakdown: [
    {
      criterion: String,
      marksAwarded: Number,
      maxMarks: Number,
      feedback: String
    }
  ],
  observations: [String],
  conclusion: String,
  parameters: mongoose.Schema.Types.Mixed,
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LabResult', LabResultSchema);
