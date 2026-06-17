const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const { emitEvent } = require('../config/socket');
const logger = require('../utils/logger');

exports.syncData = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { data } = req.body;
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

    // Process sync data
    // Here you would process and store the synced data

    // Log sync
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'data_sync',
      details: { 
        dataSize: JSON.stringify(data).length,
        timestamp: new Date().toISOString(),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Data synced successfully',
      data: {
        deviceId: device._id,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Sync data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync data',
    });
  }
};

exports.backupData = async (req, res) => {
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

    // Log backup
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'data_backup',
      details: { 
        timestamp: new Date().toISOString(),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit backup request to device
    emitEvent('backup:request', { deviceId }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Backup request sent',
      data: {
        deviceId: device._id,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Backup data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backup data',
    });
  }
};

exports.restoreData = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { backupId } = req.body;
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

    // Log restore
    await ActivityLog.log({
      userId,
      deviceId: device._id,
      action: 'data_restore',
      details: { 
        backupId,
        timestamp: new Date().toISOString(),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit restore request to device
    emitEvent('restore:request', { deviceId, backupId }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Restore request sent',
      data: {
        deviceId: device._id,
        backupId,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Restore data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore data',
    });
  }
};

exports.getBrowserArtifacts = async (req, res) => {
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
      action: 'browser_artifacts_access',
      details: { 
        timestamp: new Date().toISOString(),
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit browser artifacts request to device
    emitEvent('browser:artifacts', { deviceId }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'Browser artifacts request sent',
      data: {
        deviceId: device._id,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get browser artifacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get browser artifacts',
    });
  }
};

exports.getFiles = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { path, limit = 50 } = req.query;
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
      action: 'file_access',
      details: { path, limit },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Emit file list request to device
    emitEvent('files:request', { deviceId, path, limit }, `device:${device._id}`);

    res.json({
      success: true,
      message: 'File list request sent',
      data: {
        deviceId: device._id,
        path,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get files',
    });
  }
};
