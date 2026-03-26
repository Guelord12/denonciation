const assistantService = require('../services/assistantService');

class AssistantController {
    async ask(req, res) {
        try {
            const { question, language = 'fr' } = req.body;
            if (!question || question.trim().length < 3) {
                return res.status(400).json({
                    error: language === 'fr'
                        ? 'Veuillez poser une question plus précise'
                        : 'Please ask a more specific question'
                });
            }
            const answer = await assistantService.ask(question, language);
            res.json({ answer });
        } catch (err) {
            console.error('Erreur assistant:', err);
            res.status(500).json({ error: 'Erreur lors de la demande à l\'assistant' });
        }
    }
}

module.exports = new AssistantController();