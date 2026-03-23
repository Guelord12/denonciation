const pool = require('../config/db');

class Witness {
    static async addWitness(userId, reportId) {
        const existing = await pool.query('SELECT * FROM witnesses WHERE user_id = $1 AND report_id = $2', [userId, reportId]);
        if (existing.rows.length > 0) return null;
        await pool.query('INSERT INTO witnesses (user_id, report_id) VALUES ($1, $2)', [userId, reportId]);
        const count = await pool.query('SELECT COUNT(*) as count FROM witnesses WHERE report_id = $1', [reportId]);
        return parseInt(count.rows[0].count);
    }

    static async hasWitnessed(userId, reportId) {
        const result = await pool.query('SELECT id FROM witnesses WHERE user_id = $1 AND report_id = $2', [userId, reportId]);
        return result.rows.length > 0;
    }

    static async countByReport(reportId) {
        const result = await pool.query('SELECT COUNT(*) as count FROM witnesses WHERE report_id = $1', [reportId]);
        return parseInt(result.rows[0].count);
    }
}

module.exports = Witness;