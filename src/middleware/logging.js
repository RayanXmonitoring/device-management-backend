const logger = require('../utils/logger');
const AuditLog = require('../models/AuditLog');

const loggingMiddleware = async (req, res, next) => {
  // Store start time
  const startTime = Date.now();

  // Store original send function
  const originalSend = res.send;

  // Override send function to capture response
  res.send = function(data) {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Get response status
    const statusCode = res.statusCode;

    // Log request details
    const logData = {
      userId: req.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      method: req.method,
      path: req.path,
      statusCode,
      responseTime,
    };

    // Log to console
    logger.info(`${req.method} ${req.path}`, {
      statusCode,
      responseTime,
      userId: req.userId,
      ip: req.ip,
    });

    // Log to database for audit purposes (async)
    if (process.env.ENABLE_AUDIT_LOG !== 'false') {
      try {
        const auditLog = new AuditLog({
          userId: req.userId || 'system',
          userEmail: req.user?.email || 'system',
          userRole: req.user?.role || 'system',
          action: req.method,
          resource: req.path.split('/')[1] || 'unknown',
          method: req.method,
          path: req.path,
          statusCode,
          responseTime,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          userAgent: req.headers['user-agent'],
          metadata: {
            query: req.query,
            params: req.params,
            body: req.method !== 'GET' ? req.body : undefined,
          },
        });

        // Save audit log asynchronously
        auditLog.save().catch(err => {
          logger.error('Failed to save audit log:', err);
        });
      } catch (error) {
        logger.error('Audit log error:', error);
      }
    }

    // Call original send function
    return originalSend.call(this, data);
  };

  next();
};

// Error logging middleware
const errorLoggingMiddleware = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.userId,
    ip: req.ip,
  });

  next(err);
};

module.exports = {
  loggingMiddleware,
  errorLoggingMiddleware,
};
