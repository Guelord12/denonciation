const pool = require('../config/db');

class Comment {
    static async create(userId, reportId, contenu, parentId = null) {
        const result = await pool.query(
            'INSERT INTO comments (user_id, report_id, parent_id, contenu) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, reportId, parentId, contenu]
        );
        return result.rows[0];
    }

    static async findByReport(reportId) {
        const result = await pool.query(
            `SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.report_id = $1 ORDER BY c.created_at ASC`,
            [reportId]
        );
        return result.rows;
    }

    static async delete(id, userId) {
        const result = await pool.query('DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        return result.rows[0];
    }

    static async update(id, userId, contenu) {
        const result = await pool.query(
            'UPDATE comments SET contenu = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
            [contenu, id, userId]
        );
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM comments WHERE id = $1', [id]);
        return result.rows[0];
    }
}

module.exports = Comment;