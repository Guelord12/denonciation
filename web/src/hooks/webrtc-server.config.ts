import { Server } from 'socket.io';
import { logger } from '../utils/logger';

// Configuration du serveur WebRTC (sans FFmpeg)
export function setupWebRTCServer(io: Server) {
  const streams = new Map<string, Set<string>>();
  const viewers = new Map<string, number>();

  io.on('connection', (socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);

    // Rejoindre un stream
    socket.on('join_stream', (streamId: string) => {
      socket.join(`stream:${streamId}`);
      
      if (!streams.has(streamId)) {
        streams.set(streamId, new Set());
      }
      
      const viewers = streams.get(streamId)!;
      viewers.add(socket.id);
      
      io.to(`stream:${streamId}`).emit('viewer_count_update', {
        streamId,
        count: viewers.size
      });
      
      logger.info(`👤 Client ${socket.id} joined stream ${streamId}`);
    });

    // Quitter un stream
    socket.on('leave_stream', (streamId: string) => {
      socket.leave(`stream:${streamId}`);
      
      const viewers = streams.get(streamId);
      if (viewers) {
        viewers.delete(socket.id);
        io.to(`stream:${streamId}`).emit('viewer_count_update', {
          streamId,
          count: viewers.size
        });
      }
      
      logger.info(`👋 Client ${socket.id} left stream ${streamId}`);
    });

    // Démarrer la diffusion
    socket.on('start_broadcast', (data: { streamId: string }) => {
      socket.join(`broadcaster:${data.streamId}`);
      socket.broadcast.emit('stream_started', { streamId: data.streamId });
      logger.info(`🎥 Broadcast started for stream ${data.streamId}`);
    });

    // Données du stream (WebRTC signaling)
    socket.on('stream_data', (data: { streamId: string; chunk: string }) => {
      socket.to(`stream:${data.streamId}`).emit('stream_chunk', {
        streamId: data.streamId,
        chunk: data.chunk
      });
    });

    // Signal WebRTC - Offer
    socket.on('webrtc_offer', (data: { streamId: string; offer: any }) => {
      socket.to(`stream:${data.streamId}`).emit('webrtc_offer', {
        socketId: socket.id,
        offer: data.offer
      });
    });

    // Signal WebRTC - Answer
    socket.on('webrtc_answer', (data: { targetId: string; answer: any }) => {
      io.to(data.targetId).emit('webrtc_answer', {
        socketId: socket.id,
        answer: data.answer
      });
    });

    // Signal WebRTC - ICE Candidate
    socket.on('webrtc_ice_candidate', (data: { targetId: string; candidate: any }) => {
      io.to(data.targetId).emit('webrtc_ice_candidate', {
        socketId: socket.id,
        candidate: data.candidate
      });
    });

    // Chat message
    socket.on('chat_message', async (data: { streamId: string; message: string }) => {
      // Sauvegarder le message dans la base de données
      // Émettre à tous les spectateurs
      io.to(`stream:${data.streamId}`).emit('new_chat_message', {
        id: Date.now(),
        userId: socket.data.userId,
        username: socket.data.username,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });

    // Like
    socket.on('like_stream', (data: { streamId: string }) => {
      io.to(`stream:${data.streamId}`).emit('like_update', {
        streamId: data.streamId
      });
    });

    // Fin de stream
    socket.on('end_broadcast', (data: { streamId: string }) => {
      io.to(`stream:${data.streamId}`).emit('stream_ended', {
        streamId: data.streamId
      });
      streams.delete(data.streamId);
      logger.info(`🛑 Broadcast ended for stream ${data.streamId}`);
    });

    // Déconnexion
    socket.on('disconnect', () => {
      streams.forEach((viewers, streamId) => {
        if (viewers.has(socket.id)) {
          viewers.delete(socket.id);
          io.to(`stream:${streamId}`).emit('viewer_count_update', {
            streamId,
            count: viewers.size
          });
        }
      });
      logger.info(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}