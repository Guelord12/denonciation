const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, notificationController.getNotifications.bind(notificationController));
router.put('/:id/read', authMiddleware, notificationController.markAsRead.bind(notificationController));
router.put('/read-all', authMiddleware, notificationController.markAllAsRead.bind(notificationController));

module.exports = router;