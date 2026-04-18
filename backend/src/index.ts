// =====================================================
// GESTIONNAIRES D'ERREURS GLOBAUX - À METTRE TOUT EN HAUT
// =====================================================
process.on('uncaughtException', (error) => {
  console.error('❌❌❌ UNCAUGHT EXCEPTION ❌❌❌');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌❌❌ UNHANDLED REJECTION ❌❌❌');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

process.on('warning', (warning) => {
  console.warn('⚠️ WARNING:', warning.name, warning.message);
});

// =====================================================
// IMPORTS
// =====================================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { errorHandler, notFound } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import { initializeDatabase } from './database/connection';
import { initializeScheduler } from './scheduler';
import { setupSocketHandlers } from './websocket';
import { initializeStreamServer } from './services/stream.service';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import reportRoutes from './routes/report.routes';
import commentRoutes from './routes/comment.routes';
import liveRoutes from './routes/live.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import actualiteRoutes from './routes/actualite.routes';
import uploadRoutes from './routes/upload.routes';
import categoryRoutes from './routes/category.routes';
import cityRoutes from './routes/city.routes';
import countryRoutes from './routes/country.routes';
import chatbotRoutes from './routes/chatbot.routes';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes';

// =====================================================
// CONFIGURATION
// =====================================================
dotenv.config();

console.log('🔧 Environment variables loaded');
console.log('   PORT:', process.env.PORT || '5000');
console.log('   DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('   REDIS_HOST:', process.env.REDIS_HOST || 'localhost (désactivé)');

const app = express();
const httpServer = createServer(app);

// ✅ CORRECTION : Configuration CORS COMPLÈTE pour Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:19000',
      'http://localhost:19006',
      'http://192.168.1.100:3000',
      'http://192.168.1.100:19000',
      'http://192.168.131.90:3000',
      'http://192.168.131.90:19000',
      'exp://localhost:19000',
      'exp://192.168.1.100:19000',
      'exp://192.168.131.90:19000',
      // ✅ Autoriser toutes les origines en développement
      ...(process.env.NODE_ENV === 'development' ? ['*'] : []),
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  // ✅ Activer les deux transports
  transports: ['polling', 'websocket'],
  // ✅ Autoriser l'upgrade vers WebSocket
  allowUpgrades: true,
  // ✅ Ping pour maintenir la connexion
  pingTimeout: 60000,
  pingInterval: 25000,
  // ✅ Timeout de connexion
  connectTimeout: 45000,
  // ✅ Taille maximale des données
  maxHttpBufferSize: 1e8,
});

const PORT = process.env.PORT || 5000;

// Créer les dossiers nécessaires
const dirs = ['./uploads', './hls', './logs'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// =====================================================
// MIDDLEWARES
// =====================================================
console.log('🔧 Setting up middlewares...');

app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Désactiver CSP pour les WebSockets
}));

// ✅ CORRECTION : Configuration CORS pour Express
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:19000',
    'http://localhost:19006',
    'http://192.168.1.100:3000',
    'http://192.168.1.100:19000',
    'http://192.168.131.90:3000',
    'http://192.168.131.90:19000',
    'exp://localhost:19000',
    'exp://192.168.1.100:19000',
    'exp://192.168.131.90:19000',
    ...(process.env.NODE_ENV === 'development' ? ['*'] : []),
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiter);

// Fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/hls', express.static(path.join(__dirname, '../hls')));

console.log('✅ Middlewares configured');

// =====================================================
// ROUTES API
// =====================================================
console.log('🔧 Registering API routes...');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/actualites', actualiteRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/webhooks', webhookRoutes);

console.log('✅ API routes registered');

// =====================================================
// HEALTH CHECK ET RACINE
// =====================================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(), 
    uptime: process.uptime(),
    socket: 'ready',
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Dénonciation API',
    version: '1.0.0',
    endpoints: [
      '/api/auth', '/api/users', '/api/reports', '/api/comments',
      '/api/live', '/api/admin', '/api/notifications', '/api/actualites',
      '/api/upload', '/api/categories', '/api/cities', '/api/countries',
      '/api/chatbot', '/api/payment'
    ],
    redis: 'disabled',
    socket: 'enabled',
  });
});

// =====================================================
// ERROR HANDLERS
// =====================================================
app.use(notFound);
app.use(errorHandler);

console.log('✅ Error handlers configured');

// =====================================================
// WEBSOCKET
// =====================================================
setupSocketHandlers(io);
console.log('✅ WebSocket configured');
console.log('   📡 Socket.IO CORS origins:', [
  'http://localhost:3000',
  'http://localhost:19000',
  'http://192.168.131.90:3000',
  'http://192.168.131.90:19000',
  'exp://localhost:19000',
  'exp://192.168.131.90:19000',
]);

// =====================================================
// BOOTSTRAP
// =====================================================
async function bootstrap() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 STARTING BOOTSTRAP');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Étape 1: Base de données
    console.log('');
    console.log('📦 Step 1/4: Initializing database...');
    await initializeDatabase();
    console.log('   ✅ Database initialized successfully');
    
    // Étape 2: Redis - DÉSACTIVÉ TEMPORAIREMENT
    console.log('');
    console.log('📦 Step 2/4: Initializing Redis...');
    console.log('   ⚠️ Redis disabled - skipping (run without cache)');
    
    // Étape 3: Scheduler
    console.log('');
    console.log('📦 Step 3/4: Initializing scheduler...');
    initializeScheduler();
    console.log('   ✅ Scheduler initialized successfully');
    
    // Étape 4: Stream Server
    console.log('');
    console.log('📦 Step 4/4: Initializing stream server...');
    try {
      initializeStreamServer();
      console.log('   ✅ Stream server initialized successfully');
      console.log('   📡 RTMP: rtmp://localhost:1935/live');
      console.log('   📡 HLS: http://localhost:8000/live');
    } catch (streamError) {
      console.log('   ⚠️ Stream server failed to start (FFmpeg may not be installed)');
      console.log('   💡 Install FFmpeg for streaming support');
    }
    
    // Démarrer le serveur HTTP
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    
    // ✅ CORRECTION : Utiliser Number(PORT) ou simplement PORT
    httpServer.listen(Number(PORT), () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║                                                           ║');
      console.log(`║   🚀 SERVER RUNNING ON PORT ${PORT}                          ║`);
      console.log('║   📡 WebSocket server ready                               ║');
      console.log('║   🌐 Listening on all network interfaces (0.0.0.0)        ║');
      console.log(`║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                       ║`);
      console.log('║   📍 Health check: http://localhost:' + PORT + '/health              ║');
      console.log('║   ⚠️ Redis: DISABLED                                      ║');
      console.log('║                                                           ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      console.log('');
    });
    
  } catch (error) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════╗');
    console.error('║                                                           ║');
    console.error('║   ❌❌❌ BOOTSTRAP FAILED ❌❌❌                            ║');
    console.error('║                                                           ║');
    console.error('╚═══════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('');
    process.exit(1);
  }
}

// Lancer le bootstrap avec gestion d'erreur supplémentaire
bootstrap().catch((error) => {
  console.error('');
  console.error('╔═══════════════════════════════════════════════════════════╗');
  console.error('║                                                           ║');
  console.error('║   ❌❌❌ BOOTSTRAP PROMISE FAILED ❌❌❌                    ║');
  console.error('║                                                           ║');
  console.error('╚═══════════════════════════════════════════════════════════╝');
  console.error('');
  console.error('Error details:', error);
  console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
  console.error('');
  process.exit(1);
});

export { io };