const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const { verifyFirebaseToken } = require('../config/firebase');
const { generateToken, hashPassword, comparePassword } = require('../utils/encryption');
const logger = require('../utils/logger');

class AuthService {
  // Register new user
  static async register(userData) {
    try {
      const { name, email, password, role = 'user', licenseType = 'user_30days' } = userData;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create user
      const user = new User({
        name,
        email,
        password,
        role,
        license: {
          type: licenseType,
          isActive: true,
        },
        status: 'active',
        isVerified: true,
      });

      await user.save();

      // Generate token
      const token = this.generateToken(user);

      return {
        user: user.toJSON(),
        token,
      };
    } catch (error) {
      logger.error('AuthService.register error:', error);
      throw error;
    }
  }

  // Login user
  static async login(email, password, ip, userAgent) {
    try {
      // Find user
      const user = await User.findOne({ email, deletedAt: null }).select('+password');
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is locked
      if (user.isLocked()) {
        const remainingTime = Math.ceil((user.lockUntil - new Date()) / 60000);
        throw new Error(`Account is locked. Try again in ${remainingTime} minutes`);
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        await user.incrementLoginAttempts();
        throw new Error('Invalid credentials');
      }

      // Reset login attempts
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = new Date();
      user.metadata.lastIP = ip;
      user.metadata.lastUserAgent = userAgent;
      await user.save();

      // Generate token
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Log activity
      await ActivityLog.log({
        userId: user._id,
        action: 'login',
        details: { method: 'password' },
        ipAddress: ip,
        userAgent,
      });

      return {
        user: user.toJSON(),
        token,
        refreshToken,
      };
    } catch (error) {
      logger.error('AuthService.login error:', error);
      throw error;
    }
  }

  // Verify Firebase token
  static async verifyFirebaseToken(token) {
    try {
      const decodedToken = await verifyFirebaseToken(token);
      return decodedToken;
    } catch (error) {
      logger.error('AuthService.verifyFirebaseToken error:', error);
      throw error;
    }
  }

  // Generate JWT token
  static generateToken(user) {
    return jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );
  }

  // Generate refresh token
  static generateRefreshToken(user) {
    return jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '30d' }
    );
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.error('AuthService.verifyToken error:', error);
      throw error;
    }
  }

  // Refresh token
  static async refreshToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      const token = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return { token, refreshToken: newRefreshToken };
    } catch (error) {
      logger.error('AuthService.refreshToken error:', error);
      throw error;
    }
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      user.password = newPassword;
      await user.save();

      await ActivityLog.log({
        userId,
        action: 'password_change',
        details: { success: true },
      });

      return { success: true };
    } catch (error) {
      logger.error('AuthService.changePassword error:', error);
      throw error;
    }
  }

  // Reset password
  static async resetPassword(email) {
    try {
      const user = await User.findOne({ email, deletedAt: null });
      if (!user) {
        throw new Error('User not found');
      }

      const resetToken = generateToken(32);
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // TODO: Send reset email

      return { resetToken };
    } catch (error) {
      logger.error('AuthService.resetPassword error:', error);
      throw error;
    }
  }

  // Verify PIN
  static async verifyPin(userId, pin, deviceId = null) {
    try {
      const EnrollmentPin = require('../models/EnrollmentPin');
      const Device = require('../models/Device');

      const enrollmentPin = await EnrollmentPin.findOne({
        pin,
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!enrollmentPin) {
        throw new Error('Invalid or expired PIN');
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

        // Mark PIN as used
        enrollmentPin.isActive = false;
        enrollmentPin.usedAt = new Date();
        enrollmentPin.usedBy = device._id;
        await enrollmentPin.save();

        await ActivityLog.log({
          userId,
          deviceId: device._id,
          action: 'device_register',
          details: { pin, deviceId },
        });

        return { device };
      }

      return { success: true };
    } catch (error) {
      logger.error('AuthService.verifyPin error:', error);
      throw error;
    }
  }

  // Logout
  static async logout(userId, ip, userAgent) {
    try {
      await ActivityLog.log({
        userId,
        action: 'logout',
        details: { method: 'manual' },
        ipAddress: ip,
        userAgent,
      });
      return { success: true };
    } catch (error) {
      logger.error('AuthService.logout error:', error);
      throw error;
    }
  }
}

module.exports = AuthService;
