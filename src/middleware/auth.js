const jwt = require('jsonwebtoken');
const { verifyFirebaseToken } = require('../config/firebase');
const User = require('../models/User');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Get token from cookie
    if (!token && req.cookies) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      // If JWT verification fails, try Firebase token
      try {
        const firebaseUser = await verifyFirebaseToken(token);
        decoded = {
          userId: firebaseUser.uid,
          email: firebaseUser.email,
        };
      } catch (firebaseError) {
        logger.error('Token verification failed:', firebaseError);
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      }
    }

    // Get user from database
    const user = await User.findOne({
      $or: [{ _id: decoded.userId }, { firebaseUid: decoded.userId }],
      deletedAt: null,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended',
      });
    }

    // Check if user is locked
    if (user.isLocked()) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked',
      });
    }

    // Check license validity
    if (!user.isLicenseValid()) {
      return res.status(403).json({
        success: false,
        message: 'License has expired',
      });
    }

    // Set user in request
    req.user = user;
    req.userId = user._id;

    // Update last login time
    if (req.method === 'GET') {
      user.lastLogin = new Date();
      await user.save();
    }

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

// Optional auth middleware (doesn't block if no token)
const optionalAuth = async (req, res, next) => {
  try {
    await authMiddleware(req, res, (err) => {
      if (err) {
        // Continue without user
        req.user = null;
        req.userId = null;
      }
      next();
    });
  } catch (error) {
    req.user = null;
    req.userId = null;
    next();
  }
};

module.exports = { authMiddleware, optionalAuth };
