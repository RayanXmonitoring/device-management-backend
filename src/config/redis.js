const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isRedisEnabled = true;

const connectRedis = async () => {
  try {
    // Jika tidak ada REDIS_URL, skip
    if (!process.env.REDIS_URL) {
      logger.warn('REDIS_URL not set, Redis disabled');
      isRedisEnabled = false;
      return null;
    }

    const options = {
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            logger.warn('Redis max reconnection attempts reached');
            return new Error('Redis max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
        // Railway Redis might use TLS
        tls: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : undefined,
      },
    };

    redisClient = redis.createClient(options);

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err.message);
      isRedisEnabled = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
      isRedisEnabled = true;
    });

    redisClient.on('ready', () => {
      logger.info('Redis is ready');
      isRedisEnabled = true;
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
      isRedisEnabled = false;
    });

    await redisClient.connect();

    // Test connection
    await redisClient.ping();
    logger.info('Redis ping successful');

    return redisClient;
  } catch (error) {
    logger.warn('Redis connection failed, continuing without Redis:', error.message);
    isRedisEnabled = false;
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient || !isRedisEnabled) {
    return null;
  }
  return redisClient;
};

const isRedisConnected = () => {
  return isRedisEnabled && redisClient && redisClient.isReady;
};

const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis disconnected successfully');
      redisClient = null;
      isRedisEnabled = false;
    }
  } catch (error) {
    logger.error('Error disconnecting Redis:', error);
  }
};

// Health check
const healthCheck = async () => {
  if (!isRedisEnabled || !redisClient) {
    return { status: 'disabled' };
  }
  try {
    await redisClient.ping();
    return { status: 'connected' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  disconnectRedis,
  healthCheck,
};
