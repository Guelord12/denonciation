const pool = require('../config/db');

class LiveMessage {
    static async create(liveId, userId, message) {
        const result = await pool.query(
            'INSERT INTO live_messages (live_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
            [liveId, userId, message]
        );
        return result.rows[0];
    }

    static async findByLive(liveId, limit = 100) {
        const result = await pool.query(
            `SELECT lm.*, u.username, u.avatar FROM live_messages lm JOIN users u ON lm.user_id = u.id WHERE lm.live_id = $1 ORDER BY lm.created_at ASC LIMIT $2`,
            [liveId, limit]
        );
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT lm.*, u.username, u.avatar FROM live_messages lm JOIN users u ON lm.user_id = u.id WHERE lm.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM live_messages WHERE id = $1 RETURNING id', [id]);
        return result.rows[0];
    }
}

module.exports = LiveMessage;