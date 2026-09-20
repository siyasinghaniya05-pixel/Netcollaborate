const mongoose = require('mongoose');

const NetworkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a network name'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  owner: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or String for guest
    required: true
  },
  ownerName: {
    type: String,
    default: 'Anonymous'
  },
  visibility: {
    type: String,
    enum: ['private', 'shared', 'public'],
    default: 'private'
  },
  roomId: {
    type: String,
    unique: true,
    index: true
  },
  nodes: {
    type: Array,
    default: []
  },
  edges: {
    type: Array,
    default: []
  },
  collaborators: [
    {
      userId: mongoose.Schema.Types.Mixed,
      username: String,
      role: {
        type: String,
        enum: ['editor', 'viewer'],
        default: 'editor'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  simulationHistory: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
      sourceDevice: String,
      destDevice: String,
      sourceIP: String,
      destIP: String,
      protocol: String,
      status: String, // 'Delivered', 'Dropped'
      durationMs: Number,
      hopsCount: Number,
      reason: String
    }
  ],
  healthScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  snapshots: [
    {
      id: String,
      name: String,
      description: String,
      author: String,
      createdAt: { type: Date, default: Date.now },
      stats: mongoose.Schema.Types.Mixed,
      nodes: Array,
      edges: Array
    }
  ],
  stats: {
    devicesCount: { type: Number, default: 0 },
    connectionsCount: { type: Number, default: 0 },
    packetsSent: { type: Number, default: 0 },
    packetsDelivered: { type: Number, default: 0 },
    packetsFailed: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Network', NetworkSchema);
