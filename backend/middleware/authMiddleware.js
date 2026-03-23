const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Accès non autorisé' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token invalide' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });
        if (user.is_banned) return res.status(403).json({ error: 'Votre compte a été suspendu pour non-respect des règles.' });
        req.user = { ...decoded, isAdmin: user.is_admin };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expiré' });
        return res.status(401).json({ error: 'Token invalide' });
    }
};