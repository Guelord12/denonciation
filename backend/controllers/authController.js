const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PasswordReset = require('../models/PasswordReset');
const { sendResetCode } = require('../utils/emailService');
const { sendSms } = require('../utils/smsService');

class AuthController {
    async register(req, res) {
        try {
            const { email, username, mot_de_passe, confirmation_mdp, date_naissance, ...userData } = req.body;
            if (mot_de_passe !== confirmation_mdp) return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' });
            if (mot_de_passe.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
            const existingUser = await User.findByUsername(username) || await User.findByEmail(email);
            if (existingUser) return res.status(400).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
            const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
            const newUser = await User.create({ ...userData, email, username, mot_de_passe: hashedPassword, date_naissance });
            await Notification.create(newUser.id, 'welcome', 'Bienvenue sur Dénonciation ! Commencez à signaler des abus et participez à une société plus juste.');
            res.status(201).json({ message: 'Inscription réussie', user: { id: newUser.id, username: newUser.username, email: newUser.email, isPremium: newUser.is_premium } });
        } catch (err) {
            console.error('Erreur inscription:', err);
            res.status(500).json({ error: 'Erreur lors de l\'inscription' });
        }
    }

    async login(req, res) {
        try {
            const { username, mot_de_passe } = req.body;
            if (!username || !mot_de_passe) return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
            const user = await User.findByUsername(username);
            if (!user) return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
            const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
            if (!validPassword) return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
            if (user.is_banned) return res.status(403).json({ error: 'Votre compte a été suspendu pour non-respect des règles.' });
            const token = jwt.sign({ id: user.id, username: user.username, isPremium: user.is_premium }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: user.id, username: user.username, avatar: user.avatar, email: user.email, nom: user.nom, prenom: user.prenom, isPremium: user.is_premium, ville_residence: user.ville_residence, pays_residence: user.pays_residence } });
        } catch (err) {
            console.error('Erreur connexion:', err);
            res.status(500).json({ error: 'Erreur lors de la connexion' });
        }
    }

    async forgotPassword(req, res) {
        try {
            const { identifier } = req.body;
            let user = await User.findByUsername(identifier);
            if (!user) user = await User.findByEmail(identifier);
            if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
            const resetCode = crypto.randomInt(100000, 999999).toString();
            await PasswordReset.create(user.id, resetCode);
            await sendResetCode(user.email, resetCode);
            if (user.telephone) {
                const fullPhone = `${user.indicatif_telephone}${user.telephone}`;
                await sendSms(fullPhone, `Votre code de réinitialisation Dénonciation : ${resetCode}`);
            }
            res.json({ message: 'Un code de réinitialisation a été envoyé par email et SMS' });
        } catch (err) {
            console.error('Erreur forgot password:', err);
            res.status(500).json({ error: 'Erreur lors de la demande' });
        }
    }

    async resetPassword(req, res) {
        try {
            const { code, newPassword } = req.body;
            const resetEntry = await PasswordReset.findByCode(code);
            if (!resetEntry) return res.status(400).json({ error: 'Code invalide ou expiré' });
            const user = await User.findById(resetEntry.user_id);
            if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await User.update(user.id, { mot_de_passe: hashedPassword });
            await PasswordReset.deleteByUserId(user.id);
            res.json({ message: 'Mot de passe réinitialisé avec succès' });
        } catch (err) {
            console.error('Erreur reset password:', err);
            res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
        }
    }

    async verifyToken(req, res) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });
            res.json({ valid: true, user });
        } catch (err) {
            res.status(500).json({ error: 'Erreur de vérification' });
        }
    }
}

module.exports = new AuthController();