const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'netcollaborate_secret_fallback');

      // Check if it's a guest token
      if (decoded.isGuest) {
        req.user = {
          _id: decoded.id,
          id: decoded.id,
          name: decoded.name || 'Guest Engineer',
          username: decoded.username || 'guest',
          isGuest: true,
          avatarColor: decoded.avatarColor || '#3b82f6'
        };
        return next();
      }

      // Check real DB if available
      try {
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          req.user = user;
          return next();
        }
      } catch (dbErr) {
        // Fallback to token payload if DB lookup fails
      }

      req.user = {
        _id: decoded.id,
        id: decoded.id,
        name: decoded.name,
        username: decoded.username,
        email: decoded.email,
        isGuest: false
      };
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or expired'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no authentication token provided'
    });
  }
};

module.exports = { protect };
