const pool = require('../config/db');

class Like {
    static async setLike(userId, reportId, type) {
        const existing = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND report_id = $2', [userId, reportId]);
        if (existing.rows.length > 0) {
            await pool.query('UPDATE likes SET type = $1 WHERE user_id = $2 AND report_id = $3', [type, userId, reportId]);
        } else {
            await pool.query('INSERT INTO likes (user_id, report_id, type) VALUES ($1, $2, $3)', [userId, reportId, type]);
        }
        const counts = await pool.query(
            `SELECT COUNT(CASE WHEN type = 'like' THEN 1 END) as likes, COUNT(CASE WHEN type = 'dislike' THEN 1 END) as dislikes FROM likes WHERE report_id = $1`,
            [reportId]
        );
        return { likes: parseInt(counts.rows[0].likes), dislikes: parseInt(counts.rows[0].dislikes) };
    }

    static async removeLike(userId, reportId) {
        const result = await pool.query('DELETE FROM likes WHERE user_id = $1 AND report_id = $2 RETURNING type', [userId, reportId]);
        if (result.rows.length === 0) return null;
        const counts = await pool.query(
            `SELECT COUNT(CASE WHEN type = 'like' THEN 1 END) as likes, COUNT(CASE WHEN type = 'dislike' THEN 1 END) as dislikes FROM likes WHERE report_id = $1`,
            [reportId]
        );
        return { removed: result.rows[0].type, likes: parseInt(counts.rows[0].likes), dislikes: parseInt(counts.rows[0].dislikes) };
    }

    static async getUserLikeStatus(userId, reportId) {
        const result = await pool.query('SELECT type FROM likes WHERE user_id = $1 AND report_id = $2', [userId, reportId]);
        return result.rows[0] || null;
    }
}

module.exports = Like;