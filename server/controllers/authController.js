const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

// In-memory user fallback store when MongoDB is offline
const memoryUsers = new Map();

const INSTRUCTOR_INVITE_CODE = process.env.INSTRUCTOR_INVITE_CODE || 'FACULTY-2026';
const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Helper to generate JWT containing { userId, role }
const generateToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId || payload.id,
      id: payload.userId || payload.id,
      role: payload.role || 'student',
      name: payload.name,
      username: payload.username
    },
    process.env.JWT_SECRET || 'netcollaborate_secret_fallback',
    { expiresIn: '30d' }
  );
};

// Seed default test accounts in memory store immediately
(async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const facultyHashed = await bcrypt.hash('faculty123', salt);
    const studentHashed = await bcrypt.hash('student123', salt);

    const defaultInstructor = {
      id: 'user_instructor_01',
      _id: 'user_instructor_01',
      name: 'Prof. Sharma',
      username: 'prof_sharma',
      email: 'instructor@college.edu',
      password: facultyHashed,
      role: 'instructor',
      avatarColor: '#8b5cf6',
      isGuest: false,
      createdAt: new Date()
    };
    memoryUsers.set('user_instructor_01', defaultInstructor);

    const defaultStudent = {
      id: 'user_student_01',
      _id: 'user_student_01',
      name: 'Siya Singhaniya',
      username: 'siya_singhaniya',
      email: 'student@college.edu',
      rollNumber: 'CS2026-081',
      password: studentHashed,
      role: 'student',
      avatarColor: '#3b82f6',
      isGuest: false,
      createdAt: new Date()
    };
    memoryUsers.set('user_student_01', defaultStudent);

    // Also attempt seeding in MongoDB if reachable
    try {
      const instExists = await User.findOne({ email: 'instructor@college.edu' });
      if (!instExists) {
        await User.create({
          name: 'Prof. Sharma',
          username: 'prof_sharma',
          email: 'instructor@college.edu',
          password: 'faculty123',
          role: 'instructor',
          avatarColor: '#8b5cf6'
        });
      }
      const stuExists = await User.findOne({ email: 'student@college.edu' });
      if (!stuExists) {
        await User.create({
          name: 'Siya Singhaniya',
          username: 'siya_singhaniya',
          email: 'student@college.edu',
          rollNumber: 'CS2026-081',
          password: 'student123',
          role: 'student',
          avatarColor: '#3b82f6'
        });
      }
    } catch (dbSeedErr) {
      // MongoDB not connected yet, in-memory seed is active
    }
  } catch (err) {
    console.warn('Error seeding test accounts:', err.message);
  }
})();

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
      role = 'student',
      inviteCode,
      rollNumber
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password)'
      });
    }

    const assignedUsername = username || email.split('@')[0] || `user_${Date.now()}`;
    const cleanRole = role.toLowerCase() === 'instructor' ? 'instructor' : 'student';

    // Instructor invitation security check
    if (cleanRole === 'instructor') {
      if (!inviteCode || inviteCode.trim() !== INSTRUCTOR_INVITE_CODE) {
        return res.status(403).json({
          success: false,
          message: 'Invalid instructor invitation code. An authorized college faculty code is required to register as Instructor.'
        });
      }
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    // Try MongoDB first if online
    if (mongoose.connection.readyState === 1) {
      try {
        const userExists = await User.findOne({
          $or: [{ email: email.toLowerCase() }, { username: assignedUsername.toLowerCase() }]
        });

        if (userExists) {
          return res.status(400).json({
            success: false,
            message: 'User with this email or username already exists'
          });
        }

        const user = await User.create({
          name,
          username: assignedUsername,
          email: email.toLowerCase(),
          password,
          role: cleanRole,
          rollNumber: rollNumber || '',
          avatarColor: randomColor
        });

        const token = generateToken({
          userId: user._id,
          role: user.role,
          username: user.username,
          name: user.name
        });

        return res.status(201).json({
          success: true,
          token,
          user: {
            id: user._id,
            userId: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            rollNumber: user.rollNumber,
            avatarColor: user.avatarColor,
            isGuest: false
          }
        });
      } catch (dbErr) {
        // Fall back to memory
      }
    }
      // Memory fallback if DB is not connected
      for (const u of memoryUsers.values()) {
        if (
          u.email.toLowerCase() === email.toLowerCase() ||
          u.username.toLowerCase() === assignedUsername.toLowerCase()
        ) {
          return res.status(400).json({
            success: false,
            message: 'User with this email or username already exists'
          });
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const id = 'user_' + Date.now();

      const newUser = {
        id,
        _id: id,
        name,
        username: assignedUsername,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: cleanRole,
        rollNumber: rollNumber || '',
        avatarColor: randomColor,
        isGuest: false,
        createdAt: new Date()
      };

      memoryUsers.set(id, newUser);
      const token = generateToken({
        userId: id,
        role: cleanRole,
        username: assignedUsername,
        name
      });

      return res.status(201).json({
        success: true,
        token,
        user: {
          id,
          userId: id,
          name,
          username: assignedUsername,
          email: email.toLowerCase(),
          role: cleanRole,
          rollNumber: rollNumber || '',
          avatarColor: randomColor,
          isGuest: false
        }
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token with strict role checking
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password, role: requestedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const cleanTarget = email.trim().toLowerCase();

    // 1. Try MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findOne({
          $or: [{ email: cleanTarget }, { username: cleanTarget }]
        }).select('+password');

        if (user) {
          const isMatch = await user.matchPassword(password);
          if (!isMatch) {
            return res.status(401).json({
              success: false,
              message: 'Invalid email or password'
            });
          }

          // Strict role validation: Ensure user account actually has requested role
          if (requestedRole && requestedRole.toLowerCase() !== user.role) {
            return res.status(403).json({
              success: false,
              message: `Account role mismatch: This account has '${user.role}' privileges, but you selected '${requestedRole}'.`
            });
          }

          const token = generateToken({
            userId: user._id,
            role: user.role,
            username: user.username,
            name: user.name
          });

          return res.json({
            success: true,
            token,
            user: {
              id: user._id,
              userId: user._id,
              name: user.name,
              username: user.username,
              email: user.email,
              role: user.role,
              rollNumber: user.rollNumber || '',
              avatarColor: user.avatarColor || '#3b82f6',
              isGuest: false
            }
          });
        }
      } catch (dbErr) {
        // Fallback to memory store
      }
    }

    // 2. Check memory store
    for (const u of memoryUsers.values()) {
      if (
        u.email.toLowerCase() === cleanTarget ||
        u.username.toLowerCase() === cleanTarget
      ) {
        const isMatch = await bcrypt.compare(password, u.password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        // Strict role validation
        if (requestedRole && requestedRole.toLowerCase() !== u.role) {
          return res.status(403).json({
            success: false,
            message: `Account role mismatch: This account has '${u.role}' privileges, but you selected '${requestedRole}'.`
          });
        }

        const token = generateToken({
          userId: u.id || u._id,
          role: u.role,
          username: u.username,
          name: u.name
        });

        return res.json({
          success: true,
          token,
          user: {
            id: u.id || u._id,
            userId: u.id || u._id,
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            rollNumber: u.rollNumber || '',
            avatarColor: u.avatarColor || '#3b82f6',
            isGuest: false
          }
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Instant Guest Login (defaults to student role)
// @route   POST /api/auth/guest
const guestLogin = async (req, res) => {
  try {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const guestId = 'guest_' + Date.now();
    const username = `Student_Guest_${randomSuffix}`;
    const name = `Guest Student #${randomSuffix}`;
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const token = generateToken({
      userId: guestId,
      role: 'student',
      username,
      name,
      isGuest: true
    });

    res.json({
      success: true,
      token,
      user: {
        id: guestId,
        userId: guestId,
        name,
        username,
        email: `${username.toLowerCase()}@netcollaborate.local`,
        role: 'student',
        rollNumber: `GUEST-${randomSuffix}`,
        avatarColor: randomColor,
        isGuest: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile & verified role
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
  memoryUsers,
  generateToken,
  INSTRUCTOR_INVITE_CODE
};
