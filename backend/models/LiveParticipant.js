const pool = require('../config/db');

class LiveParticipant {
    static async join(liveId, userId) {
        const existing = await pool.query('SELECT * FROM live_participants WHERE live_id = $1 AND user_id = $2 AND left_at IS NULL', [liveId, userId]);
        if (existing.rows.length > 0) return null;
        const oldParticipant = await pool.query('SELECT * FROM live_participants WHERE live_id = $1 AND user_id = $2 AND left_at IS NOT NULL', [liveId, userId]);
        if (oldParticipant.rows.length > 0) {
            await pool.query('UPDATE live_participants SET left_at = NULL, joined_at = CURRENT_TIMESTAMP WHERE id = $1', [oldParticipant.rows[0].id]);
        } else {
            await pool.query('INSERT INTO live_participants (live_id, user_id) VALUES ($1, $2)', [liveId, userId]);
        }
        const count = await pool.query('SELECT COUNT(*) as count FROM live_participants WHERE live_id = $1 AND left_at IS NULL', [liveId]);
        await pool.query('UPDATE lives SET participants_count = $1 WHERE id = $2', [parseInt(count.rows[0].count), liveId]);
        return { joined: true, participantsCount: parseInt(count.rows[0].count) };
    }

    static async leave(liveId, userId) {
        const result = await pool.query('UPDATE live_participants SET left_at = CURRENT_TIMESTAMP WHERE live_id = $1 AND user_id = $2 AND left_at IS NULL RETURNING *', [liveId, userId]);
        if (result.rows.length === 0) return null;
        const count = await pool.query('SELECT COUNT(*) as count FROM live_participants WHERE live_id = $1 AND left_at IS NULL', [liveId]);
        await pool.query('UPDATE lives SET participants_count = $1 WHERE id = $2', [parseInt(count.rows[0].count), liveId]);
        return { left: true, participantsCount: parseInt(count.rows[0].count) };
    }

    static async getParticipantsCount(liveId) {
        const result = await pool.query('SELECT participants_count FROM lives WHERE id = $1', [liveId]);
        return parseInt(result.rows[0]?.participants_count || 0);
    }

    static async isParticipant(liveId, userId) {
        const result = await pool.query('SELECT * FROM live_participants WHERE live_id = $1 AND user_id = $2 AND left_at IS NULL', [liveId, userId]);
        return result.rows.length > 0;
    }

    static async getParticipants(liveId, limit = 50, offset = 0) {
        const result = await pool.query(
            `SELECT u.id, u.username, u.avatar, lp.joined_at FROM live_participants lp JOIN users u ON lp.user_id = u.id WHERE lp.live_id = $1 AND lp.left_at IS NULL ORDER BY lp.joined_at ASC LIMIT $2 OFFSET $3`,
            [liveId, limit, offset]
        );
        return result.rows;
    }
}

module.exports = LiveParticipant;