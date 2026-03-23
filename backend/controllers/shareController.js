const ReportShare = require('../models/ReportShare');
const Report = require('../models/Report');

class ShareController {
    async shareReport(req, res) {
        try {
            const { reportId } = req.params;
            const userId = req.user.id;
            const result = await ReportShare.share(userId, reportId);
            if (!result) return res.status(400).json({ error: 'Vous avez déjà partagé ce signalement' });
            const report = await Report.findById(reportId);
            if (report && report.user_id !== userId) {
                const Notification = require('../models/Notification');
                await Notification.create(report.user_id, 'share', `Quelqu'un a partagé votre signalement: ${report.titre}`);
            }
            res.json(result);
        } catch (err) {
            console.error('Erreur partage:', err);
            res.status(500).json({ error: 'Erreur lors du partage' });
        }
    }

    async getShareCount(req, res) {
        try {
            const { reportId } = req.params;
            const count = await ReportShare.getShareCount(reportId);
            const hasShared = req.user ? await ReportShare.hasShared(req.user.id, reportId) : false;
            res.json({ sharesCount: count, hasShared });
        } catch (err) {
            console.error('Erreur récupération partages:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération' });
        }
    }
}

module.exports = new ShareController();