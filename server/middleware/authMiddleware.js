const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

// In-memory user fallback store reference if needed
let memoryUsersRef = null;
try {
  const authCtrl = require('../controllers/authController');
  memoryUsersRef = authCtrl.memoryUsers;
} catch (e) {
  // lazy load or ignore
}

/**
 * Authenticate JWT token and attach user to request
 * Returns 401 if unauthenticated
 */
const authenticateUser = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // If accessing demo or public sandbox endpoints explicitly allowed
    const url = req.originalUrl || req.url || '';
    if (
      (url.includes('demo') ||
       url.includes('simulate') ||
       url.includes('ping') ||
       url.includes('traceroute') ||
       url.includes('replay') ||
       url.includes('debug') ||
       url.includes('assist')) &&
      req.headers['x-guest-access'] === 'true'
    ) {
      req.user = {
        _id: 'guest-demo-user',
        id: 'guest-demo-user',
        userId: 'guest-demo-user',
        name: 'Guest Engineer',
        username: 'guest',
        role: 'student',
        isGuest: true,
        avatarColor: '#3b82f6'
      };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Not authenticated. No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'netcollaborate_secret_fallback'
    );

    const targetId = decoded.userId || decoded.id;

    // Check MongoDB first if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findById(targetId).select('-password');
        if (user) {
          req.user = {
            _id: user._id,
            id: user._id,
            userId: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            rollNumber: user.rollNumber,
            isGuest: user.isGuest || false,
            avatarColor: user.avatarColor || '#3b82f6'
          };
          return next();
        }
      } catch (dbErr) {
        // Fallback to token payload or memory if DB lookup fails
      }
    }

    // Check in-memory store
    if (memoryUsersRef && memoryUsersRef.has(targetId)) {
      const memUser = memoryUsersRef.get(targetId);
      req.user = {
        _id: memUser.id || memUser._id,
        id: memUser.id || memUser._id,
        userId: memUser.id || memUser._id,
        name: memUser.name,
        username: memUser.username,
        email: memUser.email,
        role: memUser.role || decoded.role || 'student',
        rollNumber: memUser.rollNumber || '',
        isGuest: memUser.isGuest || false,
        avatarColor: memUser.avatarColor || '#3b82f6'
      };
      return next();
    }

    // Fallback using decoded token attributes
    req.user = {
      _id: targetId,
      id: targetId,
      userId: targetId,
      name: decoded.name || (decoded.role === 'instructor' ? 'Instructor' : 'Student'),
      username: decoded.username || targetId,
      email: decoded.email || '',
      role: decoded.role || 'student',
      isGuest: Boolean(decoded.isGuest),
      avatarColor: decoded.avatarColor || '#3b82f6'
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated. Token is invalid or expired.'
    });
  }
};

/**
 * Require Student Role
 * Returns 403 Forbidden if not student
 */
const requireStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Student privileges required for this action.'
    });
  }

  next();
};

/**
 * Require Instructor Role
 * Returns 403 Forbidden if not instructor
 */
const requireInstructor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'instructor') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Instructor privileges required for this action.'
    });
  }

  next();
};

module.exports = {
  authenticateUser,
  protect: authenticateUser, // Backward-compatible alias
  requireStudent,
  requireInstructor
};
