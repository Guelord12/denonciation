const pool = require('../config/db');

class Notification {
    static async create(userId, type, content) {
        const result = await pool.query(
            'INSERT INTO notifications (user_id, type, content) VALUES ($1, $2, $3) RETURNING *',
            [userId, type, content]
        );
        return result.rows[0];
    }

    static async findByUser(userId, limit = 50, offset = 0) {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [userId, limit, offset]
        );
        return result.rows;
    }

    static async markAsRead(id, userId) {
        const result = await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );
        return result.rows[0];
    }

    static async markAllAsRead(userId) {
        const result = await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING *',
            [userId]
        );
        return result.rows;
    }

    static async countUnread(userId) {
        const result = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]);
        return parseInt(result.rows[0].count);
    }
}

module.exports = Notification;