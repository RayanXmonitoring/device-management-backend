const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin, canAccessDevice } = require('../middleware/rbac');
const { validateDevice } = require('../validators/deviceValidator');

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Device management endpoints
 */

/**
 * @swagger
 * /devices:
 *   get:
 *     summary: Get all devices
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of devices
 */
router.get('/', authMiddleware, deviceController.getAllDevices);

/**
 * @swagger
 * /devices:
 *   post:
 *     summary: Register new device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [android, ios, windows, macos, web]
 *               model:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               osVersion:
 *                 type: string
 *               appVersion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Device registered successfully
 *       409:
 *         description: Device already exists
 */
router.post('/', authMiddleware, validateDevice, deviceController.registerDevice);

/**
 * @swagger
 * /devices/{id}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device details
 *       404:
 *         description: Device not found
 */
router.get('/:id', authMiddleware, canAccessDevice, deviceController.getDeviceById);

/**
 * @swagger
 * /devices/{id}:
 *   put:
 *     summary: Update device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               model:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               osVersion:
 *                 type: string
 *               appVersion:
 *                 type: string
 *               settings:
 *                 type: object
 *               permissions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Device updated successfully
 *       404:
 *         description: Device not found
 */
router.put('/:id', authMiddleware, canAccessDevice, deviceController.updateDevice);

/**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     summary: Delete device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device deleted successfully
 *       404:
 *         description: Device not found
 */
router.delete('/:id', authMiddleware, canAccessDevice, deviceController.deleteDevice);

/**
 * @swagger
 * /devices/{id}/lock:
 *   post:
 *     summary: Lock device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device locked successfully
 *       404:
 *         description: Device not found
 */
router.post('/:id/lock', authMiddleware, canAccessDevice, deviceController.lockDevice);

/**
 * @swagger
 * /devices/{id}/unlock:
 *   post:
 *     summary: Unlock device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device unlocked successfully
 *       404:
 *         description: Device not found
 */
router.post('/:id/unlock', authMiddleware, canAccessDevice, deviceController.unlockDevice);

/**
 * @swagger
 * /devices/{id}/lost-mode:
 *   post:
 *     summary: Activate lost mode
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               contactInfo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lost mode activated
 *       404:
 *         description: Device not found
 */
router.post('/:id/lost-mode', authMiddleware, canAccessDevice, deviceController.activateLostMode);

/**
 * @swagger
 * /devices/{id}/lost-mode:
 *   delete:
 *     summary: Deactivate lost mode
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lost mode deactivated
 *       404:
 *         description: Device not found
 */
router.delete('/:id/lost-mode', authMiddleware, canAccessDevice, deviceController.deactivateLostMode);

/**
 * @swagger
 * /devices/{deviceId}/status:
 *   put:
 *     summary: Update device status
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, offline, maintenance]
 *               battery:
 *                 type: object
 *               location:
 *                 type: object
 *               network:
 *                 type: object
 *               storage:
 *                 type: object
 *     responses:
 *       200:
 *         description: Device status updated
 *       404:
 *         description: Device not found
 */
router.put('/:deviceId/status', authMiddleware, deviceController.updateDeviceStatus);

module.exports = router;
