const pool = require('../config/db');

class PasswordReset {
    static async create(userId, code) {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
        const result = await pool.query(
            'INSERT INTO password_resets (user_id, code, expires_at) VALUES ($1, $2, $3) RETURNING *',
            [userId, code, expiresAt]
        );
        return result.rows[0];
    }

    static async findByCode(code) {
        const result = await pool.query(
            'SELECT * FROM password_resets WHERE code = $1 AND expires_at > NOW()',
            [code]
        );
        return result.rows[0];
    }

    static async deleteByUserId(userId) {
        await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    }
}

module.exports = PasswordReset;