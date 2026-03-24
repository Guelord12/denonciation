const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

app.set('io', io);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/likes', require('./routes/likes'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/witnesses', require('./routes/witnesses'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/news', require('./routes/news'));
app.use('/api/lives', require('./routes/lives'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/follows', require('./routes/follows'));
app.use('/api/shares', require('./routes/shares'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/setup', require('./routes/setup'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ==================================================
// ROUTE TEMPORAIRE POUR INITIALISER LA BASE DE DONNÉES
// À SUPPRIMER APRÈS UTILISATION
// ==================================================
app.get('/api/setup/init-db', async (req, res) => {
    try {
        const sqlPath = path.join(__dirname, '../database/schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        const pool = require('./config/db');
        await pool.query(sql);
        res.send('✅ Base de données initialisée avec succès !');
    } catch (err) {
        console.error('Erreur lors de l’initialisation:', err);
        res.status(500).send('❌ Erreur : ' + err.message);
    }
});
// ==================================================

// Middleware 404 – doit être après toutes les routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err.stack);
    res.status(500).json({ error: 'Erreur interne du serveur' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 WebSocket prêt`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
});