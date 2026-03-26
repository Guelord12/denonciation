const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, notificationController.getNotifications.bind(notificationController));
router.put('/:id/read', authMiddleware, notificationController.markAsRead.bind(notificationController));
router.put('/read-all', authMiddleware, notificationController.markAllAsRead.bind(notificationController));

// Route compteur
router.get('/unread-count', authMiddleware, async (req, res) => {
    const count = await require('../models/Notification').countUnread(req.user.id);
    res.json({ count });
});

module.exports = router;