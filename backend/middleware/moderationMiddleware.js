const moderationService = require('../services/moderationService');

async function moderateMessage(req, res, next) {
    const { message, contenu, content } = req.body;
    const textToModerate = message || contenu || content;
    if (!textToModerate) return next();
    try {
        const result = await moderationService.moderateText(textToModerate);
        if (!result.isClean) {
            return res.status(400).json({
                error: 'Message non approprié',
                reason: result.reason,
                cleanedText: result.cleanedText
            });
        }
        if (message) req.body.message = result.cleanedText;
        if (contenu) req.body.contenu = result.cleanedText;
        if (content) req.body.content = result.cleanedText;
        next();
    } catch (err) {
        console.error('Erreur de modération:', err);
        next();
    }
}

module.exports = { moderateMessage };