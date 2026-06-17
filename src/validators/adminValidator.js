const { body, param, query } = require('express-validator');

const validateUserCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  body('role')
    .optional()
    .isIn(['admin', 'reseller', 'user']).withMessage('Invalid role'),
  
  body('licenseType')
    .optional()
    .isIn(['reseller', 'user_1year', 'user_30days']).withMessage('Invalid license type'),
];

const validateUserUpdate = [
  param('id')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('role')
    .optional()
    .isIn(['admin', 'reseller', 'user']).withMessage('Invalid role'),
  
  body('status')
    .optional()
    .isIn(['active', 'suspended']).withMessage('Invalid status'),
  
  body('deviceLimit')
    .optional()
    .isInt({ min: 0 }).withMessage('Device limit must be a positive integer'),
  
  body('license')
    .optional()
    .isObject().withMessage('License must be an object'),
];

const validateLicenseCreate = [
  body('userId')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('type')
    .notEmpty().withMessage('License type is required')
    .isIn(['reseller', 'user_1year', 'user_30days']).withMessage('Invalid license type'),
  
  body('durationDays')
    .notEmpty().withMessage('Duration is required')
    .isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
];

const validateEnrollmentPinCreate = [
  body('userId')
    .isMongoId().withMessage('Invalid user ID'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
];

const validateSystemSettings = [
  body('maintenance')
    .optional()
    .isBoolean().withMessage('Maintenance must be a boolean'),
  
  body('maintenanceMessage')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Maintenance message cannot exceed 500 characters'),
  
  body('registrationEnabled')
    .optional()
    .isBoolean().withMessage('Registration enabled must be a boolean'),
  
  body('maxDevicesPerUser')
    .optional()
    .isInt({ min: 0 }).withMessage('Max devices per user must be a positive integer'),
  
  body('sessionTimeout')
    .optional()
    .isInt({ min: 60 }).withMessage('Session timeout must be at least 60 seconds'),
  
  body('backupEnabled')
    .optional()
    .isBoolean().withMessage('Backup enabled must be a boolean'),
  
  body('encryptionEnabled')
    .optional()
    .isBoolean().withMessage('Encryption enabled must be a boolean'),
  
  body('auditLogEnabled')
    .optional()
    .isBoolean().withMessage('Audit log enabled must be a boolean'),
];

const validateAuditLogQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('userId')
    .optional()
    .isMongoId().withMessage('Invalid user ID'),
  
  query('deviceId')
    .optional()
    .isMongoId().withMessage('Invalid device ID'),
  
  query('action')
    .optional()
    .trim()
    .notEmpty().withMessage('Action cannot be empty'),
  
  query('status')
    .optional()
    .isIn(['success', 'failure']).withMessage('Invalid status'),
  
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
];

module.exports = {
  validateUserCreate,
  validateUserUpdate,
  validateLicenseCreate,
  validateEnrollmentPinCreate,
  validateSystemSettings,
  validateAuditLogQuery,
};
