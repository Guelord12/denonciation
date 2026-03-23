const { Pool } = require('pg');
require('dotenv').config();

// Configuration simple, sans timeout agressif
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    // Supprimer connectionTimeoutMillis pour utiliser la valeur par défaut (0 = pas de timeout)
    // ou augmenter à une valeur confortable (ex: 10000)
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // 10 secondes
});

// Test de connexion au démarrage
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erreur de connexion à PostgreSQL:', err.stack);
    } else {
        console.log('✅ Connexion à PostgreSQL établie');
        release();
    }
});

module.exports = pool;