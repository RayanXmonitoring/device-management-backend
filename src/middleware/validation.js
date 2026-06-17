const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Log validation errors
    logger.warn('Validation errors:', {
      path: req.path,
      errors: errors.array(),
      body: req.body,
      query: req.query,
    });

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  };
};

const sanitize = (data) => {
  // Remove any malicious content
  if (typeof data === 'string') {
    return data
      .replace(/[<>]/g, '') // Remove < and >
      .trim();
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitize(value);
    }
    return sanitized;
  }
  return data;
};

const validateRequestBody = (schema) => {
  return (req, res, next) => {
    try {
      // Sanitize request body
      req.body = sanitize(req.body);

      // Validate against schema
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
      }

      next();
    } catch (error) {
      logger.error('Request validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Validation failed',
      });
    }
  };
};

module.exports = {
  validate,
  sanitize,
  validateRequestBody,
};
