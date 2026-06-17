const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { authMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Data
 *   description: Data management endpoints
 */

router.post('/sync/:deviceId', authMiddleware, dataController.syncData);
router.post('/backup/:deviceId', authMiddleware, dataController.backupData);
router.post('/restore/:deviceId', authMiddleware, dataController.restoreData);
router.get('/browser-artifacts/:deviceId', authMiddleware, dataController.getBrowserArtifacts);
router.get('/files/:deviceId', authMiddleware, dataController.getFiles);

module.exports = router;
