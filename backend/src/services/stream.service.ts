// =====================================================
// SERVICE DE STREAMING - VERSION SANS FFMPEG (WEBRTC)
// =====================================================
import { logger } from '../utils/logger';
import { io } from '../index';
import { query } from '../database/connection';
import fs from 'fs';
import path from 'path';

// =====================================================
// TYPES PERSONNALISÉS POUR WEBRTC (évite l'erreur TypeScript)
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
}

// =====================================================
// GESTION DES STREAMS EN MÉMOIRE
// =====================================================
const activeStreams = new Map<string, StreamRoom>();
const streamViewers = new Map<string, Set<string>>();

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
  
  logger.info('✅ WebRTC streaming server initialized successfully');
  logger.info('   📡 WebRTC signaling ready');
  logger.info('   🎬 Streams can be started without FFmpeg');
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
      
      // Mettre à jour le compteur de spectateurs
      io.to(`stream:${streamId}`).emit('viewer_count_update', {
        streamId,
        count: viewers.size
      });
      
      // Enregistrer dans la base de données
      updateViewerCount(streamId, viewers.size).catch(err => {
        logger.error('Failed to update viewer count:', err);
      });
      
      // Ajouter à la table live_viewers
      if (userId) {
        query(
          `INSERT INTO live_viewers (stream_id, user_id, joined_at, last_seen_at)
           VALUES ($1, $2, NOW(), NOW())
           ON CONFLICT (stream_id, user_id) DO UPDATE SET last_seen_at = NOW()`,
          [streamId, userId]
        ).catch(err => logger.error('Failed to insert viewer:', err));
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
        
        io.to(`stream:${streamId}`).emit('viewer_count_update', {
          streamId,
          count: viewers.size
        });
        
        updateViewerCount(streamId, viewers.size).catch(err => {
          logger.error('Failed to update viewer count:', err);
        });
        
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
    // DÉMARRER LA DIFFUSION (STREAMER)
    // =====================================================
    socket.on('start_broadcast', async (data: { streamId: string; userId?: number }) => {
      const { streamId } = data;
      
      socket.join(`broadcaster:${streamId}`);
      
      // Créer ou mettre à jour la room
      if (!activeStreams.has(streamId)) {
        activeStreams.set(streamId, {
          streamId,
          broadcasterId: socket.id,
          viewers: new Set(),
          startTime: new Date()
        });
      }
      
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
      io.emit('new_stream', { streamId });
      socket.broadcast.emit('stream_started', { streamId });
      
      logger.info(`🎥 Broadcast started for stream ${streamId} by ${socket.id}`);
    });
    
    // =====================================================
    // DONNÉES DU STREAM (CHUNKS VIDÉO)
    // =====================================================
    socket.on('stream_data', (data: { streamId: string; chunk: string }) => {
      // Relayer les données à tous les spectateurs
      socket.to(`stream:${data.streamId}`).emit('stream_chunk', {
        streamId: data.streamId,
        chunk: data.chunk
      });
    });
    
    // =====================================================
    // OFFRE WEBRTC (STREAMER -> SPECTATEURS)
    // =====================================================
    socket.on('webrtc_offer', (data: { streamId: string; offer: WebRTCOffer }) => {
      logger.debug(`📡 WebRTC offer from ${socket.id} for stream ${data.streamId}`);
      
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
    // CANDIDAT ICE WEBRTC
    // =====================================================
    socket.on('webrtc_ice_candidate', (data: { targetId: string; candidate: WebRTCIceCandidate }) => {
      io.to(data.targetId).emit('webrtc_ice_candidate', {
        socketId: socket.id,
        candidate: data.candidate
      });
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
        // Vérifier si l'utilisateur a déjà liké
        if (data.userId) {
          const existingLike = await query(
            `SELECT id FROM stream_likes WHERE stream_id = $1 AND user_id = $2`,
            [data.streamId, data.userId]
          );
          
          if (existingLike.rows.length > 0) {
            // Déjà liké, on ignore
            return;
          }
          
          // Ajouter le like
          await query(
            `INSERT INTO stream_likes (stream_id, user_id, created_at) VALUES ($1, $2, NOW())`,
            [data.streamId, data.userId]
          );
        }
        
        // Mettre à jour le compteur de likes
        await query(
          `UPDATE live_streams SET like_count = like_count + 1 WHERE id = $1`,
          [data.streamId]
        );
        
        // Récupérer le nouveau compte
        const result = await query(
          `SELECT like_count FROM live_streams WHERE id = $1`,
          [data.streamId]
        );
        
        const likeCount = result.rows[0]?.like_count || 0;
        
        // Notifier tous les spectateurs
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
        
        // Récupérer les infos utilisateur
        const userResult = await query(
          `SELECT username, avatar FROM users WHERE id = $1`,
          [data.userId]
        );
        
        const enrichedSuperChat = {
          ...superChat,
          username: userResult.rows[0]?.username || 'Anonymous',
          avatar: userResult.rows[0]?.avatar
        };
        
        // Diffuser à tous
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
      const viewers = streamViewers.get(data.streamId) || new Set();
      
      // Récupérer les infos des utilisateurs depuis la base
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
        // Fallback avec les socket IDs
        const viewerList = Array.from(viewers).map(socketId => ({
          socketId,
          username: `Viewer_${socketId.substring(0, 4)}`
        }));
        
        socket.emit('viewers_list', { viewers: viewerList });
      }
    });
    
    // =====================================================
    // TERMINER LA DIFFUSION
    // =====================================================
    socket.on('end_broadcast', async (data: { streamId: string }) => {
      const { streamId } = data;
      
      // Notifier tous les spectateurs
      io.to(`stream:${streamId}`).emit('stream_ended', {
        streamId,
        message: 'Le stream est terminé'
      });
      
      io.emit('stream_ended_global', { streamId });
      
      // Mettre à jour la base de données
      try {
        await query(
          `UPDATE live_streams 
           SET status = 'ended', 
               end_time = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [streamId]
        );
        
        logger.info(`✅ Stream ${streamId} ended and status updated`);
      } catch (error) {
        logger.error('Failed to update stream end status:', error);
      }
      
      // Nettoyer les données en mémoire
      activeStreams.delete(streamId);
      streamViewers.delete(streamId);
      
      logger.info(`🛑 Broadcast ended for stream ${streamId}`);
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
        
        // Notifier les modérateurs
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
          
          io.to(`stream:${streamId}`).emit('viewer_count_update', {
            streamId,
            count: viewers.size
          });
          
          updateViewerCount(streamId, viewers.size).catch(err => {
            logger.error('Failed to update viewer count on disconnect:', err);
          });
        }
      });
      
      // Vérifier si c'était un streamer
      activeStreams.forEach((room, streamId) => {
        if (room.broadcasterId === socket.id) {
          // Le streamer s'est déconnecté, terminer le stream
          io.to(`stream:${streamId}`).emit('stream_ended', {
            streamId,
            message: 'Le streamer s\'est déconnecté'
          });
          
          io.emit('stream_ended_global', { streamId });
          
          activeStreams.delete(streamId);
          streamViewers.delete(streamId);
          
          // Mettre à jour la base de données
          query(
            `UPDATE live_streams 
             SET status = 'ended', 
                 end_time = NOW()
             WHERE id = $1`,
            [streamId]
          ).catch(err => logger.error('Failed to update stream on disconnect:', err));
          
          logger.info(`🛑 Stream ${streamId} ended due to broadcaster disconnect`);
        }
      });
      
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
    
    // Enregistrer dans les analytics
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