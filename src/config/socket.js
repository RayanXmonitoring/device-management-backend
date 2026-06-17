const socketIO = require('socket.io');
const { instrument } = require('@socket.io/admin-ui');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

const initSocket = (server) => {
  try {
    io = new socketIO.Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
        credentials: true,
        methods: ['GET', 'POST'],
      },
      path: process.env.SOCKET_PATH || '/socket.io',
      pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
      pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 5000,
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    // Admin UI for monitoring
    instrument(io, {
      auth: false,
      mode: 'development',
    });

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        socket.deviceId = socket.handshake.query.deviceId;

        // Join user's room
        socket.join(`user:${socket.userId}`);

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);

      // Handle device connection
      if (socket.deviceId) {
        socket.join(`device:${socket.deviceId}`);
        io.emit('device:connected', {
          deviceId: socket.deviceId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
        if (socket.deviceId) {
          io.emit('device:disconnected', {
            deviceId: socket.deviceId,
            userId: socket.userId,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });

    // Store io instance
    global.io = io;

    return io;
  } catch (error) {
    logger.error('Socket initialization failed:', error);
    throw error;
  }
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

const emitEvent = (event, data, room = null) => {
  try {
    const socketIO = getIO();
    if (room) {
      socketIO.to(room).emit(event, data);
    } else {
      socketIO.emit(event, data);
    }
  } catch (error) {
    logger.error('Error emitting socket event:', error);
  }
};

module.exports = { initSocket, getIO, emitEvent };
