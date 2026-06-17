const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.defaultTTL = 300; // 5 minutes
  }

  async getClient() {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async get(key) {
    try {
      const client = await this.getClient();
      if (!client) return null;

      const value = await client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const client = await this.getClient();
      if (!client) return false;

      await client.set(key, JSON.stringify(value), {
        EX: ttl,
      });
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      const client = await this.getClient();
      if (!client) return false;

      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern) {
    try {
      const client = await this.getClient();
      if (!client) return false;

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const client = await this.getClient();
      if (!client) return false;

      return await client.exists(key);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key, by = 1) {
    try {
      const client = await this.getClient();
      if (!client) return null;

      return await client.incrBy(key, by);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  async expire(key, ttl) {
    try {
      const client = await this.getClient();
      if (!client) return false;

      await client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  // Cache device data
  async cacheDevice(deviceId, deviceData) {
    const key = `device:${deviceId}`;
    return this.set(key, deviceData, 300); // 5 minutes
  }

  async getCachedDevice(deviceId) {
    const key = `device:${deviceId}`;
    return this.get(key);
  }

  // Cache user data
  async cacheUser(userId, userData) {
    const key = `user:${userId}`;
    return this.set(key, userData, 600); // 10 minutes
  }

  async getCachedUser(userId) {
    const key = `user:${userId}`;
    return this.get(key);
  }

  // Cache dashboard stats
  async cacheDashboardStats(userId, stats) {
    const key = `dashboard:${userId}`;
    return this.set(key, stats, 60); // 1 minute
  }

  async getCachedDashboardStats(userId) {
    const key = `dashboard:${userId}`;
    return this.get(key);
  }

  // Clear all cache
  async clearAll() {
    try {
      const client = await this.getClient();
      if (!client) return false;

      await client.flushAll();
      logger.info('Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error('Clear cache error:', error);
      return false;
    }
  }
}

module.exports = new CacheService();
