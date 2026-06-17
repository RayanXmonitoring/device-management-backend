const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics endpoints
 */

router.get('/stats', authMiddleware, dashboardController.getStats);
router.get('/activity', authMiddleware, dashboardController.getActivity);
router.get('/device-stats', authMiddleware, dashboardController.getDeviceStats);

module.exports = router;
