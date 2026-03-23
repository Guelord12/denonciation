const LiveMessage = require('../models/LiveMessage');
const moderationService = require('../services/moderationService');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('🔌 Nouvelle connexion WebSocket:', socket.id);

        socket.on('join-live', async (liveId) => {
            socket.join(`live-${liveId}`);
            socket.liveId = liveId;
            try {
                const messages = await LiveMessage.findByLive(liveId, 50);
                socket.emit('message-history', messages);
            } catch (err) {
                console.error('Erreur récupération historique:', err);
            }
        });

        socket.on('leave-live', (liveId) => {
            socket.leave(`live-${liveId}`);
        });

        socket.on('send-message', async (data) => {
            const { liveId, userId, message, username, avatar } = data;
            if (!message || !message.trim()) {
                socket.emit('message-error', { error: 'Message vide' });
                return;
            }
            const moderation = await moderationService.moderateText(message);
            if (!moderation.isClean) {
                socket.emit('message-rejected', { original: message, cleaned: moderation.cleanedText, reason: moderation.reason });
                return;
            }
            try {
                const liveMessage = await LiveMessage.create(liveId, userId, moderation.cleanedText);
                const live = await LiveMessage.findById(liveMessage.id); // Need host info? We'll get from DB
                const ioRoom = io.sockets.adapter.rooms.get(`live-${liveId}`);
                const isHost = false; // We'll pass host info from client
                const messageWithUser = {
                    ...liveMessage,
                    username: username || 'Anonyme',
                    avatar: avatar || '/anonymous-avatar.png',
                    isHost: false
                };
                io.to(`live-${liveId}`).emit('new-message', messageWithUser);
            } catch (err) {
                console.error('Erreur envoi message:', err);
                socket.emit('message-error', { error: 'Erreur lors de l\'envoi' });
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Déconnexion WebSocket:', socket.id);
            if (socket.liveId) socket.leave(`live-${socket.liveId}`);
        });
    });
};