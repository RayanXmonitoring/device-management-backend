const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

// Default rate limiter using express-rate-limit
const defaultLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
});

// Rate limiter with Redis store
const redisRateLimiter = async (req, res, next) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return next(); // Skip rate limiting if Redis is not available
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = `rate_limit:${ip}:${req.path}`;
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

    const current = await redisClient.get(key);
    const requests = current ? parseInt(current) : 0;

    if (requests >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Increment request count
    const pipeline = redisClient.multi();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    await pipeline.exec();

    next();
  } catch (error) {
    // If Redis fails, allow the request
    console.error('Rate limiting error:', error);
    next();
  }
};

// Combined rate limiter middleware
const rateLimitMiddleware = (req, res, next) => {
  // Use Redis rate limiter if available
  if (process.env.REDIS_URL) {
    return redisRateLimiter(req, res, next);
  }
  // Fallback to express-rate-limit
  return defaultLimiter(req, res, next);
};

module.exports = {
  defaultLimiter,
  authLimiter,
  redisRateLimiter,
  rateLimitMiddleware,
};
