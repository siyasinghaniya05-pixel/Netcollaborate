const mongoose = require('mongoose');

const LabSessionSchema = new mongoose.Schema({
  sessionCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  joinCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  title: {
    type: String,
    required: true,
    default: 'Digital Communication Lab'
  },
  subject: {
    type: String,
    default: 'Computer Networks'
  },
  room: {
    type: String,
    default: 'Networking Lab 2'
  },
  instructorId: {
    type: String,
    default: 'instructor-root'
  },
  instructorName: {
    type: String,
    default: 'Dr. Santosh Patil'
  },
  date: {
    type: String,
    default: '20 September 2026'
  },
  startTime: {
    type: String,
    default: '10:00 AM'
  },
  endTime: {
    type: String,
    default: '12:00 PM'
  },
  experimentId: {
    type: String,
    default: 'EXP-05-BFSK'
  },
  experimentName: {
    type: String,
    default: 'FSK Modulation and Demodulation'
  },
  selectedExperiments: {
    type: [String],
    default: ['FSK']
  },
  durationMinutes: {
    type: Number,
    default: 120
  },
  description: {
    type: String,
    default: 'Perform FSK modulation, transmission, demodulation and BER analysis.'
  },
  instructions: {
    type: String,
    default: '1. Build the network.\n2. Enter binary data.\n3. Configure FSK frequencies.\n4. Add channel noise.\n5. Perform demodulation.\n6. Calculate BER.\n7. Submit the experiment.'
  },
  maxStudents: {
    type: Number,
    default: 50,
    min: 1,
    max: 100
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'closed', 'cancelled'],
    default: 'active'
  },
  students: [
    {
      studentId: String,
      name: String,
      rollNumber: String,
      status: {
        type: String,
        enum: ['Online', 'Idle', 'Running', 'Submitted', 'Completed', 'Disconnected', 'Joined', 'Error'],
        default: 'Online'
      },
      currentExperiment: String,
      progress: {
        type: Number,
        default: 10
      },
      ber: {
        type: Number,
        default: 0
      },
      score: {
        type: Number,
        default: 0
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      lastActive: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LabSession', LabSessionSchema);
