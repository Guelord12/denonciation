const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserController {
    async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
            res.json(user);
        } catch (err) {
            console.error('Erreur récupération profil:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const updates = req.body;
            const updatedUser = await User.update(userId, updates);
            if (!updatedUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });
            res.json(updatedUser);
        } catch (err) {
            console.error('Erreur mise à jour profil:', err);
            res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
        }
    }

    async changePassword(req, res) {
        try {
            const userId = req.user.id;
            const { oldPassword, newPassword } = req.body;
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
            const valid = await bcrypt.compare(oldPassword, user.mot_de_passe);
            if (!valid) return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
            if (newPassword.length < 6) return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
            const hashed = await bcrypt.hash(newPassword, 10);
            await User.update(userId, { mot_de_passe: hashed });
            res.json({ message: 'Mot de passe modifié avec succès' });
        } catch (err) {
            console.error('Erreur changement mot de passe:', err);
            res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
        }
    }

    async deleteAccount(req, res) {
        try {
            const userId = req.user.id;
            const deleted = await User.delete(userId);
            if (!deleted) return res.status(404).json({ error: 'Utilisateur non trouvé' });
            res.json({ message: 'Compte supprimé avec succès' });
        } catch (err) {
            console.error('Erreur suppression compte:', err);
            res.status(500).json({ error: 'Erreur lors de la suppression du compte' });
        }
    }

    async banUser(req, res) {
        try {
            const { userId } = req.params;
            const { banned } = req.body;
            const updated = await User.update(userId, { is_banned: banned });
            if (!updated) return res.status(404).json({ error: 'Utilisateur non trouvé' });
            res.json({ message: `Utilisateur ${banned ? 'banni' : 'débanni'} avec succès` });
        } catch (err) {
            console.error('Erreur bannissement:', err);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }
}

module.exports = new UserController();