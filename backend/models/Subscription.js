const pool = require('../config/db');

class Subscription {
    static async create(data) {
        const { user_id, plan, amount, currency, payment_method, transaction_id, expires_at } = data;
        const result = await pool.query(
            `INSERT INTO subscriptions (user_id, plan, amount, currency, payment_method, transaction_id, expires_at, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
            [user_id, plan, amount, currency, payment_method, transaction_id, expires_at]
        );
        return result.rows[0];
    }

    static async updateStatus(id, status) {
        const result = await pool.query(
            `UPDATE subscriptions SET status = $1 WHERE id = $2 RETURNING *`,
            [status, id]
        );
        return result.rows[0];
    }

    static async findByTransactionId(transactionId) {
        const result = await pool.query(
            `SELECT * FROM subscriptions WHERE transaction_id = $1`,
            [transactionId]
        );
        return result.rows[0];
    }

    static async getUserActiveSubscription(userId) {
        const result = await pool.query(
            `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'completed' AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1`,
            [userId]
        );
        return result.rows[0];
    }
}

module.exports = Subscription;