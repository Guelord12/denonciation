const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

class SetupController {
    async initDatabase(req, res) {
        try {
            // Lire le fichier schema.sql
            const sqlPath = path.join(__dirname, '../../database/schema.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');

            // Exécuter les commandes SQL (séparées par ;)
            await pool.query(sql);
            res.json({ message: 'Base de données initialisée avec succès' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new SetupController();