const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// In-memory user fallback store when MongoDB is offline
const memoryUsers = new Map();

// Helper to generate JWT
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'netcollaborate_secret_fallback', {
    expiresIn: '30d'
  });
};

const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    // Try MongoDB first
    try {
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
      }

      const user = await User.create({
        name,
        username,
        email,
        password,
        avatarColor: randomColor
      });

      const token = generateToken({ id: user._id, username: user.username, name: user.name });

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          avatarColor: user.avatarColor,
          isGuest: false
        }
      });
    } catch (dbErr) {
      // Memory fallback if DB is not connected
      console.warn('MongoDB query failed, using memory user store:', dbErr.message);
      for (const u of memoryUsers.values()) {
        if (u.email === email || u.username === username) {
          return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const id = 'user_' + Date.now();

      const newUser = {
        id,
        _id: id,
        name,
        username,
        email,
        password: hashedPassword,
        avatarColor: randomColor,
        isGuest: false,
        createdAt: new Date()
      };

      memoryUsers.set(id, newUser);
      const token = generateToken({ id, username, name });

      return res.status(201).json({
        success: true,
        token,
        user: {
          id,
          name,
          username,
          email,
          avatarColor: randomColor,
          isGuest: false
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Try MongoDB
    try {
      const user = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }]
      }).select('+password');

      if (user && (await user.matchPassword(password))) {
        const token = generateToken({ id: user._id, username: user.username, name: user.name });
        return res.json({
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            avatarColor: user.avatarColor || '#3b82f6',
            isGuest: false
          }
        });
      }
    } catch (dbErr) {
      // Fallback to memory store
    }

    // Check memory store
    for (const u of memoryUsers.values()) {
      if ((u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase())) {
        const isMatch = await bcrypt.compare(password, u.password);
        if (isMatch) {
          const token = generateToken({ id: u.id, username: u.username, name: u.name });
          return res.json({
            success: true,
            token,
            user: {
              id: u.id,
              name: u.name,
              username: u.username,
              email: u.email,
              avatarColor: u.avatarColor,
              isGuest: false
            }
          });
        }
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Instant Guest Login
// @route   POST /api/auth/guest
const guestLogin = async (req, res) => {
  try {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const guestId = 'guest_' + Date.now();
    const username = `Guest_Eng${randomSuffix}`;
    const name = `Guest Engineer #${randomSuffix}`;
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const token = generateToken({
      id: guestId,
      username,
      name,
      isGuest: true,
      avatarColor: randomColor
    });

    res.json({
      success: true,
      token,
      user: {
        id: guestId,
        name,
        username,
        email: `${username.toLowerCase()}@netcollaborate.local`,
        avatarColor: randomColor,
        isGuest: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  guestLogin,
  getMe,
  memoryUsers
};
