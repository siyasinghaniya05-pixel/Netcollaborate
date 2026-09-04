const User = require('../models/User');
const Network = require('../models/Network');
const { memoryNetworks } = require('./networkController');
const { memoryUsers } = require('./authController');

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    let userNetworks = [];
    try {
      userNetworks = await Network.find({ owner: userId });
    } catch (err) {
      userNetworks = Array.from(memoryNetworks.values()).filter(n => n.owner === userId);
    }

    const totalDevices = userNetworks.reduce((acc, n) => acc + (n.nodes ? n.nodes.length : 0), 0);
    const totalSimulations = userNetworks.reduce((acc, n) => acc + (n.simulationHistory ? n.simulationHistory.length : 0), 0);
    const avgHealth = userNetworks.length > 0
      ? Math.round(userNetworks.reduce((acc, n) => acc + (n.healthScore || 100), 0) / userNetworks.length)
      : 100;

    res.json({
      success: true,
      user: req.user,
      stats: {
        networksCount: userNetworks.length,
        totalDevices,
        totalSimulations,
        averageHealth: avgHealth
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { name, avatarColor } = req.body;

    let updated = null;
    try {
      updated = await User.findByIdAndUpdate(
        userId,
        { $set: { name, avatarColor } },
        { new: true }
      ).select('-password');
    } catch (err) {}

    if (!updated && memoryUsers.has(userId)) {
      const u = memoryUsers.get(userId);
      if (name) u.name = name;
      if (avatarColor) u.avatarColor = avatarColor;
      updated = u;
    }

    res.json({
      success: true,
      user: updated || req.user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
