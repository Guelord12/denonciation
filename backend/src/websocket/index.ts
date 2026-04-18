import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userData?: any;
}

// =====================================================
// FONCTIONS UTILITAIRES POUR REMPLACER REDIS
// =====================================================

async function updateTotalViewersCount(io: Server): Promise<void> {
  try {
    const result = await query(
      "SELECT COALESCE(SUM(viewer_count), 0) as total FROM live_streams WHERE status = 'active'"
    );
    const total = parseInt(result.rows[0]?.total || '0');
    
    // Émettre aux admins
    io.to('admins').emit('total_viewers_update', { total });
  } catch (error) {
    logger.error('Failed to update total viewers count:', error);
  }
}

export function setupSocketHandlers(io: Server) {
  // =====================================================
  // MIDDLEWARE D'AUTHENTIFICATION OBLIGATOIRE
  // =====================================================
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      
      logger.debug(`🔐 Socket auth attempt - token present: ${!!token}`);

      if (!token || token === '' || token === 'null' || token === 'undefined') {
        logger.warn(`❌ Socket connection rejected: No authentication token provided`);
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        const result = await query(
          'SELECT id, username, avatar, first_name, last_name, is_admin, is_banned FROM users WHERE id = $1',
          [decoded.userId || decoded.id]
        );

        if (result.rows.length === 0) {
          logger.warn(`❌ Socket connection rejected: User not found`);
          return next(new Error('User not found'));
        }

        const user = result.rows[0];
        
        if (user.is_banned) {
          logger.warn(`❌ Socket connection rejected: User ${user.id} is banned`);
          return next(new Error('User is banned'));
        }

        socket.userId = user.id;
        socket.userData = user;
        
        logger.info(`✅ Socket authenticated for user ${user.id} (${user.username})${user.is_admin ? ' [ADMIN]' : ''}`);
        return next();
        
      } catch (tokenError: any) {
        logger.warn(`❌ Socket connection rejected: Invalid token - ${tokenError.message}`);
        
        if (tokenError.name === 'TokenExpiredError') {
          return next(new Error('Token expired'));
        }
        if (tokenError.name === 'JsonWebTokenError') {
          return next(new Error('Invalid token'));
        }
        
        return next(new Error('Authentication failed'));
      }
      
    } catch (error: any) {
      logger.error('❌ Socket auth middleware error:', error);
      return next(new Error('Authentication error'));
    }
  });

  // =====================================================
  // GESTION DES CONNEXIONS
  // =====================================================
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const userData = socket.userData;
    
    logger.info(`🔌 User connected: ${userId} (${userData?.username}) - Socket ID: ${socket.id}${userData?.is_admin ? ' [ADMIN]' : ''}`);

    if (userData?.is_admin) {
      socket.join('admins');
      logger.info(`👑 Admin ${userData.username} joined admins room`);
    }

    // =====================================================
    // STREAM EVENTS
    // =====================================================
    
    socket.on('join_stream', (streamId: string) => {
      socket.join(`stream:${streamId}`);
      
      query(
        `INSERT INTO live_viewers (stream_id, user_id, joined_at, last_seen_at) 
         VALUES ($1, $2, NOW(), NOW()) 
         ON CONFLICT (stream_id, user_id) DO UPDATE SET last_seen_at = NOW()`,
        [streamId, userId]
      ).catch(err => logger.error('Failed to record viewer:', err));
      
      const viewerCount = io.sockets.adapter.rooms.get(`stream:${streamId}`)?.size || 0;
      io.to(`stream:${streamId}`).emit('viewer_count_update', {
        streamId,
        count: viewerCount,
      });
      
      updateTotalViewersCount(io);
      
      logger.debug(`User ${userId} joined stream ${streamId}`);
    });

    socket.on('leave_stream', (streamId: string) => {
      socket.leave(`stream:${streamId}`);
      
      query(
        `UPDATE live_viewers SET last_seen_at = NOW() WHERE stream_id = $1 AND user_id = $2`,
        [streamId, userId]
      ).catch(err => logger.error('Failed to update viewer:', err));
      
      const viewerCount = io.sockets.adapter.rooms.get(`stream:${streamId}`)?.size || 0;
      io.to(`stream:${streamId}`).emit('viewer_count_update', {
        streamId,
        count: viewerCount,
      });
      
      updateTotalViewersCount(io);
      
      logger.debug(`User ${userId} left stream ${streamId}`);
    });

    socket.on('chat_message', async (data: { streamId: string; message: string }) => {
      if (!data.message || data.message.trim().length === 0) return;
      
      try {
        const result = await query(
          `INSERT INTO live_chat_messages (live_stream_id, user_id, message, created_at) 
           VALUES ($1, $2, $3, NOW()) RETURNING id, created_at`,
          [data.streamId, userId, data.message.trim()]
        );
        
        const messageData = {
          id: result.rows[0].id,
          userId,
          username: userData?.username,
          avatar: userData?.avatar,
          message: data.message.trim(),
          timestamp: result.rows[0].created_at,
        };
        
        io.to(`stream:${data.streamId}`).emit('new_chat_message', messageData);
        logger.debug(`💬 Chat message from ${userId} in stream ${data.streamId}`);
      } catch (error) {
        logger.error('Chat message error:', error);
      }
    });

    // =====================================================
    // BROADCAST EVENTS (STREAMER UNIQUEMENT)
    // =====================================================
    
    socket.on('start_broadcast', async (data: { streamId: string }) => {
      const streamCheck = await query(
        'SELECT user_id FROM live_streams WHERE id = $1',
        [data.streamId]
      );
      
      if (streamCheck.rows.length === 0) {
        logger.warn(`User ${userId} tried to start broadcast on non-existent stream ${data.streamId}`);
        return;
      }
      
      if (streamCheck.rows[0].user_id !== userId) {
        logger.warn(`User ${userId} tried to start broadcast on stream ${data.streamId} owned by ${streamCheck.rows[0].user_id}`);
        return;
      }
      
      logger.info(`🎥 User ${userId} started broadcasting on stream ${data.streamId}`);
      
      io.to(`stream:${data.streamId}`).emit('broadcast_started', { 
        streamId: data.streamId,
        streamerId: userId,
        streamerName: userData?.username,
        timestamp: new Date().toISOString()
      });
      
      await query(
        `UPDATE live_streams SET status = 'active', start_time = NOW() WHERE id = $1 AND user_id = $2`,
        [data.streamId, userId]
      );
      
      io.to('admins').emit('admin_notification', {
        type: 'stream_started',
        streamId: data.streamId,
        userId,
        username: userData?.username,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`✅ Stream ${data.streamId} is now active`);
    });

    socket.on('stream_data', (data: { streamId: string; chunk: string }) => {
      socket.to(`stream:${data.streamId}`).emit('stream_chunk', {
        chunk: data.chunk,
        timestamp: Date.now()
      });
    });

    socket.on('end_broadcast', async (data: { streamId: string }) => {
      const streamCheck = await query(
        'SELECT user_id FROM live_streams WHERE id = $1',
        [data.streamId]
      );
      
      if (streamCheck.rows.length === 0 || streamCheck.rows[0].user_id !== userId) {
        logger.warn(`User ${userId} tried to end broadcast on unauthorized stream ${data.streamId}`);
        return;
      }
      
      logger.info(`🛑 User ${userId} ended broadcast on stream ${data.streamId}`);
      
      io.to(`stream:${data.streamId}`).emit('broadcast_ended', { 
        streamId: data.streamId,
        timestamp: new Date().toISOString()
      });
      
      await query(
        `UPDATE live_streams SET status = 'ended', end_time = NOW() WHERE id = $1 AND user_id = $2`,
        [data.streamId, userId]
      );
      
      io.to('admins').emit('admin_notification', {
        type: 'stream_ended',
        streamId: data.streamId,
        userId,
        username: userData?.username,
        timestamp: new Date().toISOString()
      });
      
      logger.info(`✅ Stream ${data.streamId} has ended`);
    });

    // =====================================================
    // INTERACTION EVENTS
    // =====================================================
    
    socket.on('like_stream', async (data: { streamId: string }) => {
      try {
        const existingLike = await query(
          'SELECT id FROM stream_likes WHERE stream_id = $1 AND user_id = $2',
          [data.streamId, userId]
        );
        
        if (existingLike.rows.length > 0) {
          await query(
            'DELETE FROM stream_likes WHERE stream_id = $1 AND user_id = $2',
            [data.streamId, userId]
          );
          await query(
            'UPDATE live_streams SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1',
            [data.streamId]
          );
        } else {
          await query(
            'INSERT INTO stream_likes (stream_id, user_id, created_at) VALUES ($1, $2, NOW())',
            [data.streamId, userId]
          );
          await query(
            'UPDATE live_streams SET like_count = COALESCE(like_count, 0) + 1 WHERE id = $1',
            [data.streamId]
          );
        }
        
        const result = await query(
          'SELECT like_count FROM live_streams WHERE id = $1',
          [data.streamId]
        );
        
        const likeCount = result.rows[0]?.like_count || 0;
        io.to(`stream:${data.streamId}`).emit('like_update', { count: likeCount });
        logger.debug(`Stream ${data.streamId} like toggled by ${userId}, total: ${likeCount}`);
      } catch (error) {
        logger.error('Like stream error:', error);
      }
    });

    socket.on('get_viewers', async (data: { streamId: string }) => {
      try {
        const viewers = await query(
          `SELECT DISTINCT u.id, u.username, u.avatar 
           FROM live_viewers lv 
           JOIN users u ON lv.user_id = u.id 
           WHERE lv.stream_id = $1 AND lv.last_seen_at > NOW() - INTERVAL '5 minutes'`,
          [data.streamId]
        );
        socket.emit('viewers_list', { viewers: viewers.rows });
      } catch (error) {
        logger.error('Get viewers error:', error);
      }
    });

    // =====================================================
    // DISCONNECT
    // =====================================================
    
    socket.on('disconnect', async () => {
      logger.info(`🔌 User disconnected: ${userId} (${userData?.username}) - Socket ID: ${socket.id}`);
      
      try {
        await query(
          `UPDATE live_viewers SET last_seen_at = NOW() WHERE user_id = $1`,
          [userId]
        );
      } catch (error) {
        logger.error('Failed to update viewer on disconnect:', error);
      }
    });
  });
  
  logger.info('✅ WebSocket handlers configured (Redis disabled)');
}