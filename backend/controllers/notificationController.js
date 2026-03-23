const Notification = require('../models/Notification');

class NotificationController {
    async getNotifications(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const notifications = await Notification.findByUser(userId, limit, offset);
            const unreadCount = await Notification.countUnread(userId);
            res.json({ notifications, unreadCount });
        } catch (err) {
            console.error('Erreur récupération notifications:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
        }
    }

    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const notification = await Notification.markAsRead(id, userId);
            if (!notification) return res.status(404).json({ error: 'Notification non trouvée' });
            res.json(notification);
        } catch (err) {
            console.error('Erreur marquage notification:', err);
            res.status(500).json({ error: 'Erreur lors du marquage de la notification' });
        }
    }

    async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;
            const notifications = await Notification.markAllAsRead(userId);
            res.json({ message: 'Toutes les notifications ont été marquées comme lues', count: notifications.length });
        } catch (err) {
            console.error('Erreur marquage toutes notifications:', err);
            res.status(500).json({ error: 'Erreur lors du marquage des notifications' });
        }
    }
}

module.exports = new NotificationController();