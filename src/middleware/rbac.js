const logger = require('../utils/logger');

const rbacMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole) && !allowedRoles.includes('*')) {
        logger.warn(`Access denied for user ${req.user._id} with role ${userRole}`);
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization failed',
      });
    }
  };
};

// Check if user is admin
const isAdmin = rbacMiddleware(['admin']);

// Check if user is admin or reseller
const isAdminOrReseller = rbacMiddleware(['admin', 'reseller']);

// Check if user has access to a specific device
const canAccessDevice = async (req, res, next) => {
  try {
    const deviceId = req.params.id || req.params.deviceId;
    const userId = req.userId;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required',
      });
    }

    const Device = require('../models/Device');
    const device = await Device.findOne({
      _id: deviceId,
      deletedAt: null,
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Check if user owns the device or is admin
    if (device.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this device',
      });
    }

    req.device = device;
    next();
  } catch (error) {
    logger.error('Device access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify device access',
    });
  }
};

module.exports = {
  rbacMiddleware,
  isAdmin,
  isAdminOrReseller,
  canAccessDevice,
};
