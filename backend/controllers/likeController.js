const Like = require('../models/Like');
const Report = require('../models/Report');
const Notification = require('../models/Notification');

class LikeController {
    async setLike(req, res) {
        try {
            const { reportId } = req.params;
            const { type } = req.body;
            const userId = req.user.id;
            if (!['like', 'dislike'].includes(type)) return res.status(400).json({ error: 'Type de like invalide' });
            const counts = await Like.setLike(userId, reportId, type);
            const report = await Report.findById(reportId);
            if (report && report.user_id !== userId) {
                await Notification.create(report.user_id, type === 'like' ? 'like' : 'dislike', `${req.user.username} a ${type === 'like' ? 'liké' : 'disliké'} votre signalement: ${report.titre}`);
            }
            res.json(counts);
        } catch (err) {
            console.error('Erreur like:', err);
            res.status(500).json({ error: 'Erreur lors du like' });
        }
    }

    async removeLike(req, res) {
        try {
            const { reportId } = req.params;
            const userId = req.user.id;
            const result = await Like.removeLike(userId, reportId);
            if (!result) return res.status(404).json({ error: 'Like non trouvé' });
            res.json(result);
        } catch (err) {
            console.error('Erreur suppression like:', err);
            res.status(500).json({ error: 'Erreur lors de la suppression' });
        }
    }

    async getUserLikeStatus(req, res) {
        try {
            const { reportId } = req.params;
            const userId = req.user.id;
            const status = await Like.getUserLikeStatus(userId, reportId);
            res.json({ liked: status?.type === 'like', disliked: status?.type === 'dislike' });
        } catch (err) {
            console.error('Erreur récupération statut:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération' });
        }
    }
}

module.exports = new LikeController();