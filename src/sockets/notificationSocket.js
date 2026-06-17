const Notification = require('../models/Notification');
const logger = require('../utils/logger');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Send notification to user
    socket.on('notification:send', async (data) => {
      try {
        const { userId, type, title, message, priority = 'medium', channels = ['in-app'] } = data;

        // Create notification
        const notification = new Notification({
          userId,
          type,
          title,
          message,
          priority,
          channels,
          isRead: false,
        });

        await notification.save();

        // Emit notification to user's room
        io.to(`user:${userId}`).emit('notification:receive', notification);

        // Send to other channels if specified
        if (channels.includes('email')) {
          // TODO: Send email notification
        }

        if (channels.includes('push')) {
          // TODO: Send push notification
        }

        logger.info(`Notification sent to user ${userId}: ${title}`);
      } catch (error) {
        logger.error('Send notification error:', error);
        socket.emit('notification:error', { message: 'Failed to send notification' });
      }
    });

    // Mark notification as read
    socket.on('notification:read', async (data) => {
      try {
        const { notificationId } = data;
        const userId = socket.userId;

        const notification = await Notification.findOne({ _id: notificationId, userId });
        if (notification) {
          notification.isRead = true;
          notification.readAt = new Date();
          await notification.save();

          // Emit notification read event
          io.to(`user:${userId}`).emit('notification:read', {
            notificationId,
            userId,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error('Mark notification as read error:', error);
        socket.emit('notification:error', { message: 'Failed to mark notification as read' });
      }
    });

    // Mark all notifications as read
    socket.on('notification:read-all', async (data) => {
      try {
        const userId = socket.userId;

        const result = await Notification.updateMany(
          { userId, isRead: false },
          { isRead: true, readAt: new Date() }
        );

        // Emit all read event
        io.to(`user:${userId}`).emit('notification:read-all', {
          userId,
          count: result.modifiedCount,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Mark all notifications as read error:', error);
        socket.emit('notification:error', { message: 'Failed to mark all as read' });
      }
    });

    // Get unread notifications count
    socket.on('notification:unread-count', async (data) => {
      try {
        const userId = socket.userId;

        const count = await Notification.countDocuments({ userId, isRead: false });

        socket.emit('notification:unread-count', {
          userId,
          count,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Get unread count error:', error);
        socket.emit('notification:error', { message: 'Failed to get unread count' });
      }
    });
  });
};
