const { body, validationResult } = require('express-validator');

const validateRegistration = [
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
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  
  body('role')
    .optional()
    .isIn(['admin', 'reseller', 'user']).withMessage('Invalid role'),
  
  body('licenseType')
    .optional()
    .isIn(['reseller', 'user_1year', 'user_30days']).withMessage('Invalid license type'),
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const validatePin = [
  body('pin')
    .notEmpty().withMessage('PIN is required')
    .isLength({ min: 6, max: 8 }).withMessage('PIN must be 6-8 characters')
    .matches(/^[A-Z0-9]+$/).withMessage('PIN must contain only uppercase letters and numbers'),
  
  body('deviceId')
    .optional()
    .trim()
    .notEmpty().withMessage('Device ID cannot be empty if provided'),
];

const validateRefreshToken = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required'),
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
];

const validateResetPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePin,
  validateRefreshToken,
  validateChangePassword,
  validateResetPassword,
};
