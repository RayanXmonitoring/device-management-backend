const { body, param, query } = require('express-validator');

// Common validators
const validateId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
];

const validateDeviceId = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required')
    .isLength({ min: 8, max: 36 }).withMessage('Device ID must be 8-36 characters'),
];

const validateUserId = [
  param('userId')
    .isMongoId().withMessage('Invalid user ID'),
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const validateSearchQuery = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query cannot exceed 100 characters'),
  
  query('sortBy')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Sort by field cannot exceed 50 characters'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const start = new Date(req.query.startDate);
        const end = new Date(value);
        if (start > end) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
];

const validateEmail = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

const validatePhone = [
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('id-ID').withMessage('Invalid phone number format'),
];

const validateUrl = [
  body('url')
    .optional()
    .trim()
    .isURL().withMessage('Invalid URL format'),
];

const validateEnum = (field, enumValues, message) => {
  return body(field)
    .optional()
    .isIn(enumValues).withMessage(message || `Invalid value for ${field}`);
};

module.exports = {
  validateId,
  validateDeviceId,
  validateUserId,
  validatePagination,
  validateSearchQuery,
  validateDateRange,
  validateEmail,
  validatePhone,
  validateUrl,
  validateEnum,
};
