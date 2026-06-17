const Device = require('../models/Device');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { emitEvent } = require('../config/socket');
const { generatePin } = require('../utils/encryption');
const logger = require('../utils/logger');

class DeviceService {
  // Register device
  static async registerDevice(userId, deviceData) {
    try {
      const { deviceId, name, type, model, manufacturer, osVersion, appVersion } = deviceData;

      // Check if device already exists
      const existingDevice = await Device.findOne({ deviceId, deletedAt: null });
      if (existingDevice) {
        throw new Error('Device already registered');
      }

      // Check device limit
      const user = await User.findById(userId);
      const deviceCount = await Device.countDocuments({ userId });
      if (deviceCount >= user.deviceLimit) {
        throw new Error('Device limit exceeded');
      }

      // Generate enrollment PIN
      const enrollmentPin = generatePin(6);

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
          registeredIP: deviceData.ip || 'unknown',
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
      });

      return { device, enrollmentPin };
    } catch (error) {
      logger.error('DeviceService.registerDevice error:', error);
      throw error;
    }
  }

  // Get device by ID
  static async getDeviceById(deviceId, userId) {
    try {
      const device = await Device.findOne({
        _id: deviceId,
        deletedAt: null,
      }).populate('userId', 'name email');

      if (!device) {
        throw new Error('Device not found');
      }

      // Check access
      const user = await User.findById(userId);
      if (device.userId._id.toString() !== userId && user.role !== 'admin') {
        throw new Error('Access denied');
      }

      return device;
    } catch (error) {
      logger.error('DeviceService.getDeviceById error:', error);
      throw error;
    }
  }

  // Get user devices
  static async getUserDevices(userId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const devices = await Device.find({ userId, deletedAt: null })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Device.countDocuments({ userId, deletedAt: null });

      return {
        devices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('DeviceService.getUserDevices error:', error);
      throw error;
    }
  }

  // Update device
  static async updateDevice(deviceId, userId, updates) {
    try {
      const device = await Device.findOne({ _id: deviceId, deletedAt: null });
      if (!device) {
        throw new Error('Device not found');
      }

      // Check ownership
      const user = await User.findById(userId);
      if (device.userId.toString() !== userId && user.role !== 'admin') {
        throw new Error('Access denied');
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
        await device.updateLocation(updates.location);
      }

      // Update battery if provided
      if (updates.battery) {
        await device.updateBattery(updates.battery.level, updates.battery.isCharging);
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
      });

      return device;
    } catch (error) {
      logger.error('DeviceService.updateDevice error:', error);
      throw error;
    }
  }

  // Delete device
  static async deleteDevice(deviceId, userId) {
    try {
      const device = await Device.findOne({ _id: deviceId, deletedAt: null });
      if (!device) {
        throw new Error('Device not found');
      }

      // Check ownership
      const user = await User.findById(userId);
      if (device.userId.toString() !== userId && user.role !== 'admin') {
        throw new Error('Access denied');
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
      });

      return { success: true };
    } catch (error) {
      logger.error('DeviceService.deleteDevice error:', error);
      throw error;
    }
  }

  // Lock device
  static async lockDevice(deviceId, userId) {
    try {
      const device = await Device.findOne({ _id: deviceId, deletedAt: null });
      if (!device) {
        throw new Error('Device not found');
      }

      // Check ownership
      const user = await User.findById(userId);
      if (device.userId.toString() !== userId && user.role !== 'admin') {
        throw new Error('Access denied');
      }

      device.status = 'maintenance';
      await device.save();

      // Emit lock event
      emitEvent('device:locked', { deviceId: device._id }, `device:${device._id}`);

      // Log activity
      await ActivityLog.log({
        userId,
        deviceId: device._id,
        action: 'device_lock',
      });

      return device;
    } catch (error) {
      logger.error('DeviceService.lockDevice error:', error);
      throw error;
    }
  }

  // Unlock device
  static async unlockDevice(deviceId, userId) {
    try {
      const device = await Device.findOne({ _id: deviceId, deletedAt: null });
      if (!device) {
        throw new Error('Device not found');
      }

      // Check ownership
      const user = await User.findById(userId);
      if (device.userId.toString() !== userId && user.role !== 'admin') {
        throw new Error('Access denied');
      }

      device.status = 'online';
      await device.save();

      // Emit unlock event
      emitEvent('device:unlocked', { deviceId: device._id }, `device:${device._id}`);

      // Log activity
      await ActivityLog.log({
        userId,
        deviceId: device._id,
        action: 'device_unlock',
      });

      return device;
    } catch (error) {
      logger.error('DeviceService.unlockDevice error:', error);
      throw error;
    }
  }

  // Activate lost mode
  static async activateLostMode(deviceId, userId, message, contactInfo) {
    try {
      const device = await Device.findOne({ _id: deviceId, deletedAt: null });
      if (!device) {
        throw new Error('Device not found');
      }

      // Check ownership
      const user = await User.findById(userId);
      if (device.userId.toString() !== userId && user.role !== 'admin') {
        throw new Error('Access denied');
      }

      await device.activateLostMode(message, contactInfo);

      // Emit lost mode event
      emitEvent('device:lost_mode', { deviceId: device._id }, `device:${device._id}`);

      // Log activity
      await ActivityLog.log({
        userId,
        deviceId: device._id,
        action: 'lost_mode_activate',
        details: { message, contactInfo },
      });

      return device;
    } catch (error) {
      logger.error('DeviceService.activateLostMode error:', error);
      throw error;
    }
  }

  // Deactivate lost mode
  static async deactivateLostMode(deviceId, userId) {
    try {
      const device = await Device.findOne({ _id: deviceId, deletedAt: null });
      if (!device) {
        throw new Error('Device not found');
      }

      // Check ownership
      const user = await User.findById(userId);
      if (device.userId.toString() !== userId && user.role !== 'admin') {
        throw new Error('Access denied');
      }

      await device.deactivateLostMode();

      // Emit lost mode event
      emitEvent('device:lost_mode_deactivated', { deviceId: device._id }, `device:${device._id}`);

      // Log activity
      await ActivityLog.log({
        userId,
        deviceId: device._id,
        action: 'lost_mode_deactivate',
      });

      return device;
    } catch (error) {
      logger.error('DeviceService.deactivateLostMode error:', error);
      throw error;
    }
  }

  // Update device status
  static async updateDeviceStatus(deviceId, status, metadata = {}) {
    try {
      const device = await Device.findOne({ deviceId });
      if (!device) {
        throw new Error('Device not found');
      }

      device.status = status;
      device.lastSeen = new Date();

      // Update additional metadata
      if (metadata.battery) device.battery = metadata.battery;
      if (metadata.location) device.location = metadata.location;
      if (metadata.network) device.network = metadata.network;
      if (metadata.storage) device.storage = metadata.storage;

      await device.save();

      // Emit status update event
      emitEvent('device:status', { deviceId: device._id, status }, `device:${device._id}`);

      return device;
    } catch (error) {
      logger.error('DeviceService.updateDeviceStatus error:', error);
      throw error;
    }
  }
}

module.exports = DeviceService;
