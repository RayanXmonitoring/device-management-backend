const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');
const logger = require('../utils/logger');

class CleanupJob {
  async run() {
    try {
      // Get settings
      const settings = await SystemSetting.getSettings();
      
      // Cleanup activity logs
      const activityLogsRetention = settings.auditLogRetentionDays || 90;
      const activityLogsResult = await ActivityLog.cleanup(activityLogsRetention);
      logger.info(`Cleaned up ${activityLogsResult.deletedCount} activity logs`);

      // Cleanup audit logs
      const auditLogsResult = await AuditLog.cleanup(activityLogsRetention);
      logger.info(`Cleaned up ${auditLogsResult.deletedCount} audit logs`);

      // Cleanup notifications
      const notificationsRetention = settings.notificationRetentionDays || 30;
      const notificationsResult = await Notification.cleanupExpired();
      logger.info(`Cleaned up ${notificationsResult.modifiedCount} notifications`);

      // Cleanup expired enrollment pins
      const EnrollmentPin = require('../models/EnrollmentPin');
      const pinsResult = await EnrollmentPin.cleanupExpired();
      logger.info(`Cleaned up ${pinsResult.modifiedCount} expired enrollment pins`);

      return {
        activityLogs: activityLogsResult.deletedCount || 0,
        auditLogs: auditLogsResult.deletedCount || 0,
        notifications: notificationsResult.modifiedCount || 0,
        pins: pinsResult.modifiedCount || 0,
      };
    } catch (error) {
      logger.error('Cleanup job error:', error);
      throw error;
    }
  }
}

module.exports = new CleanupJob();
