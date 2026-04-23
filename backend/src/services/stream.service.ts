// =====================================================
// SERVICE DE STREAMING - VERSION ROBUSTE AVEC TIMEOUTS
// =====================================================
import { logger } from '../utils/logger';
import { io } from '../index';
import { query } from '../database/connection';
import fs from 'fs';
import path from 'path';

// =====================================================
// TYPES PERSONNALISÉS POUR WEBRTC
// =====================================================
interface WebRTCOffer {
  type: 'offer';
  sdp: string;
}

interface WebRTCAnswer {
  type: 'answer';
  sdp: string;
}

interface WebRTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

// =====================================================
// TYPES POUR LES STREAMS
// =====================================================
interface StreamRoom {
  streamId: string;
  broadcasterId: string;
  viewers: Set<string>;
  startTime: Date;
  heartbeatInterval?: NodeJS.Timeout;
  connectionTimeout?: NodeJS.Timeout;
}

// =====================================================
// CONSTANTES DE CONFIGURATION
// =====================================================
const CONFIG = {
  // Délai maximum pour établir une connexion WebRTC (30 secondes)
  WEBRTC_CONNECTION_TIMEOUT: 30000,
  // Intervalle de heartbeat pour vérifier les connexions (10 secondes)
  HEARTBEAT_INTERVAL: 10000,
  // Délai avant de considérer un stream comme zombie (60 secondes sans heartbeat)
  ZOMBIE_STREAM_TIMEOUT: 60000,
  // Délai de nettoyage des spectateurs inactifs (30 secondes)
  VIEWER_INACTIVITY_TIMEOUT: 30000,
};

// =====================================================
// GESTION DES STREAMS EN MÉMOIRE
// =====================================================
const activeStreams = new Map<string, StreamRoom>();
const streamViewers = new Map<string, Set<string>>();
const viewerLastSeen = new Map<string, Date>(); // Pour le nettoyage des inactifs
const pendingConnections = new Map<string, NodeJS.Timeout>(); // Timeouts de connexion

// =====================================================
// INITIALISATION DU SERVEUR DE STREAMING
// =====================================================
export function initializeStreamServer(): void {
  logger.info('🎥 Initializing WebRTC streaming server (no FFmpeg required)...');
  
  // Créer le dossier HLS pour la compatibilité
  const hlsDir = path.join(__dirname, '../../hls');
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
    logger.info(`📁 Created HLS directory: ${hlsDir}`);
  }
  
  // Configurer les gestionnaires WebSocket pour le streaming
  setupStreamingHandlers();
  
  // Démarrer le nettoyage périodique des streams zombies
  startZombieStreamCleanup();
  
  // Démarrer le nettoyage des spectateurs inactifs
  startInactiveViewerCleanup();
  
  logger.info('✅ WebRTC streaming server initialized successfully');
  logger.info('   📡 WebRTC signaling ready');
  logger.info('   🎬 Streams can be started without FFmpeg');
  logger.info(`   ⏱️  Connection timeout: ${CONFIG.WEBRTC_CONNECTION_TIMEOUT / 1000}s`);
  logger.info(`   💓 Heartbeat interval: ${CONFIG.HEARTBEAT_INTERVAL / 1000}s`);
}

// =====================================================
// NETTOYAGE DES STREAMS ZOMBIES
// =====================================================
function startZombieStreamCleanup(): void {
  setInterval(() => {
    const now = new Date();
    activeStreams.forEach((room, streamId) => {
      const streamAge = now.getTime() - room.startTime.getTime();
      
      // Si le stream a plus de 60 secondes et 0 spectateurs, le nettoyer
      if (streamAge > CONFIG.ZOMBIE_STREAM_TIMEOUT && room.viewers.size === 0) {
        logger.warn(`🧟 Zombie stream detected: ${streamId}, cleaning up...`);
        cleanupStream(streamId, 'Zombie stream (no viewers)');
      }
    });
  }, 30000); // Toutes les 30 secondes
}

// =====================================================
// NETTOYAGE DES SPECTATEURS INACTIFS
// =====================================================
function startInactiveViewerCleanup(): void {
  setInterval(() => {
    const now = new Date();
    viewerLastSeen.forEach((lastSeen, socketId) => {
      const inactivityTime = now.getTime() - lastSeen.getTime();
      if (inactivityTime > CONFIG.VIEWER_INACTIVITY_TIMEOUT) {
        logger.debug(`🧹 Removing inactive viewer: ${socketId}`);
        
        // Trouver quel stream ce spectateur regardait
        streamViewers.forEach((viewers, streamId) => {
          if (viewers.has(socketId)) {
            viewers.delete(socketId);
            updateViewerCountInRoom(streamId);
          }
        });
        
        viewerLastSeen.delete(socketId);
      }
    });
  }, 15000); // Toutes les 15 secondes
}

