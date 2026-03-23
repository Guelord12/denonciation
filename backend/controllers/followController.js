const Follow = require('../models/Follow');
const Notification = require('../models/Notification');

class FollowController {
    async follow(req, res) {
        try {
            const { userId } = req.params;
            const followerId = req.user.id;
            if (parseInt(userId) === followerId) return res.status(400).json({ error: 'Vous ne pouvez pas vous suivre vous-même' });
            const result = await Follow.follow(followerId, userId);
            if (!result) return res.status(400).json({ error: 'Vous suivez déjà cet utilisateur' });
            await Notification.create(userId, 'follow', `${req.user.username} vous suit maintenant`);
            res.json(result);
        } catch (err) {
            console.error('Erreur follow:', err);
            res.status(500).json({ error: 'Erreur lors du follow' });
        }
    }

    async unfollow(req, res) {
        try {
            const { userId } = req.params;
            const followerId = req.user.id;
            const result = await Follow.unfollow(followerId, userId);
            if (!result) return res.status(400).json({ error: 'Vous ne suivez pas cet utilisateur' });
            res.json(result);
        } catch (err) {
            console.error('Erreur unfollow:', err);
            res.status(500).json({ error: 'Erreur lors du unfollow' });
        }
    }

    async isFollowing(req, res) {
        try {
            const { userId } = req.params;
            const followerId = req.user.id;
            const isFollowing = await Follow.isFollowing(followerId, userId);
            const followersCount = await Follow.getFollowersCount(userId);
            const followingCount = await Follow.getFollowingCount(followerId);
            res.json({ isFollowing, followersCount, followingCount });
        } catch (err) {
            console.error('Erreur vérification follow:', err);
            res.status(500).json({ error: 'Erreur lors de la vérification' });
        }
    }

    async getFollowers(req, res) {
        try {
            const { userId } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const followers = await Follow.getFollowers(userId, limit, offset);
            const count = await Follow.getFollowersCount(userId);
            res.json({ followers, total: count, limit, offset });
        } catch (err) {
            console.error('Erreur récupération followers:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération' });
        }
    }

    async getFollowing(req, res) {
        try {
            const { userId } = req.params;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const following = await Follow.getFollowing(userId, limit, offset);
            const count = await Follow.getFollowingCount(userId);
            res.json({ following, total: count, limit, offset });
        } catch (err) {
            console.error('Erreur récupération following:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération' });
        }
    }
}

module.exports = new FollowController();