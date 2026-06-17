const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administration endpoints
 */

// User Management
router.get('/users', authMiddleware, isAdmin, adminController.getUsers);
router.post('/users', authMiddleware, isAdmin, adminController.createUser);
router.put('/users/:id', authMiddleware, isAdmin, adminController.updateUser);
router.delete('/users/:id', authMiddleware, isAdmin, adminController.deleteUser);
router.post('/users/:id/suspend', authMiddleware, isAdmin, adminController.suspendUser);
router.post('/users/:id/activate', authMiddleware, isAdmin, adminController.activateUser);

// License Management
router.get('/licenses', authMiddleware, isAdmin, adminController.getLicenses);
router.post('/licenses', authMiddleware, isAdmin, adminController.createLicense);

// Enrollment PIN Management
router.get('/enrollment-pins', authMiddleware, isAdmin, adminController.getEnrollmentPins);
router.post('/enrollment-pins', authMiddleware, isAdmin, adminController.createEnrollmentPin);
router.post('/enrollment-pins/:id/revoke', authMiddleware, isAdmin, adminController.revokeEnrollmentPin);

// System Settings
router.get('/settings', authMiddleware, isAdmin, adminController.getSystemSettings);
router.put('/settings', authMiddleware, isAdmin, adminController.updateSystemSettings);

// Audit Logs
router.get('/audit-logs', authMiddleware, isAdmin, adminController.getAuditLogs);

module.exports = router;
