const mongoose = require('mongoose');

const CollaborationRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  networkId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  activeUsers: [
    {
      socketId: String,
      userId: String,
      username: String,
      avatarColor: String,
      cursor: {
        x: Number,
        y: Number
      },
      lastActive: {
        type: Date,
        default: Date.now
      }
    }
  ],
  activityLog: [
    {
      id: String,
      username: String,
      action: String,
      details: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  messages: [
    {
      id: String,
      sender: String,
      text: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 * 7 // automatically clean up after 7 days of inactivity
  }
});

module.exports = mongoose.model('CollaborationRoom', CollaborationRoomSchema);
