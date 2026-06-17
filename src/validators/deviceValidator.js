const { body, param } = require('express-validator');

const validateDevice = [
  body('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required')
    .isLength({ min: 8, max: 36 }).withMessage('Device ID must be 8-36 characters'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Device name cannot exceed 100 characters'),
  
  body('type')
    .optional()
    .isIn(['android', 'ios', 'windows', 'macos', 'web']).withMessage('Invalid device type'),
  
  body('model')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Model cannot exceed 50 characters'),
  
  body('manufacturer')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Manufacturer cannot exceed 50 characters'),
  
  body('osVersion')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('OS version cannot exceed 20 characters'),
  
  body('appVersion')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('App version cannot exceed 20 characters'),
];

const validateDeviceUpdate = [
  param('id')
    .isMongoId().withMessage('Invalid device ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Device name cannot exceed 100 characters'),
  
  body('status')
    .optional()
    .isIn(['online', 'offline', 'maintenance']).withMessage('Invalid status'),
  
  body('type')
    .optional()
    .isIn(['android', 'ios', 'windows', 'macos', 'web']).withMessage('Invalid device type'),
  
  body('settings')
    .optional()
    .isObject().withMessage('Settings must be an object'),
  
  body('permissions')
    .optional()
    .isObject().withMessage('Permissions must be an object'),
];

const validateDeviceStatus = [
  param('deviceId')
    .trim()
    .notEmpty().withMessage('Device ID is required'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['online', 'offline', 'maintenance']).withMessage('Invalid status'),
  
  body('battery')
    .optional()
    .isObject().withMessage('Battery data must be an object'),
  
  body('location')
    .optional()
    .isObject().withMessage('Location data must be an object'),
  
  body('network')
    .optional()
    .isObject().withMessage('Network data must be an object'),
  
  body('storage')
    .optional()
    .isObject().withMessage('Storage data must be an object'),
];

const validateLostMode = [
  param('id')
    .isMongoId().withMessage('Invalid device ID'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),
  
  body('contactInfo')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Contact info cannot exceed 100 characters'),
];

module.exports = {
  validateDevice,
  validateDeviceUpdate,
  validateDeviceStatus,
  validateLostMode,
};
