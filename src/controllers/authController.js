const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Device = require('../models/Device');
const EnrollmentPin = require('../models/EnrollmentPin');
const ActivityLog = require('../models/ActivityLog');
const { createFirebaseUser, deleteFirebaseUser } = require('../config/firebase');
const { generateToken, hashPassword } = require('../utils/encryption');
const logger = require('../utils/logger');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'user', licenseType = 'user_30days' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create Firebase user
    let firebaseUser;
    try {
      firebaseUser = await createFirebaseUser(email, password);
    } catch (error) {
      logger.error('Firebase user creation failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account',
      });
    }

    // Create user in database
    const user = new User({
      name,
      email,
      password,
      firebaseUid: firebaseUser.uid,
      role,
      license: {
        type: licenseType,
        isActive: true,
      },
      status: 'active',
      isVerified: true,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    // Log activity
    await ActivityLog.log({
      userId: user._id,
      action: 'user_create',
      details: { email, role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is locked
    if (user.isLocked()) {
      const remainingTime = Math.ceil((user.lockUntil - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account is locked. Please try again in ${remainingTime} minutes.`,
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      await user.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    user.metadata.lastIP = req.ip;
    user.metadata.lastUserAgent = req.headers['user-agent'];
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '30d' }
    );

    // Log activity
    await ActivityLog.log({
      userId: user._id,
      action: 'login',
      details: { method: 'password' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

exports.verifyPin = async (req, res) => {
  try {
    const { pin, deviceId } = req.body;
    const userId = req.userId;

    // Find enrollment pin
    const enrollmentPin = await EnrollmentPin.findOne({
      pin,
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!enrollmentPin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired PIN',
      });
    }

    // Register device if deviceId provided
    if (deviceId) {
      const device = new Device({
        deviceId,
        name: `Device ${deviceId.substring(0, 8)}`,
        userId,
        enrollmentPin: pin,
        status: 'online',
        type: 'web',
        enrollmentDate: new Date(),
        lastSeen: new Date(),
      });
      await device.save();

      // Update device limit
      const user = await User.findById(userId);
      if (user) {
        const deviceCount = await Device.countDocuments({ userId });
        if (deviceCount > user.deviceLimit) {
          await Device.findByIdAndDelete(device._id);
          return res.status(403).json({
            success: false,
            message: 'Device limit exceeded',
          });
        }
      }

      // Mark PIN as used
      enrollmentPin.isActive = false;
      enrollmentPin.usedAt = new Date();
      enrollmentPin.usedBy = device._id;
      await enrollmentPin.save();

      // Log activity
      await ActivityLog.log({
        userId,
        deviceId: device._id,
        action: 'device_register',
        details: { pin, deviceId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.json({
        success: true,
        message: 'Device registered successfully',
        data: device,
      });
    }

    // Just verify PIN
    res.json({
      success: true,
      message: 'PIN verified successfully',
    });
  } catch (error) {
    logger.error('PIN verification error:', error);
    res.status(500).json({
      success: false,
      message: 'PIN verification failed',
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new tokens
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '30d' }
    );

    res.json({
      success: true,
      data: {
        token,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'logout',
      details: { method: 'manual' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log activity
    await ActivityLog.log({
      userId,
      action: 'password_change',
      details: { success: true },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, deletedAt: null });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate reset token
    const resetToken = generateToken(32);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // TODO: Send reset email

    res.json({
      success: true,
      message: 'Password reset email sent',
      data: { resetToken }, // Remove in production
    });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('license');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get device count
    const deviceCount = await Device.countDocuments({ userId: user._id });

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        deviceCount,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
};