// =====================================================
// NETTOYAGE D'UN STREAM
// =====================================================
function cleanupStream(streamId: string, reason: string): void {
  const room = activeStreams.get(streamId);
  if (!room) return;
  
  // Annuler les timeouts
  if (room.heartbeatInterval) clearInterval(room.heartbeatInterval);
  if (room.connectionTimeout) clearTimeout(room.connectionTimeout);
  
  // Notifier tous les spectateurs
  io.to(`stream:${streamId}`).emit('stream_ended', {
    streamId,
    message: reason || 'Le stream est terminé'
  });
  
  io.emit('stream_ended_global', { streamId });
  
  // Mettre à jour la base de données
  query(
    `UPDATE live_streams 
     SET status = 'ended', 
         end_time = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [streamId]
  ).catch(err => logger.error('Failed to update stream end status:', err));
  
  // Nettoyer les données en mémoire
  activeStreams.delete(streamId);
  streamViewers.delete(streamId);
  
  logger.info(`🛑 Stream ${streamId} cleaned up: ${reason}`);
}

// =====================================================
// MISE À JOUR DU COMPTEUR DE SPECTATEURS DANS UNE ROOM
// =====================================================
function updateViewerCountInRoom(streamId: string): void {
  const viewers = streamViewers.get(streamId);
  const count = viewers?.size || 0;
  
  io.to(`stream:${streamId}`).emit('viewer_count_update', {
    streamId,
    count
  });
  
  updateViewerCount(streamId, count).catch(err => {
    logger.error('Failed to update viewer count:', err);
  });
}

// =====================================================
// CONFIGURATION DES HANDLERS DE STREAMING
// =====================================================
function setupStreamingHandlers(): void {
  io.on('connection', (socket) => {
    logger.debug(`🔌 Streaming client connected: ${socket.id}`);
    
    // Stocker les informations utilisateur dans le socket
    const userId = socket.handshake.auth?.userId || socket.data?.userId;
    const username = socket.handshake.auth?.username || socket.data?.username || 'Anonymous';
    
    socket.data.userId = userId;
    socket.data.username = username;
    
    // Enregistrer le temps de dernière activité
    viewerLastSeen.set(socket.id, new Date());
    
    // =====================================================
    // HEARTBEAT - Maintien de la connexion
    // =====================================================
    socket.on('heartbeat', () => {
      viewerLastSeen.set(socket.id, new Date());
      socket.emit('heartbeat_ack');
    });
    
    // =====================================================
    // REJOINDRE UN STREAM (SPECTATEUR)
    // =====================================================
    socket.on('join_stream', (streamId: string) => {
      socket.join(`stream:${streamId}`);
      
      if (!streamViewers.has(streamId)) {
        streamViewers.set(streamId, new Set());
      }
      
      const viewers = streamViewers.get(streamId)!;
      viewers.add(socket.id);
      viewerLastSeen.set(socket.id, new Date());
      
      // Mettre à jour le compteur de spectateurs
      updateViewerCountInRoom(streamId);
      
      // Enregistrer dans la base de données
      if (userId) {
        query(
          `INSERT INTO live_viewers (stream_id, user_id, joined_at, last_seen_at)
           VALUES ($1, $2, NOW(), NOW())
           ON CONFLICT (stream_id, user_id) DO UPDATE SET last_seen_at = NOW()`,
          [streamId, userId]
        ).catch(err => logger.error('Failed to insert viewer:', err));
      }
      
      // Informer le spectateur si le stream est actif
      const room = activeStreams.get(streamId);
      if (room) {
        socket.emit('stream_status', { 
          streamId, 
          status: 'active', 
          broadcasterReady: true 
        });
      } else {
        socket.emit('stream_status', { 
          streamId, 
          status: 'waiting', 
          broadcasterReady: false 
        });
      }
      
      logger.info(`👤 Viewer ${socket.id} joined stream ${streamId} (total: ${viewers.size})`);
    });
    
    // =====================================================
    // QUITTER UN STREAM (SPECTATEUR)
    // =====================================================
    socket.on('leave_stream', (streamId: string) => {
      socket.leave(`stream:${streamId}`);
      
      const viewers = streamViewers.get(streamId);
      if (viewers) {
        viewers.delete(socket.id);
        updateViewerCountInRoom(streamId);
        logger.info(`👋 Viewer ${socket.id} left stream ${streamId} (remaining: ${viewers.size})`);
      }
      
      // Mettre à jour last_seen_at
      if (userId) {
        query(
          `UPDATE live_viewers SET last_seen_at = NOW() WHERE stream_id = $1 AND user_id = $2`,
          [streamId, userId]
        ).catch(err => logger.error('Failed to update viewer last_seen:', err));
      }
    });
    
    // =====================================================
    // DÉMARRER LA DIFFUSION (STREAMER) - AVEC TIMEOUT
    // =====================================================
    socket.on('start_broadcast', async (data: { streamId: string; userId?: number }) => {
      const { streamId } = data;
      
      logger.info(`🎥 Broadcast starting for stream ${streamId} by ${socket.id}`);
      
      socket.join(`broadcaster:${streamId}`);
      
      // Annuler tout timeout existant
      const existingTimeout = pendingConnections.get(streamId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        pendingConnections.delete(streamId);
      }
      
      // Créer ou mettre à jour la room
      let room = activeStreams.get(streamId);
      if (!room) {
        room = {
          streamId,
          broadcasterId: socket.id,
          viewers: new Set(),
          startTime: new Date()
        };
        activeStreams.set(streamId, room);
      }
      
      // ✅ AMÉLIORATION : Configurer le heartbeat pour ce stream
      if (room.heartbeatInterval) clearInterval(room.heartbeatInterval);
      room.heartbeatInterval = setInterval(() => {
        // Vérifier si le streamer est toujours connecté
        const broadcasterSocket = io.sockets.sockets.get(room!.broadcasterId);
        if (!broadcasterSocket) {
          logger.warn(`⚠️ Broadcaster ${room!.broadcasterId} disconnected for stream ${streamId}`);
          cleanupStream(streamId, 'Broadcaster disconnected');
        }
      }, CONFIG.HEARTBEAT_INTERVAL);
      
      // ✅ AMÉLIORATION : Timeout de connexion WebRTC
      room.connectionTimeout = setTimeout(() => {
        const currentRoom = activeStreams.get(streamId);
        if (currentRoom && currentRoom.viewers.size === 0) {
          logger.warn(`⏰ No viewers connected to stream ${streamId} after ${CONFIG.WEBRTC_CONNECTION_TIMEOUT / 1000}s`);
          // On ne termine pas le stream, mais on notifie le streamer
          io.to(currentRoom.broadcasterId).emit('no_viewers_warning', {
            message: 'Aucun spectateur connecté'
          });
        }
      }, CONFIG.WEBRTC_CONNECTION_TIMEOUT);
      
      // Mettre à jour le statut dans la base de données
      try {
        await query(
          `UPDATE live_streams 
           SET status = 'active', 
               start_time = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [streamId]
        );
        
        logger.info(`✅ Stream ${streamId} status updated to active`);
      } catch (error) {
        logger.error('Failed to update stream status:', error);
      }
      
      // Notifier les spectateurs potentiels
      io.emit('new_stream', { streamId, broadcaster: socket.id });
      
      // Informer les spectateurs déjà dans la room que le streamer est prêt
      io.to(`stream:${streamId}`).emit('broadcaster_ready', {
        streamId,
        broadcasterId: socket.id
      });
      
      logger.info(`🎥 Broadcast started for stream ${streamId} by ${socket.id}`);
    });
    
    // =====================================================
    // DONNÉES DU STREAM (CHUNKS VIDÉO)
    // =====================================================
    socket.on('stream_data', (data: { streamId: string; chunk: string }) => {
      // Relayer les données à tous les spectateurs
      socket.to(`stream:${data.streamId}`).emit('stream_chunk', {
        streamId: data.streamId,
        chunk: data.chunk,
        timestamp: Date.now()
      });
    });
    
    // =====================================================
    // OFFRE WEBRTC (STREAMER -> SPECTATEUR)
    // =====================================================
    socket.on('webrtc_offer', (data: { streamId: string; offer: WebRTCOffer }) => {
      logger.debug(`📡 WebRTC offer from ${socket.id} for stream ${data.streamId}`);
      
      // ✅ AMÉLIORATION : Vérifier que le stream existe
      const room = activeStreams.get(data.streamId);
      if (!room || room.broadcasterId !== socket.id) {
        logger.warn(`⚠️ Offer from unauthorized broadcaster: ${socket.id}`);
        return;
      }
      
      // Relayer l'offre à tous les spectateurs du stream
      socket.to(`stream:${data.streamId}`).emit('webrtc_offer', {
        socketId: socket.id,
        offer: data.offer
      });
    });
    
    // =====================================================
    // RÉPONSE WEBRTC (SPECTATEUR -> STREAMER)
    // =====================================================
    socket.on('webrtc_answer', (data: { targetId: string; answer: WebRTCAnswer }) => {
      logger.debug(`📡 WebRTC answer from ${socket.id} to ${data.targetId}`);
      
      io.to(data.targetId).emit('webrtc_answer', {
        socketId: socket.id,
        answer: data.answer
      });
    });
    
    // =====================================================
    // CANDIDAT ICE WEBRTC - AVEC GESTION D'ERREURS
    // =====================================================
    socket.on('webrtc_ice_candidate', (data: { targetId: string; candidate: WebRTCIceCandidate }) => {
      // ✅ AMÉLIORATION : Validation du candidate
      if (!data.candidate || !data.candidate.candidate) {
        logger.debug(`⚠️ Invalid ICE candidate from ${socket.id}`);
        return;
      }
      
      io.to(data.targetId).emit('webrtc_ice_candidate', {
        socketId: socket.id,
        candidate: data.candidate
      });
    });
    
    // =====================================================
    // STATUT DE LA CONNEXION WEBRTC
    // =====================================================
    socket.on('webrtc_connection_status', (data: { streamId: string; status: string; error?: string }) => {
      logger.debug(`📊 WebRTC status from ${socket.id}: ${data.status}`);
      
      if (data.status === 'failed' || data.status === 'disconnected') {
        logger.warn(`⚠️ WebRTC ${data.status} for ${socket.id}: ${data.error || 'Unknown error'}`);
        
        // Si c'est le streamer qui a un problème
        const room = activeStreams.get(data.streamId);
        if (room && room.broadcasterId === socket.id) {
          io.to(`stream:${data.streamId}`).emit('broadcaster_issue', {
            message: 'Problème de connexion avec le streamer, tentative de reconnexion...'
          });
        }
      }
    });
    
    // =====================================================
    // MESSAGE DE CHAT
    // =====================================================
    socket.on('chat_message', async (data: { streamId: string; message: string; userId?: number }) => {
      const messageData = {
        id: Date.now(),
        userId: data.userId || socket.data?.userId,
        username: socket.data?.username || 'Anonymous',
        message: data.message,
        timestamp: new Date().toISOString()
      };
      
      // Sauvegarder dans la base de données
      try {
        await query(
          `INSERT INTO live_chat_messages (live_stream_id, user_id, message, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [data.streamId, messageData.userId, data.message]
        );
      } catch (error) {
        logger.error('Failed to save chat message:', error);
      }
      
      // Diffuser à tous les spectateurs
      io.to(`stream:${data.streamId}`).emit('new_chat_message', messageData);
      
      logger.debug(`💬 Chat message in stream ${data.streamId}: ${data.message.substring(0, 50)}`);
    });
    
    // =====================================================
    // LIKE DU STREAM
    // =====================================================
    socket.on('like_stream', async (data: { streamId: string; userId?: number }) => {
      try {
        if (data.userId) {
          const existingLike = await query(
            `SELECT id FROM stream_likes WHERE stream_id = $1 AND user_id = $2`,
            [data.streamId, data.userId]
          );
          
          if (existingLike.rows.length > 0) {
            return;
          }
          
          await query(
            `INSERT INTO stream_likes (stream_id, user_id, created_at) VALUES ($1, $2, NOW())`,
            [data.streamId, data.userId]
          );
        }
        
        await query(
          `UPDATE live_streams SET like_count = like_count + 1 WHERE id = $1`,
          [data.streamId]
        );
        
        const result = await query(
          `SELECT like_count FROM live_streams WHERE id = $1`,
          [data.streamId]
        );
        
        const likeCount = result.rows[0]?.like_count || 0;
        
        io.to(`stream:${data.streamId}`).emit('like_update', { count: likeCount });
        
        logger.debug(`❤️ Like on stream ${data.streamId} (total: ${likeCount})`);
      } catch (error) {
        logger.error('Failed to process like:', error);
      }
    });
    
    // =====================================================
    // SUPER CHAT
    // =====================================================
    socket.on('super_chat', async (data: { 
      streamId: string; 
      userId: number; 
      amount: number; 
      message: string;
      color: string;
    }) => {
      try {
        const result = await query(
          `INSERT INTO super_chats (stream_id, user_id, amount, message, color, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *`,
          [data.streamId, data.userId, data.amount, data.message, data.color]
        );
        
        const superChat = result.rows[0];
        
        const userResult = await query(
          `SELECT username, avatar FROM users WHERE id = $1`,
          [data.userId]
        );
        
        const enrichedSuperChat = {
          ...superChat,
          username: userResult.rows[0]?.username || 'Anonymous',
          avatar: userResult.rows[0]?.avatar
        };
        
        io.to(`stream:${data.streamId}`).emit('new_super_chat', enrichedSuperChat);
        
        logger.info(`💎 Super Chat in stream ${data.streamId}: ${data.amount}€`);
      } catch (error) {
        logger.error('Failed to process super chat:', error);
      }
    });
    
    // =====================================================
    // LISTE DES SPECTATEURS
    // =====================================================
    socket.on('get_viewers', async (data: { streamId: string }) => {
      try {
        const result = await query(
          `SELECT DISTINCT u.id, u.username, u.avatar
           FROM live_viewers lv
           JOIN users u ON lv.user_id = u.id
           WHERE lv.stream_id = $1 AND lv.last_seen_at > NOW() - INTERVAL '5 minutes'`,
          [data.streamId]
        );
        
        socket.emit('viewers_list', { viewers: result.rows });
      } catch (error) {
        socket.emit('viewers_list', { viewers: [] });
      }
    });
    
    // =====================================================
    // TERMINER LA DIFFUSION
    // =====================================================
    socket.on('end_broadcast', async (data: { streamId: string }) => {
      const { streamId } = data;
      
      const room = activeStreams.get(streamId);
      if (room && room.broadcasterId === socket.id) {
        cleanupStream(streamId, 'Stream terminé par le diffuseur');
      } else {
        logger.warn(`⚠️ Unauthorized attempt to end stream ${streamId} by ${socket.id}`);
      }
    });
    
    // =====================================================
    // SIGNALEMENT DE STREAM
    // =====================================================
    socket.on('report_stream', async (data: { streamId: string; reason: string; userId: number }) => {
      try {
        await query(
          `INSERT INTO reports (reporter_id, stream_id, report_type, reason, created_at)
           VALUES ($1, $2, 'stream_violation', $3, NOW())`,
          [data.userId, data.streamId, data.reason]
        );
        
        logger.info(`🚨 Stream ${data.streamId} reported by user ${data.userId}: ${data.reason}`);
        
        io.to('moderators').emit('new_report', {
          streamId: data.streamId,
          reason: data.reason
        });
      } catch (error) {
        logger.error('Failed to process stream report:', error);
      }
    });
    
    // =====================================================
    // DÉCONNEXION
    // =====================================================
    socket.on('disconnect', () => {
      // Nettoyer les streams où le client était spectateur
      streamViewers.forEach((viewers, streamId) => {
        if (viewers.has(socket.id)) {
          viewers.delete(socket.id);
          updateViewerCountInRoom(streamId);
        }
      });
      
      // Vérifier si c'était un streamer
      activeStreams.forEach((room, streamId) => {
        if (room.broadcasterId === socket.id) {
          cleanupStream(streamId, 'Streamer déconnecté');
        }
      });
      
      viewerLastSeen.delete(socket.id);
      
      logger.debug(`🔌 Streaming client disconnected: ${socket.id}`);
    });
  });
}

// =====================================================
// FONCTION UTILITAIRE - MISE À JOUR DU COMPTEUR
// =====================================================
async function updateViewerCount(streamId: string, count: number): Promise<void> {
  try {
    await query(
      `UPDATE live_streams 
       SET viewer_count = $1, 
           peak_viewers = GREATEST(COALESCE(peak_viewers, 0), $1),
           updated_at = NOW()
       WHERE id = $2`,
      [count, streamId]
    );
    
    await query(
      `INSERT INTO stream_analytics (stream_id, viewer_count, timestamp)
       VALUES ($1, $2, NOW())`,
      [streamId, count]
    );
  } catch (error) {
    logger.error('Failed to update viewer count in database:', error);
  }
}

// =====================================================
// EXPORT DES FONCTIONS UTILITAIRES
// =====================================================
export function getActiveStreams(): string[] {
  return Array.from(activeStreams.keys());
}

export function getStreamViewers(streamId: string): number {
  return streamViewers.get(streamId)?.size || 0;
}

export function isStreamActive(streamId: string): boolean {
  return activeStreams.has(streamId);
}

export function getStreamInfo(streamId: string): StreamRoom | undefined {
  return activeStreams.get(streamId);
}

export default {
  initializeStreamServer,
  getActiveStreams,
  getStreamViewers,
  isStreamActive,
  getStreamInfo
};