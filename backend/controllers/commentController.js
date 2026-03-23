const Comment = require('../models/Comment');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const moderationService = require('../services/moderationService');

class CommentController {
    async addComment(req, res) {
        try {
            const { reportId } = req.params;
            const { contenu, parent_id } = req.body;
            const userId = req.user.id;
            if (!contenu || !contenu.trim()) return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
            const moderation = await moderationService.moderateText(contenu);
            if (!moderation.isClean) return res.status(400).json({ error: 'Commentaire non approprié', reason: moderation.reason, cleanedText: moderation.cleanedText });
            const comment = await Comment.create(userId, reportId, moderation.cleanedText, parent_id || null);
            const report = await Report.findById(reportId);
            if (report && report.user_id !== userId) {
                await Notification.create(report.user_id, 'comment', `Quelqu'un a commenté votre signalement`);
            }
            if (parent_id) {
                const parentComment = await Comment.findById(parent_id);
                if (parentComment && parentComment.user_id !== userId) {
                    await Notification.create(parentComment.user_id, 'reply', `Quelqu'un a répondu à votre commentaire`);
                }
            }
            res.status(201).json({ ...comment, username: 'Anonyme', avatar: '/anonymous-avatar.png' });
        } catch (err) {
            console.error('Erreur ajout commentaire:', err);
            res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
        }
    }

    async getComments(req, res) {
        try {
            const { reportId } = req.params;
            const comments = await Comment.findByReport(reportId);
            const anonymized = comments.map(c => ({ ...c, username: 'Anonyme', avatar: '/anonymous-avatar.png' }));
            res.json(anonymized);
        } catch (err) {
            console.error('Erreur récupération commentaires:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
        }
    }

    async deleteComment(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;
            const deleted = await Comment.delete(commentId, userId);
            if (!deleted) return res.status(404).json({ error: 'Commentaire non trouvé ou non autorisé' });
            res.json({ message: 'Commentaire supprimé avec succès' });
        } catch (err) {
            console.error('Erreur suppression commentaire:', err);
            res.status(500).json({ error: 'Erreur lors de la suppression' });
        }
    }
}

module.exports = new CommentController();