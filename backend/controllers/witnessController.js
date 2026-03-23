const Witness = require('../models/Witness');
const Report = require('../models/Report');
const Notification = require('../models/Notification');

class WitnessController {
    async addWitness(req, res) {
        try {
            const { reportId } = req.params;
            const userId = req.user.id;
            const existing = await Witness.hasWitnessed(userId, reportId);
            if (existing) return res.status(400).json({ error: 'Vous avez déjà témoigné pour ce signalement' });
            const count = await Witness.addWitness(userId, reportId);
            const report = await Report.findById(reportId);
            if (report && report.user_id !== userId) {
                await Notification.create(report.user_id, 'witness', `Quelqu'un a témoigné pour votre signalement: ${report.titre}`);
            }
            res.json({ witnesses: count, message: 'Témoignage ajouté avec succès' });
        } catch (err) {
            console.error('Erreur ajout témoignage:', err);
            res.status(500).json({ error: 'Erreur lors de l\'ajout du témoignage' });
        }
    }

    async hasWitnessed(req, res) {
        try {
            const { reportId } = req.params;
            const userId = req.user.id;
            const hasWitnessed = await Witness.hasWitnessed(userId, reportId);
            const count = await Witness.countByReport(reportId);
            res.json({ hasWitnessed, witnessesCount: count });
        } catch (err) {
            console.error('Erreur vérification témoignage:', err);
            res.status(500).json({ error: 'Erreur lors de la vérification' });
        }
    }
}

module.exports = new WitnessController();