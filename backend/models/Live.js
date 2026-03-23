const pool = require('../config/db');

class Live {
    static async create(userId, titre, description, isPremium = false) {
        const streamKey = `live_${userId}_${Date.now()}`;
        const result = await pool.query(
            'INSERT INTO lives (user_id, titre, description, is_premium, stream_key, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userId, titre, description, isPremium, streamKey, 'upcoming']
        );
        return result.rows[0];
    }

    static async getActiveLives() {
        const result = await pool.query(
            `SELECT l.*, u.username, u.avatar FROM lives l JOIN users u ON l.user_id = u.id WHERE l.status = 'live' ORDER BY l.started_at DESC`
        );
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT l.*, u.username, u.avatar, u.is_premium as user_is_premium FROM lives l JOIN users u ON l.user_id = u.id WHERE l.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async updateStatus(id, status) {
        const result = await pool.query(
            `UPDATE lives SET status = $1, started_at = CASE WHEN $1 = 'live' AND started_at IS NULL THEN CURRENT_TIMESTAMP ELSE started_at END, ended_at = CASE WHEN $1 = 'ended' THEN CURRENT_TIMESTAMP ELSE ended_at END WHERE id = $2 RETURNING *`,
            [status, id]
        );
        return result.rows[0];
    }

    static async delete(id, userId) {
        const result = await pool.query('DELETE FROM lives WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        return result.rows[0];
    }
}

module.exports = Live;