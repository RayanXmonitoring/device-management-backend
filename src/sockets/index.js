const { getIO } = require('../config/socket');
const deviceSocket = require('./deviceSocket');
const notificationSocket = require('./notificationSocket');
const logger = require('../utils/logger');

const initSocketHandlers = () => {
  const io = getIO();
  
  // Initialize socket handlers
  deviceSocket(io);
  notificationSocket(io);

  // Global socket event handlers
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

module.exports = { initSocketHandlers };
