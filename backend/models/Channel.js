const pool = require('../config/db');

class Channel {
    static async create(userId, nom, description, categorie) {
        const result = await pool.query(
            'INSERT INTO channels (user_id, nom, description, categorie) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, nom, description, categorie]
        );
        return result.rows[0];
    }

    static async findAll(limit = 50, offset = 0) {
        const result = await pool.query(
            `SELECT c.*, u.username, u.avatar FROM channels c JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    static async findByUser(userId) {
        const result = await pool.query('SELECT * FROM channels WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT c.*, u.username, u.avatar FROM channels c JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async update(id, userId, updates) {
        const allowedFields = ['nom', 'description', 'categorie'];
        const fieldsToUpdate = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) fieldsToUpdate[field] = updates[field];
        }
        if (Object.keys(fieldsToUpdate).length === 0) return null;
        const fields = Object.keys(fieldsToUpdate).map((key, idx) => `${key} = $${idx + 1}`).join(', ');
        const values = [...Object.values(fieldsToUpdate), id, userId];
        const query = `UPDATE channels SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async delete(id, userId) {
        const result = await pool.query('DELETE FROM channels WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        return result.rows[0];
    }

    static async countByCategory() {
        const result = await pool.query('SELECT categorie, COUNT(*) as count FROM channels GROUP BY categorie ORDER BY count DESC');
        return result.rows;
    }
}

module.exports = Channel;