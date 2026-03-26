const pool = require('../config/db');

class User {
    static async create(userData) {
        const {
            avatar, nom, prenom, username, date_naissance, pays_residence,
            ville_residence, nationalite, indicatif_telephone, telephone,
            email, mot_de_passe
        } = userData;
        const query = `
            INSERT INTO users (
                avatar, nom, prenom, username, date_naissance,
                pays_residence, ville_residence, nationalite, indicatif_telephone,
                telephone, email, mot_de_passe, is_banned, is_admin, push_token, premium_expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id, username, email, is_premium, avatar, nom, prenom
        `;
        const values = [
            avatar || '/default-avatar.png', nom, prenom, username, date_naissance,
            pays_residence, ville_residence, nationalite, indicatif_telephone,
            telephone, email, mot_de_passe,
            false,          // is_banned
            false,          // is_admin
            null,           // push_token
            null            // premium_expires_at
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findByUsername(username) {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT id, avatar, nom, prenom, username, email, is_premium, is_banned, is_admin,
                    pays_residence, ville_residence, nationalite, telephone, push_token, premium_expires_at, created_at
             FROM users WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async update(id, updates) {
        const allowedFields = [
            'avatar', 'nom', 'prenom', 'email', 'telephone', 'pays_residence',
            'ville_residence', 'is_premium', 'is_banned', 'is_admin', 'push_token', 'premium_expires_at'
        ];
        const fieldsToUpdate = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) fieldsToUpdate[field] = updates[field];
        }
        if (Object.keys(fieldsToUpdate).length === 0) return null;
        const fields = Object.keys(fieldsToUpdate).map((key, idx) => `${key} = $${idx + 1}`).join(', ');
        const values = [...Object.values(fieldsToUpdate), id];
        const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        return result.rows[0];
    }
}

module.exports = User;