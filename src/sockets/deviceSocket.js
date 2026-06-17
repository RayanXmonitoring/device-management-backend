const Device = require('../models/Device');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Handle device registration
    socket.on('device:register', async (data) => {
      try {
        const { deviceId, userId } = data;
        
        // Update device status to online
        const device = await Device.findOne({ deviceId, userId });
        if (device) {
          device.status = 'online';
          device.lastSeen = new Date();
          await device.save();

          // Join device room
          socket.join(`device:${device._id}`);

          // Emit device online event
          io.emit('device:online', {
            deviceId: device._id,
            userId,
            timestamp: new Date().toISOString(),
          });

          // Log activity
          await ActivityLog.log({
            userId,
            deviceId: device._id,
            action: 'device_online',
            ipAddress: socket.handshake.address,
          });

          logger.info(`Device ${deviceId} registered and online`);
        }
      } catch (error) {
        logger.error('Device registration error:', error);
        socket.emit('device:error', { message: 'Failed to register device' });
      }
    });

    // Handle device status update
    socket.on('device:status', async (data) => {
      try {
        const { deviceId, status, ...metadata } = data;
        const userId = socket.userId;

        const device = await Device.findOne({ deviceId, userId });
        if (device) {
          device.status = status;
          device.lastSeen = new Date();
          
          // Update additional metadata
          if (metadata.battery) device.battery = metadata.battery;
          if (metadata.location) device.location = metadata.location;
          if (metadata.network) device.network = metadata.network;
          if (metadata.storage) device.storage = metadata.storage;

          await device.save();

          // Emit status update to all listening clients
          io.emit('device:status', {
            deviceId: device._id,
            status,
            timestamp: new Date().toISOString(),
            metadata,
          });
        }
      } catch (error) {
        logger.error('Device status update error:', error);
        socket.emit('device:error', { message: 'Failed to update status' });
      }
    });

    // Handle device command response
    socket.on('device:command', async (data) => {
      try {
        const { deviceId, command, result } = data;
        const userId = socket.userId;

        const device = await Device.findOne({ deviceId, userId });
        if (device) {
          // Emit command result to dashboard
          io.to(`device:${device._id}`).emit('command:result', {
            deviceId: device._id,
            command,
            result,
            timestamp: new Date().toISOString(),
          });

          // Log command execution
          await ActivityLog.log({
            userId,
            deviceId: device._id,
            action: 'device_command',
            details: { command, result },
          });
        }
      } catch (error) {
        logger.error('Device command error:', error);
        socket.emit('device:error', { message: 'Failed to process command' });
      }
    });

    // Handle heartbeat
    socket.on('heartbeat', async (data) => {
      try {
        const { deviceId } = data;
        const userId = socket.userId;

        const device = await Device.findOne({ deviceId, userId });
        if (device) {
          device.lastSeen = new Date();
          await device.save();
        }
      } catch (error) {
        logger.error('Heartbeat error:', error);
      }
    });
  });
};
