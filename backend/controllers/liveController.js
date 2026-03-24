const pool = require('../config/db');
const Live = require('../models/Live');
const LiveMessage = require('../models/LiveMessage');
const LiveParticipant = require('../models/LiveParticipant');
const Notification = require('../models/Notification');
const moderationService = require('../services/moderationService');

class LiveController {
    async createLive(req, res) {
        try {
            const { titre, description, is_premium } = req.body;
            const userId = req.user.id;
            if (!titre) return res.status(400).json({ error: 'Titre requis' });
            if (is_premium && !req.user.isPremium) return res.status(403).json({ error: 'Seuls les utilisateurs premium peuvent créer des lives premium' });
            const live = await Live.create(userId, titre, description, is_premium || false);
            res.status(201).json(live);
        } catch (err) {
            console.error('Erreur création live:', err);
            res.status(500).json({ error: 'Erreur lors de la création du live' });
        }
    }

    async getActiveLives(req, res) {
        try {
            const lives = await Live.getActiveLives();
            res.json(lives);
        } catch (err) {
            console.error('Erreur récupération lives:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des lives' });
        }
    }

    async getActiveLivesFiltered(req, res) {
        try {
            const { city } = req.query;
            let query = `SELECT l.*, u.username, u.avatar FROM lives l JOIN users u ON l.user_id = u.id WHERE l.status = 'live'`;
            const values = [];
            if (city) {
                query += ` AND (l.is_premium = true OR u.ville_residence = $1)`;
                values.push(city);
            }
            query += ` ORDER BY l.started_at DESC`;
            const result = await pool.query(query, values);
            res.json(result.rows);
        } catch (err) {
            console.error('Erreur récupération lives filtrés:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des lives' });
        }
    }

    async getLiveById(req, res) {
        try {
            const { id } = req.params;
            const live = await Live.findById(id);
            if (!live) return res.status(404).json({ error: 'Live non trouvé' });
            const participantsCount = await LiveParticipant.getParticipantsCount(id);
            const messages = await LiveMessage.findByLive(id, 50);
            res.json({ ...live, participantsCount, recentMessages: messages });
        } catch (err) {
            console.error('Erreur récupération live:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération du live' });
        }
    }

    async startLive(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const live = await Live.findById(id);
            if (!live) return res.status(404).json({ error: 'Live non trouvé' });
            if (live.user_id !== userId) return res.status(403).json({ error: 'Vous n\'êtes pas le propriétaire de ce live' });
            const updated = await Live.updateStatus(id, 'live');
            const io = req.app.get('io');
            if (io) io.emit('live_started', updated);
            res.json(updated);
        } catch (err) {
            console.error('Erreur démarrage live:', err);
            res.status(500).json({ error: 'Erreur lors du démarrage du live' });
        }
    }

    async endLive(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const live = await Live.findById(id);
            if (!live) return res.status(404).json({ error: 'Live non trouvé' });
            if (live.user_id !== userId) return res.status(403).json({ error: 'Vous n\'êtes pas le propriétaire de ce live' });
            const updated = await Live.updateStatus(id, 'ended');
            const io = req.app.get('io');
            if (io) io.emit('live_ended', updated);
            res.json(updated);
        } catch (err) {
            console.error('Erreur fin live:', err);
            res.status(500).json({ error: 'Erreur lors de la fin du live' });
        }
    }

    async sendMessage(req, res) {
        try {
            const { liveId } = req.params;
            const { message, replyToId } = req.body;
            const userId = req.user.id;
            if (!message || !message.trim()) return res.status(400).json({ error: 'Message vide' });
            const live = await Live.findById(liveId);
            if (!live) return res.status(404).json({ error: 'Live non trouvé' });
            const moderation = await moderationService.moderateText(message);
            if (!moderation.isClean) return res.status(400).json({ error: 'Message non approprié', reason: moderation.reason, cleanedText: moderation.cleanedText });
            let replyToMessage = null;
            if (replyToId) replyToMessage = await LiveMessage.findById(replyToId);
            const liveMessage = await LiveMessage.create(liveId, userId, moderation.cleanedText);
            const messageWithUser = {
                ...liveMessage,
                username: userId === live.user_id ? 'Propriétaire' : 'Anonyme',
                avatar: userId === live.user_id ? '/host-avatar.png' : '/anonymous-avatar.png',
                isHost: userId === live.user_id,
                replyTo: replyToMessage ? { id: replyToMessage.id, message: replyToMessage.message, username: replyToMessage.user_id === live.user_id ? 'Propriétaire' : 'Anonyme' } : null
            };
            const io = req.app.get('io');
            if (io) {
                io.to(`live-${liveId}`).emit('new-message', messageWithUser);
                if (replyToId && replyToMessage && replyToMessage.user_id !== userId) {
                    io.to(`user-${replyToMessage.user_id}`).emit('message-reply', { liveId, liveTitle: live.titre, message: messageWithUser });
                }
            }
            res.status(201).json(messageWithUser);
        } catch (err) {
            console.error('Erreur envoi message:', err);
            res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
        }
    }

    async getMessages(req, res) {
        try {
            const { liveId } = req.params;
            const limit = parseInt(req.query.limit) || 100;
            const messages = await LiveMessage.findByLive(liveId, limit);
            const live = await Live.findById(liveId);
            const hostId = live?.user_id;
            const formatted = messages.map(msg => ({
                ...msg,
                username: msg.user_id === hostId ? 'Propriétaire' : 'Anonyme',
                avatar: msg.user_id === hostId ? '/host-avatar.png' : '/anonymous-avatar.png',
                isHost: msg.user_id === hostId
            }));
            res.json(formatted);
        } catch (err) {
            console.error('Erreur récupération messages:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
        }
    }

    async joinLive(req, res) {
        try {
            const { liveId } = req.params;
            const userId = req.user.id;
            const live = await Live.findById(liveId);
            if (!live) return res.status(404).json({ error: 'Live non trouvé' });
            if (live.status !== 'live') return res.status(400).json({ error: 'Le live n\'est pas encore commencé' });
            const result = await LiveParticipant.join(liveId, userId);
            const io = req.app.get('io');
            if (io && result) io.to(`live-${liveId}`).emit('participant-joined', { userId, participantsCount: result.participantsCount });
            res.json(result);
        } catch (err) {
            console.error('Erreur rejoindre live:', err);
            res.status(500).json({ error: 'Erreur lors de la participation' });
        }
    }

    async leaveLive(req, res) {
        try {
            const { liveId } = req.params;
            const userId = req.user.id;
            const result = await LiveParticipant.leave(liveId, userId);
            const io = req.app.get('io');
            if (io && result) io.to(`live-${liveId}`).emit('participant-left', { userId, participantsCount: result.participantsCount });
            res.json(result);
        } catch (err) {
            console.error('Erreur quitter live:', err);
            res.status(500).json({ error: 'Erreur lors du départ' });
        }
    }

    async getParticipants(req, res) {
        try {
            const { liveId } = req.params;
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            const participants = await LiveParticipant.getParticipants(liveId, limit, offset);
            const count = await LiveParticipant.getParticipantsCount(liveId);
            res.json({ participants, total: count, limit, offset });
        } catch (err) {
            console.error('Erreur récupération participants:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des participants' });
        }
    }
}

module.exports = new LiveController();