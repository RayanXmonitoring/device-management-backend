const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    const options = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Redis max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
      },
    };

    redisClient = redis.createClient(options);

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    // Don't throw error, continue without Redis
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis disconnected successfully');
    }
  } catch (error) {
    logger.error('Error disconnecting Redis:', error);
  }
};

module.exports = { connectRedis, getRedisClient, disconnectRedis };
