const AuditLog = require('../models/AuditLog');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

class AuditService {
  // Log activity
  static async log(data) {
    try {
      const log = await ActivityLog.log(data);
      return log;
    } catch (error) {
      logger.error('AuditService.log error:', error);
      throw error;
    }
  }

  // Log audit
  static async logAudit(data) {
    try {
      const log = await AuditLog.log(data);
      return log;
    } catch (error) {
      logger.error('AuditService.logAudit error:', error);
      throw error;
    }
  }

  // Get user activities
  static async getUserActivities(userId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const activities = await ActivityLog.find({ userId, deletedAt: null })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('deviceId', 'name deviceId');

      const total = await ActivityLog.countDocuments({ userId, deletedAt: null });

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('AuditService.getUserActivities error:', error);
      throw error;
    }
  }

  // Get device activities
  static async getDeviceActivities(deviceId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const activities = await ActivityLog.find({ deviceId, deletedAt: null })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email');

      const total = await ActivityLog.countDocuments({ deviceId, deletedAt: null });

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('AuditService.getDeviceActivities error:', error);
      throw error;
    }
  }

  // Get audit logs
  static async getAuditLogs(query = {}, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const logs = await AuditLog.find({ ...query, deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email');

      const total = await AuditLog.countDocuments({ ...query, deletedAt: null });

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('AuditService.getAuditLogs error:', error);
      throw error;
    }
  }

  // Get audit stats
  static async getAuditStats() {
    try {
      const stats = await AuditLog.getStats();
      return stats;
    } catch (error) {
      logger.error('AuditService.getAuditStats error:', error);
      throw error;
    }
  }

  // Cleanup old logs
  static async cleanupLogs(days = 90) {
    try {
      const result = await ActivityLog.cleanup(days);
      const auditResult = await AuditLog.cleanup(days);
      return {
        activityLogs: result,
        auditLogs: auditResult,
      };
    } catch (error) {
      logger.error('AuditService.cleanupLogs error:', error);
      throw error;
    }
  }

  // Get user activity summary
  static async getUserActivitySummary(userId) {
    try {
      const summary = await ActivityLog.aggregate([
        { $match: { userId, deletedAt: null } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastOccurrence: { $max: '$timestamp' },
          },
        },
        { $sort: { count: -1 } },
      ]);
      return summary;
    } catch (error) {
      logger.error('AuditService.getUserActivitySummary error:', error);
      throw error;
    }
  }
}

module.exports = AuditService;
