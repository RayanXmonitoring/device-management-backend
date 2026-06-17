const mongoose = require('mongoose');
const User = require('../models/User');
const Device = require('../models/Device');
const License = require('../models/License');
const EnrollmentPin = require('../models/EnrollmentPin');
const ActivityLog = require('../models/ActivityLog');
const SystemSetting = require('../models/SystemSetting');
const { deleteFirebaseUser } = require('../config/firebase');
const { generateToken } = require('../utils/encryption');
const { emitEvent } = require('../config/socket');
const logger = require('../utils/logger');

// User Management
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, role } = req.query;
    
    const query = { deletedAt: null };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (role) query.role = role;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, licenseType } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: role || 'user',
      license: {
        type: licenseType || 'user_30days',
        isActive: true,
      },
      status: 'active',
      isVerified: true,
    });

    await user.save();

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'user_create',
      details: { email, role, licenseType },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    const allowedUpdates = ['name', 'role', 'status', 'deviceLimit', 'preferences'];
    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    }

    // Update license if provided
    if (updates.license) {
      user.license.type = updates.license.type || user.license.type;
      user.license.isActive = updates.license.isActive !== undefined ? updates.license.isActive : user.license.isActive;
    }

    await user.save();

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'user_update',
      details: { userId: id, updates },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Soft delete
    user.deletedAt = new Date();
    user.status = 'suspended';
    await user.save();

    // Delete Firebase user if exists
    if (user.firebaseUid) {
      try {
        await deleteFirebaseUser(user.firebaseUid);
      } catch (error) {
        logger.error('Firebase user deletion failed:', error);
      }
    }

    // Delete all devices
    await Device.updateMany(
      { userId: user._id },
      { deletedAt: new Date(), status: 'offline' }
    );

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'user_delete',
      details: { userId: id, email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
};

exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = 'suspended';
    await user.save();

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'user_suspend',
      details: { userId: id, email: user.email, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit event
    emitEvent('user:suspended', { userId: user._id });

    res.json({
      success: true,
      message: 'User suspended successfully',
    });
  } catch (error) {
    logger.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend user',
    });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.status = 'active';
    await user.save();

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'user_activate',
      details: { userId: id, email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit event
    emitEvent('user:activated', { userId: user._id });

    res.json({
      success: true,
      message: 'User activated successfully',
    });
  } catch (error) {
    logger.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user',
    });
  }
};

// License Management
exports.getLicenses = async (req, res) => {
  try {
    const licenses = await License.find().sort({ createdAt: -1 });
    
    // Get statistics
    const stats = {
      total: licenses.length,
      active: licenses.filter(l => l.isActive).length,
      expired: licenses.filter(l => !l.isActive && l.expiryDate < new Date()).length,
      expiring: licenses.filter(l => {
        const days = (l.expiryDate - new Date()) / (1000 * 60 * 60 * 24);
        return l.isActive && days > 0 && days <= 30;
      }).length,
    };

    res.json({
      success: true,
      data: licenses,
      stats,
    });
  } catch (error) {
    logger.error('Get licenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get licenses',
    });
  }
};

exports.createLicense = async (req, res) => {
  try {
    const { userId, type, durationDays } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const license = new License({
      userId,
      type,
      durationDays,
      expiryDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      isActive: true,
    });

    await license.save();

    // Update user license
    user.license = {
      type,
      expiryDate: license.expiryDate,
      isActive: true,
    };
    await user.save();

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'license_update',
      details: { userId, type, durationDays },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'License created successfully',
      data: license,
    });
  } catch (error) {
    logger.error('Create license error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create license',
    });
  }
};

// Enrollment PIN Management
exports.createEnrollmentPin = async (req, res) => {
  try {
    const { userId, description } = req.body;
    const adminId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate PIN
    const pin = generateToken(8).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const enrollmentPin = new EnrollmentPin({
      pin,
      userId,
      createdBy: adminId,
      description,
      expiresAt,
      isActive: true,
    });

    await enrollmentPin.save();

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'pin_create',
      details: { userId, description },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Enrollment PIN created successfully',
      data: {
        pin,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error('Create enrollment pin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create enrollment PIN',
    });
  }
};

exports.getEnrollmentPins = async (req, res) => {
  try {
    const { userId } = req.query;
    const query = {};
    if (userId) query.userId = userId;

    const pins = await EnrollmentPin.find(query)
      .populate('userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: pins,
    });
  } catch (error) {
    logger.error('Get enrollment pins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get enrollment pins',
    });
  }
};

exports.revokeEnrollmentPin = async (req, res) => {
  try {
    const { id } = req.params;

    const pin = await EnrollmentPin.findById(id);
    if (!pin) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment PIN not found',
      });
    }

    pin.isActive = false;
    await pin.save();

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'pin_revoke',
      details: { pinId: id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Enrollment PIN revoked successfully',
    });
  } catch (error) {
    logger.error('Revoke enrollment pin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke enrollment PIN',
    });
  }
};

// System Settings
exports.getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.findOne();
    if (!settings) {
      // Create default settings
      const defaultSettings = new SystemSetting({
        maintenance: false,
        registrationEnabled: true,
        maxDevicesPerUser: 5,
        sessionTimeout: 3600,
        backupEnabled: true,
        backupInterval: 86400,
        encryptionEnabled: true,
        auditLogEnabled: true,
        emailNotifications: true,
        pushNotifications: true,
      });
      await defaultSettings.save();
      return res.json({
        success: true,
        data: defaultSettings,
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system settings',
    });
  }
};

exports.updateSystemSettings = async (req, res) => {
  try {
    const updates = req.body;

    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting();
    }

    // Update settings
    const allowedUpdates = [
      'maintenance',
      'maintenanceMessage',
      'registrationEnabled',
      'maxDevicesPerUser',
      'sessionTimeout',
      'backupEnabled',
      'backupInterval',
      'encryptionEnabled',
      'auditLogEnabled',
      'emailNotifications',
      'pushNotifications',
    ];

    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        settings[field] = updates[field];
      }
    }

    await settings.save();

    // Log activity
    await ActivityLog.log({
      userId: req.userId,
      action: 'settings_update',
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit settings update
    emitEvent('settings:updated', settings);

    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    });
  } catch (error) {
    logger.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system settings',
    });
  }
};

// Audit Logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      userId, 
      deviceId, 
      action, 
      status,
      startDate,
      endDate 
    } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (deviceId) query.deviceId = deviceId;
    if (action) query.action = action;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(query)
      .populate('userId', 'name email')
      .populate('deviceId', 'name deviceId')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get audit logs',
    });
  }
};
