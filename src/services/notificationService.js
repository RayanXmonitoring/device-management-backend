const Notification = require('../models/Notification');
const { emitEvent } = require('../config/socket');
const logger = require('../utils/logger');

class NotificationService {
  // Send notification
  static async sendNotification(data) {
    try {
      const { userId, type, title, message, priority = 'medium', channels = ['in-app'], metadata = {} } = data;

      // Create notification
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        priority,
        channels,
        data: metadata,
        isRead: false,
      });

      await notification.save();

      // Emit notification to user's room
      emitEvent('notification:receive', notification, `user:${userId}`);

      // Send to other channels if specified
      if (channels.includes('email')) {
        // TODO: Send email notification
      }

      if (channels.includes('push')) {
        // TODO: Send push notification
      }

      logger.info(`Notification sent to user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      logger.error('NotificationService.sendNotification error:', error);
      throw error;
    }
  }

  // Get user notifications
  static async getUserNotifications(userId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const notifications = await Notification.find({ userId, deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments({ userId, deletedAt: null });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('NotificationService.getUserNotifications error:', error);
      throw error;
    }
  }

  // Get unread notifications
  static async getUnreadNotifications(userId) {
    try {
      const notifications = await Notification.findUnread(userId);
      return notifications;
    } catch (error) {
      logger.error('NotificationService.getUnreadNotifications error:', error);
      throw error;
    }
  }

  // Get unread count
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({ userId, isRead: false, deletedAt: null });
      return count;
    } catch (error) {
      logger.error('NotificationService.getUnreadCount error:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({ _id: notificationId, userId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.markAsRead();

      // Emit notification read event
      emitEvent('notification:read', {
        notificationId,
        userId,
        timestamp: new Date().toISOString(),
      }, `user:${userId}`);

      return notification;
    } catch (error) {
      logger.error('NotificationService.markAsRead error:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.markAllAsRead(userId);

      // Emit all read event
      emitEvent('notification:read-all', {
        userId,
        count: result.modifiedCount,
        timestamp: new Date().toISOString(),
      }, `user:${userId}`);

      return result;
    } catch (error) {
      logger.error('NotificationService.markAllAsRead error:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOne({ _id: notificationId, userId });
      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.deletedAt = new Date();
      await notification.save();

      return { success: true };
    } catch (error) {
      logger.error('NotificationService.deleteNotification error:', error);
      throw error;
    }
  }

  // Send device notification
  static async sendDeviceNotification(deviceId, userId, type, message, metadata = {}) {
    try {
      const title = `Device ${type.replace('_', ' ')}`;
      return await this.sendNotification({
        userId,
        type,
        title,
        message,
        priority: 'high',
        channels: ['in-app', 'push'],
        metadata: { deviceId, ...metadata },
      });
    } catch (error) {
      logger.error('NotificationService.sendDeviceNotification error:', error);
      throw error;
    }
  }

  // Send license notification
  static async sendLicenseNotification(userId, type, message, metadata = {}) {
    try {
      const title = `License ${type.replace('_', ' ')}`;
      return await this.sendNotification({
        userId,
        type,
        title,
        message,
        priority: 'high',
        channels: ['in-app', 'email'],
        metadata,
      });
    } catch (error) {
      logger.error('NotificationService.sendLicenseNotification error:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
