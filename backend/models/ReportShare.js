const pool = require('../config/db');

class ReportShare {
    static async share(userId, reportId) {
        const existing = await pool.query('SELECT * FROM report_shares WHERE user_id = $1 AND report_id = $2', [userId, reportId]);
        if (existing.rows.length > 0) return null;
        await pool.query('INSERT INTO report_shares (user_id, report_id) VALUES ($1, $2)', [userId, reportId]);
        const result = await pool.query('SELECT shares_count FROM reports WHERE id = $1', [reportId]);
        return { shared: true, sharesCount: parseInt(result.rows[0].shares_count) };
    }

    static async getShareCount(reportId) {
        const result = await pool.query('SELECT shares_count FROM reports WHERE id = $1', [reportId]);
        return parseInt(result.rows[0]?.shares_count || 0);
    }

    static async hasShared(userId, reportId) {
        const result = await pool.query('SELECT * FROM report_shares WHERE user_id = $1 AND report_id = $2', [userId, reportId]);
        return result.rows.length > 0;
    }
}

module.exports = ReportShare;