const pool = require('../config/db');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const moderationService = require('../services/moderationService');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configuration Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

class ReportController {
    async createReport(req, res) {
        try {
            const { titre, description, categorie, preuves, ville_signalement, latitude, longitude } = req.body;
            const userId = req.user.id;
            if (!titre || !description || !categorie) return res.status(400).json({ error: 'Titre, description et catégorie requis' });
            const moderation = await moderationService.moderateReport(titre, description);
            if (!moderation.isClean) {
                return res.status(400).json({ error: 'Contenu non approprié', issues: moderation.issues, cleanedTitre: moderation.cleanedTitre, cleanedDescription: moderation.cleanedDescription });
            }
            const report = await Report.create({
                user_id: userId,
                titre: moderation.cleanedTitre,
                description: moderation.cleanedDescription,
                categorie,
                preuves: preuves || [],
                ville_signalement,
                latitude,
                longitude
            });
            const io = req.app.get('io');
            if (io) io.emit('new_report', { ...report, username: 'Anonyme', avatar: '/anonymous-avatar.png' });
            res.status(201).json({ ...report, username: 'Anonyme', avatar: '/anonymous-avatar.png' });
        } catch (err) {
            console.error('Erreur création signalement:', err);
            res.status(500).json({ error: 'Erreur lors de la création du signalement' });
        }
    }

    async getReports(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const reports = await Report.findAll(limit, offset);
            const anonymized = reports.map(r => ({ ...r, username: 'Anonyme', avatar: '/anonymous-avatar.png' }));
            res.json(anonymized);
        } catch (err) {
            console.error('Erreur récupération signalements:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des signalements' });
        }
    }

    async getMyReports(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const reports = await Report.findByUser(userId, limit, offset);
            res.json(reports);
        } catch (err) {
            console.error('Erreur récupération mes signalements:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération de vos signalements' });
        }
    }

    async getReportById(req, res) {
        try {
            const { id } = req.params;
            const report = await Report.findById(id);
            if (!report) return res.status(404).json({ error: 'Signalement non trouvé' });
            res.json({ ...report, username: 'Anonyme', avatar: '/anonymous-avatar.png' });
        } catch (err) {
            console.error('Erreur récupération signalement:', err);
            res.status(500).json({ error: 'Erreur lors de la récupération du signalement' });
        }
    }

    async deleteReport(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const deleted = await Report.delete(id, userId);
            if (!deleted) return res.status(404).json({ error: 'Signalement non trouvé ou non autorisé' });
            res.json({ message: 'Signalement supprimé avec succès' });
        } catch (err) {
            console.error('Erreur suppression signalement:', err);
            res.status(500).json({ error: 'Erreur lors de la suppression' });
        }
    }

    async uploadEvidence(req, res) {
        try {
            if (!req.file) return res.status(400).json({ error: 'Aucun fichier uploadé' });

            // Upload vers Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'denonciation',
                resource_type: 'auto' // auto détecte image, vidéo, etc.
            });

            // Supprimer le fichier local temporaire
            fs.unlinkSync(req.file.path);

            res.json({ url: result.secure_url, publicId: result.public_id });
        } catch (err) {
            console.error('Erreur upload Cloudinary:', err);
            res.status(500).json({ error: 'Erreur lors de l\'upload' });
        }
    }
}

module.exports = new ReportController();