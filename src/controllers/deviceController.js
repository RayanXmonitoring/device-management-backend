const Device = require('../models/Device');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { emitEvent } = require('../config/socket');
const { generateToken } = require('../utils/encryption');
const logger = require('../utils/logger');

exports.registerDevice = async (req, res) => {
  try {
    const { deviceId, name, type, model, manufacturer, osVersion, appVersion } = req.body;
    const userId = req.userId;

    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId, deletedAt: null });
    if (existingDevice) {
      return res.status(409).json({
        success: false,
        message: 'Device already registered',
      });
    }

    // Check device limit
    const user = await User.findById(userId);
    const deviceCount = await Device.countDocuments({ userId });
    if (deviceCount >= user.deviceLimit) {
      return res.status(403).json({
        success: false,
        message: 'Device limit exceeded',
      });
    }

    // Generate enrollment PIN
    const enrollmentPin = generateToken(6).toUpperCase();

    // Create device
    const device = new Device({
      deviceId,
      name: name || `Device ${deviceId.substring(0, 8)}`,
      userId,
      type,
      model,
      manufacturer,
      osVersion,
      appVersion,
      enrollmentPin,
      status: 'online',
      metadata: {
        registeredIP: req.ip,
        registeredAt: new Date(),
      },
    });

    await device.save();

    // Emit device registration event
    emitEvent('device:registered', { device, userId }, `user:${userId}`);

    // Log activity
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'device_register',
      details: { deviceId, type },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      data: {
        device: device.toJSON(),
        enrollmentPin,
      },
    });
  } catch (error) {
    logger.error('Device registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device',
    });
  }
};

exports.getAllDevices = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    let devices;
    if (user.role === 'admin') {
      // Admin can see all devices
      devices = await Device.find({ deletedAt: null })
        .populate('userId', 'name email')
        .sort({ updatedAt: -1 });
    } else {
      // Users can see only their devices
      devices = await Device.find({ userId, deletedAt: null })
        .sort({ updatedAt: -1 });
    }

    res.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    logger.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get devices',
    });
  }
};

exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const device = await Device.findOne({
      _id: id,
      deletedAt: null,
    }).populate('userId', 'name email');

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check access
    const user = await User.findById(userId);
    if (device.userId._id.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    logger.error('Get device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device',
    });
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.userId;

    const device = await Device.findOne({ _id: id, deletedAt: null });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check ownership
    const user = await User.findById(userId);
    if (device.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update fields
    const allowedUpdates = ['name', 'status', 'type', 'model', 'manufacturer', 'osVersion', 'appVersion', 'settings', 'permissions'];
    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        device[field] = updates[field];
      }
    }

    // Update location if provided
    if (updates.location) {
      device.updateLocation(updates.location);
    }

    // Update battery if provided
    if (updates.battery) {
      device.updateBattery(updates.battery.level, updates.battery.isCharging);
    }

    device.lastSeen = new Date();
    await device.save();

    // Emit device update event
    emitEvent('device:updated', { device }, `device:${device._id}`);

    // Log activity
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'device_update',
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Device updated successfully',
      data: device,
    });
  } catch (error) {
    logger.error('Update device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device',
    });
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const device = await Device.findOne({ _id: id, deletedAt: null });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check ownership
    const user = await User.findById(userId);
    if (device.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Soft delete
    device.deletedAt = new Date();
    device.status = 'offline';
    await device.save();

    // Emit device deletion event
    emitEvent('device:deleted', { deviceId: device._id });

    // Log activity
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'device_delete',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Device deleted successfully',
    });
  } catch (error) {
    logger.error('Delete device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete device',
    });
  }
};

exports.lockDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const device = await Device.findOne({ _id: id, deletedAt: null });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check ownership
    const user = await User.findById(userId);
    if (device.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Lock device
    device.status = 'maintenance';
    await device.save();

    // Emit lock event
    emitEvent('device:locked', { deviceId: device._id }, `device:${device._id}`);

    // Log activity
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'device_lock',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Device locked successfully',
      data: device,
    });
  } catch (error) {
    logger.error('Lock device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock device',
    });
  }
};

exports.unlockDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const device = await Device.findOne({ _id: id, deletedAt: null });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check ownership
    const user = await User.findById(userId);
    if (device.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Unlock device
    device.status = 'online';
    await device.save();

    // Emit unlock event
    emitEvent('device:unlocked', { deviceId: device._id }, `device:${device._id}`);

    // Log activity
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'device_unlock',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Device unlocked successfully',
      data: device,
    });
  } catch (error) {
    logger.error('Unlock device error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock device',
    });
  }
};

exports.activateLostMode = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, contactInfo } = req.body;
    const userId = req.userId;

    const device = await Device.findOne({ _id: id, deletedAt: null });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check ownership
    const user = await User.findById(userId);
    if (device.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Activate lost mode
    await device.activateLostMode(message, contactInfo);

    // Emit lost mode event
    emitEvent('device:lost_mode', { deviceId: device._id }, `device:${device._id}`);

    // Log activity
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'lost_mode_activate',
      details: { message, contactInfo },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Lost mode activated',
      data: device,
    });
  } catch (error) {
    logger.error('Activate lost mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate lost mode',
    });
  }
};

exports.deactivateLostMode = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const device = await Device.findOne({ _id: id, deletedAt: null });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check ownership
    const user = await User.findById(userId);
    if (device.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Deactivate lost mode
    await device.deactivateLostMode();

    // Emit lost mode event
    emitEvent('device:lost_mode_deactivated', { deviceId: device._id }, `device:${device._id}`);

    // Log activity
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'lost_mode_deactivate',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Lost mode deactivated',
      data: device,
    });
  } catch (error) {
    logger.error('Deactivate lost mode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate lost mode',
    });
  }
};

exports.updateDeviceStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status, ...data } = req.body;

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Update status
    device.status = status;
    device.lastSeen = new Date();

    // Update additional data
    if (data.battery) device.battery = data.battery;
    if (data.location) device.location = data.location;
    if (data.network) device.network = data.network;
    if (data.storage) device.storage = data.storage;

    await device.save();

    // Emit status update event
    emitEvent('device:status', { deviceId: device._id, status }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Device status updated',
      data: device,
    });
  } catch (error) {
    logger.error('Update device status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device status',
    });
  }
};
