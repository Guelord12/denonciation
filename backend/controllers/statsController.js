const pool = require('../config/db');
const Report = require('../models/Report');

class StatsController {
    async getStats(req, res) {
        try {
            const totalReports = await pool.query('SELECT COUNT(*) as count FROM reports');
            const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
            const totalLikes = await pool.query('SELECT COUNT(*) as count FROM likes WHERE type = $1', ['like']);
            const totalWitnesses = await pool.query('SELECT COUNT(*) as count FROM witnesses');
            res.json({
                totalReports: parseInt(totalReports.rows[0].count),
                totalUsers: parseInt(totalUsers.rows[0].count),
                totalLikes: parseInt(totalLikes.rows[0].count),
                totalWitnesses: parseInt(totalWitnesses.rows[0].count)
            });
        } catch (err) {
            console.error('Erreur statistiques:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
        }
    }

    async getTemporalStats(req, res) {
        try {
            const { period = 'daily' } = req.query;
            let dateTrunc, format;
            switch (period) {
                case 'daily':
                    dateTrunc = 'day';
                    format = 'YYYY-MM-DD';
                    break;
                case 'weekly':
                    dateTrunc = 'week';
                    format = 'IYYY-IW';
                    break;
                case 'monthly':
                    dateTrunc = 'month';
                    format = 'YYYY-MM';
                    break;
                case 'quarterly':
                    dateTrunc = 'quarter';
                    format = 'YYYY-"Q"Q';
                    break;
                case 'semester':
                    // semestre : premier ou second semestre
                    dateTrunc = 'month';
                    // on va regrouper manuellement par semestre
                    break;
                case 'yearly':
                    dateTrunc = 'year';
                    format = 'YYYY';
                    break;
                default:
                    dateTrunc = 'day';
                    format = 'YYYY-MM-DD';
            }

            let query, result;
            if (period === 'semester') {
                // Groupement personnalisé pour les semestres
                query = `
                    SELECT 
                        CASE 
                            WHEN EXTRACT(MONTH FROM created_at) <= 6 THEN TO_CHAR(created_at, 'YYYY') || '-S1'
                            ELSE TO_CHAR(created_at, 'YYYY') || '-S2'
                        END as period_label,
                        COUNT(*) as count
                    FROM reports
                    GROUP BY period_label
                    ORDER BY period_label ASC
                `;
                result = await pool.query(query);
            } else {
                query = `
                    SELECT 
                        TO_CHAR(DATE_TRUNC($1, created_at), $2) as period_label,
                        COUNT(*) as count
                    FROM reports
                    GROUP BY DATE_TRUNC($1, created_at)
                    ORDER BY DATE_TRUNC($1, created_at) ASC
                `;
                result = await pool.query(query, [dateTrunc, format]);
            }

            const labels = result.rows.map(r => r.period_label);
            const counts = result.rows.map(r => parseInt(r.count));

            // Récupérer les catégories aussi (optionnel)
            const categoryResult = await pool.query(`
                SELECT categorie, COUNT(*) as count
                FROM reports
                GROUP BY categorie
                ORDER BY count DESC
                LIMIT 10
            `);

            res.json({
                period,
                data: { labels, counts },
                categories: categoryResult.rows
            });
        } catch (err) {
            console.error('Erreur stats temporelles:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des statistiques temporelles' });
        }
    }

    async getTopReports(req, res) {
        try {
            const { categorie, ville, limit = 10 } = req.query;
            const top = await Report.getTopByCategoryAndCity(categorie, ville, parseInt(limit));
            const total = top.reduce((s, i) => s + i.total_interactions, 0);
            const withPercent = top.map(i => ({ ...i, percent: total > 0 ? ((i.total_interactions / total) * 100).toFixed(2) : 0 }));
            res.json(withPercent);
        } catch (err) {
            console.error('Erreur top signalements:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération du top' });
        }
    }

    async getCategoryStats(req, res) {
        try {
            const stats = await Report.getCategoryStats();
            const total = stats.reduce((s, i) => s + i.count, 0);
            const withPercent = stats.map(i => ({ ...i, percent: total > 0 ? ((i.count / total) * 100).toFixed(2) : 0 }));
            res.json(withPercent);
        } catch (err) {
            console.error('Erreur statistiques catégories:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des statistiques par catégorie' });
        }
    }

    async getCityStats(req, res) {
        try {
            const result = await pool.query(`
                SELECT ville_signalement, COUNT(*) as count
                FROM reports
                WHERE ville_signalement IS NOT NULL
                GROUP BY ville_signalement
                ORDER BY count DESC
                LIMIT 10
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('Erreur statistiques villes:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des statistiques par ville' });
        }
    }
}

module.exports = new StatsController();