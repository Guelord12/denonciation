const pool = require('../config/db');

class Report {
    static async create(data) {
        const { user_id, titre, description, categorie, preuves, ville_signalement, latitude, longitude } = data;
        const query = `
            INSERT INTO reports (user_id, titre, description, categorie, preuves, ville_signalement, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [user_id, titre, description, categorie, JSON.stringify(preuves || []), ville_signalement || null, latitude || null, longitude || null];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findAll(limit = 50, offset = 0) {
        const query = `
            SELECT r.*, u.username, u.avatar,
                COALESCE((SELECT COUNT(*) FROM likes WHERE report_id = r.id AND type = 'like'), 0) as likes_count,
                COALESCE((SELECT COUNT(*) FROM likes WHERE report_id = r.id AND type = 'dislike'), 0) as dislikes_count,
                COALESCE((SELECT COUNT(*) FROM witnesses WHERE report_id = r.id), 0) as witnesses_count,
                COALESCE((SELECT COUNT(*) FROM comments WHERE report_id = r.id), 0) as comments_count
            FROM reports r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        const result = await pool.query(query, [limit, offset]);
        return result.rows;
    }

    static async findByUser(userId, limit = 50, offset = 0) {
        const query = `
            SELECT r.*, u.username, u.avatar,
                COALESCE((SELECT COUNT(*) FROM likes WHERE report_id = r.id AND type = 'like'), 0) as likes_count,
                COALESCE((SELECT COUNT(*) FROM likes WHERE report_id = r.id AND type = 'dislike'), 0) as dislikes_count,
                COALESCE((SELECT COUNT(*) FROM witnesses WHERE report_id = r.id), 0) as witnesses_count
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [userId, limit, offset]);
        return result.rows;
    }

    static async findById(id) {
        const query = `
            SELECT r.*, u.username, u.avatar,
                COALESCE((SELECT COUNT(*) FROM likes WHERE report_id = r.id AND type = 'like'), 0) as likes_count,
                COALESCE((SELECT COUNT(*) FROM likes WHERE report_id = r.id AND type = 'dislike'), 0) as dislikes_count,
                COALESCE((SELECT COUNT(*) FROM witnesses WHERE report_id = r.id), 0) as witnesses_count
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async delete(id, userId) {
        const result = await pool.query('DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        return result.rows[0];
    }

    static async getCategoryStats() {
        const result = await pool.query('SELECT categorie, COUNT(*) as count FROM reports GROUP BY categorie ORDER BY count DESC');
        return result.rows;
    }

    static async getTopByCategoryAndCity(categorie = null, ville = null, limit = 10) {
        let query = `
            SELECT r.id, r.titre, r.categorie, r.ville_signalement,
                COUNT(DISTINCT l.id) as likes,
                COUNT(DISTINCT w.id) as witnesses,
                (COUNT(DISTINCT l.id) + COUNT(DISTINCT w.id)) as total_interactions
            FROM reports r
            LEFT JOIN likes l ON r.id = l.report_id AND l.type = 'like'
            LEFT JOIN witnesses w ON r.id = w.report_id
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;
        if (categorie) { query += ` AND r.categorie = $${paramIndex}`; values.push(categorie); paramIndex++; }
        if (ville) { query += ` AND r.ville_signalement = $${paramIndex}`; values.push(ville); paramIndex++; }
        query += ` GROUP BY r.id ORDER BY total_interactions DESC LIMIT $${paramIndex}`;
        values.push(limit);
        const result = await pool.query(query, values);
        return result.rows;
    }
}

module.exports = Report;