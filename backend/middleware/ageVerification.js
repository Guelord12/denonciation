/**
 * Middleware de vérification de l'âge
 * Interdit l'accès aux utilisateurs de moins de 15 ans
 */
exports.checkAge = (req, res, next) => {
    const { date_naissance } = req.body;
    
    if (!date_naissance) {
        return res.status(400).json({ error: 'Date de naissance requise' });
    }
    
    const birthDate = new Date(date_naissance);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    if (age < 15) {
        return res.status(403).json({ 
            error: 'Accès interdit aux moins de 15 ans',
            requiredAge: 15,
            userAge: age
        });
    }
    
    next();
};