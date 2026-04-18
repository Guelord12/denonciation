import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { io } from '../index';
import crypto from 'crypto';
import { moderateReport } from '../services/aiModeration.service';

// =====================================================
// TYPES ET INTERFACES
// =====================================================

interface CreateStreamData {
  title: string;
  description?: string;
  is_premium: boolean;
  price: number;
  channel_id?: number;
  scheduled_for?: Date | string | null;
  tags?: string[];
  thumbnail?: string;
  location?: { latitude: number; longitude: number };
  settings?: { filter?: string; camera_type?: string };
  category?: string;
}

interface StreamUpdateData {
  title?: string;
  description?: string;
  is_premium?: boolean;
  price?: number;
  status?: 'active' | 'paused' | 'ended';
  category?: string;
  tags?: string[];
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function getParamId(params: any): string {
  if (!params) return '';
  if (Array.isArray(params.id)) return params.id[0];
  return String(params.id || '');
}

async function logActivity(userId: number, action: string, entityType: string, entityId: number, req: Request, metadata?: any): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entityType, entityId, req.ip || req.socket.remoteAddress || 'unknown', req.headers['user-agent'] || 'unknown']
    );
  } catch (error) {
    logger.error('❌ Log activity error:', error);
  }
}

async function filterBadWords(message: string): Promise<{ clean: boolean; filtered: string }> {
  try {
    const bannedWords = await query('SELECT word, replacement FROM banned_words');
    let filtered = message;
    for (const row of bannedWords.rows) {
      const regex = new RegExp(`\\b${row.word}\\b`, 'gi');
      filtered = filtered.replace(regex, row.replacement || '***');
    }
    return { clean: filtered === message, filtered };
  } catch (error) {
    return { clean: true, filtered: message };
  }
}

// =====================================================
// CONTRÔLEUR : CRÉER UN STREAM
// =====================================================

export async function createLiveStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, is_premium, price, channel_id, scheduled_for, tags, thumbnail, location, settings, category }: CreateStreamData = req.body;

    logger.info(`📝 Creating stream for user ${userId}: ${title}`);

    if (!title || title.trim().length < 3) { 
      res.status(400).json({ error: 'Le titre doit contenir au moins 3 caractères' }); 
      return; 
    }
    if (title.trim().length > 255) { 
      res.status(400).json({ error: 'Le titre ne peut pas dépasser 255 caractères' }); 
      return; 
    }
    if (is_premium && (!price || price <= 0)) { 
      res.status(400).json({ error: 'Un prix valide est requis pour un stream premium' }); 
      return; 
    }

    const streamKey = `live_${userId}_${crypto.randomBytes(16).toString('hex')}`;
    const streamUrl = `${process.env.STREAM_SERVER_URL || 'rtmp://localhost:1935/live'}/${streamKey}`;
    const hlsUrl = `${process.env.HLS_SERVER_URL || 'http://localhost:8000/live'}/${streamKey}/index.m3u8`;

    let scheduledForValue: Date | null = null;
    if (scheduled_for) { 
      scheduledForValue = new Date(scheduled_for); 
      if (isNaN(scheduledForValue.getTime())) scheduledForValue = null; 
    }

    const initialStatus = scheduledForValue ? 'scheduled' : 'active';
    const startTimeValue = scheduledForValue ? null : new Date();

    logger.info(`🔑 Stream key generated: ${streamKey.substring(0, 10)}...`);

    // ✅ CORRECTION : Utiliser uniquement les colonnes qui existent réellement
    const result = await query(
      `INSERT INTO live_streams 
       (user_id, title, description, is_premium, price, stream_key, stream_url, status, start_time, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [
        userId,                                                    // $1
        title.trim(),                                              // $2
        description?.trim() || null,                               // $3
        is_premium || false,                                       // $4
        price || 0,                                                // $5
        streamKey,                                                 // $6
        streamUrl,                                                 // $7
        initialStatus,                                             // $8
        startTimeValue                                             // $9
      ]
    );

    const stream = result.rows[0];
    logger.info(`✅ Stream inserted with ID: ${stream.id}`);

    try { 
      if (redisClient && redisClient.isOpen) { 
        await redisClient.hSet('active_streams', stream.id.toString(), JSON.stringify({ ...stream, username: req.user!.username, avatar: req.user!.avatar })); 
        await redisClient.expire('active_streams', 3600); 
        logger.info(`📦 Stream cached in Redis`);
      } 
    } catch (redisError) { 
      logger.warn('⚠️ Redis error:', redisError); 
    }

    io.emit('new_stream', { ...stream, username: req.user!.username, avatar: req.user!.avatar });
    logger.info(`📡 WebSocket event emitted`);
    
    await logActivity(userId, 'CREATE_STREAM', 'live_stream', stream.id, req, { is_premium, scheduled: !!scheduledForValue });
    
    logger.info(`🎥 Stream created successfully: ${stream.id} by user ${userId}`);
    res.status(201).json(stream);
    
  } catch (error) {
    logger.error('❌ Create live stream error:', error);
    logger.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ error: 'Erreur lors de la création du stream' });
  }
}

// =====================================================
// CONTRÔLEUR : RÉCUPÉRER TOUS LES STREAMS
// =====================================================

export async function getLiveStreams(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', premium, category, channel_id, status = 'active', search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramCounter = 1;

    if (status !== 'all') { whereConditions.push(`ls.status = $${paramCounter++}`); params.push(status); }
    if (premium !== undefined) { whereConditions.push(`ls.is_premium = $${paramCounter++}`); params.push(premium === 'true'); }
    if (category) { whereConditions.push(`ls.category = $${paramCounter++}`); params.push(category); }
    if (channel_id) { whereConditions.push(`ls.channel_id = $${paramCounter++}`); params.push(Number(channel_id)); }
    if (search) { whereConditions.push(`(ls.title ILIKE $${paramCounter} OR ls.description ILIKE $${paramCounter})`); params.push(`%${search}%`); paramCounter++; }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const streams = await query(
      `SELECT ls.*, u.username, u.avatar, 
        (SELECT COUNT(*) FROM live_viewers WHERE stream_id = ls.id) as current_viewers,
        (SELECT COUNT(*) FROM stream_likes WHERE stream_id = ls.id) as current_likes
       FROM live_streams ls 
       LEFT JOIN users u ON ls.user_id = u.id 
       ${whereClause} 
       ORDER BY CASE WHEN ls.status = 'active' THEN 0 ELSE 1 END, ls.viewer_count DESC, ls.start_time DESC 
       LIMIT $${paramCounter++} OFFSET $${paramCounter++}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(`SELECT COUNT(*) as total FROM live_streams ls ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);

    res.json({ streams: streams.rows, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum), has_more: offset + limitNum < total } });
  } catch (error) {
    logger.error('❌ Get live streams error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : RÉCUPÉRER UN STREAM PAR ID
// =====================================================

export async function getLiveStreamById(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = (req as AuthRequest).user?.id;

    const result = await query(
      `SELECT ls.*, u.username, u.avatar, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM live_viewers WHERE stream_id = ls.id) as current_viewers,
        (SELECT COUNT(*) FROM stream_likes WHERE stream_id = ls.id) as current_likes
       FROM live_streams ls 
       LEFT JOIN users u ON ls.user_id = u.id 
       WHERE ls.id = $1`, [id]
    );

    if (result.rows.length === 0) { res.status(404).json({ error: 'Stream non trouvé' }); return; }
    const stream = result.rows[0];

    let hasAccess = true;
    let isSubscribed = false;
    
    if (stream.is_premium && userId && stream.user_id !== userId) {
      const subResult = await query(`SELECT id FROM subscriptions WHERE live_stream_id = $1 AND user_id = $2 AND payment_status = 'completed'`, [id, userId]);
      isSubscribed = subResult.rows.length > 0;
      if (!isSubscribed && stream.channel_id) {
        const channelSubResult = await query(`SELECT id FROM channel_subscriptions WHERE channel_id = $1 AND user_id = $2 AND status = 'active' AND expires_at > NOW()`, [stream.channel_id, userId]);
        isSubscribed = channelSubResult.rows.length > 0;
      }
      hasAccess = isSubscribed;
    }

    if (stream.status === 'active') {
      await query('UPDATE live_streams SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1', [id]);
    }

    const messages = await query(
      `SELECT cm.id, cm.message, cm.created_at, u.id as user_id, u.username, u.avatar 
       FROM live_chat_messages cm LEFT JOIN users u ON cm.user_id = u.id 
       WHERE cm.live_stream_id = $1 ORDER BY cm.created_at DESC LIMIT 100`, [id]
    );

    const superChats = await query(
      `SELECT sc.*, u.username, u.avatar FROM super_chats sc 
       LEFT JOIN users u ON sc.user_id = u.id 
       WHERE sc.stream_id = $1 AND sc.is_pinned = true ORDER BY sc.amount DESC LIMIT 5`, [id]
    );

    let tags = [];
    try { tags = stream.tags ? JSON.parse(stream.tags) : []; } catch { tags = []; }

    res.json({ ...stream, hasAccess, isSubscribed, messages: messages.rows.reverse(), super_chats: superChats.rows, tags, is_owner: stream.user_id === userId });
  } catch (error) {
    logger.error('❌ Get live stream by id error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : METTRE À JOUR UN STREAM
// =====================================================

export async function updateLiveStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const updates: StreamUpdateData = req.body;

    const streamResult = await query('SELECT * FROM live_streams WHERE id = $1 AND user_id = $2', [id, userId]);
    if (streamResult.rows.length === 0) { res.status(404).json({ error: 'Stream non trouvé ou non autorisé' }); return; }

    const stream = streamResult.rows[0];
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCounter = 1;

    if (updates.title !== undefined) { 
      if (updates.title.trim().length < 3) { res.status(400).json({ error: 'Le titre doit contenir au moins 3 caractères' }); return; }
      updateFields.push(`title = $${paramCounter++}`); 
      updateValues.push(updates.title.trim()); 
    }
    if (updates.description !== undefined) { updateFields.push(`description = $${paramCounter++}`); updateValues.push(updates.description?.trim() || null); }
    if (updates.is_premium !== undefined) { updateFields.push(`is_premium = $${paramCounter++}`); updateValues.push(updates.is_premium); }
    if (updates.price !== undefined) { updateFields.push(`price = $${paramCounter++}`); updateValues.push(updates.price); }
    if (updates.category !== undefined) { updateFields.push(`category = $${paramCounter++}`); updateValues.push(updates.category); }
    if (updates.tags !== undefined) { updateFields.push(`tags = $${paramCounter++}::text`); updateValues.push(JSON.stringify(updates.tags)); }
    if (updates.status !== undefined) { 
      updateFields.push(`status = $${paramCounter++}`); 
      updateValues.push(updates.status); 
      if (updates.status === 'ended') updateFields.push(`end_time = NOW()`); 
    }

    if (updateFields.length === 0) { res.status(400).json({ error: 'Aucune modification fournie' }); return; }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await query(`UPDATE live_streams SET ${updateFields.join(', ')} WHERE id = $${paramCounter} RETURNING *`, updateValues);
    const updatedStream = result.rows[0];

    try { if (redisClient && redisClient.isOpen) await redisClient.hSet('active_streams', id, JSON.stringify({ ...updatedStream, username: req.user!.username })); } catch (redisError) { logger.warn('⚠️ Redis error:', redisError); }

    io.to(`stream:${id}`).emit('stream_updated', updatedStream);
    await logActivity(userId, 'UPDATE_STREAM', 'live_stream', parseInt(id), req, updates);
    res.json(updatedStream);
  } catch (error) {
    logger.error('❌ Update live stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : TERMINER UN STREAM
// =====================================================

export async function endLiveStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;

    const result = await query(`UPDATE live_streams SET status = 'ended', end_time = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`, [id, userId]);
    if (result.rows.length === 0) { res.status(404).json({ error: 'Stream non trouvé ou non autorisé' }); return; }
    const stream = result.rows[0];

    try { if (redisClient && redisClient.isOpen) { await redisClient.hDel('active_streams', id); await redisClient.hDel('stream_viewers', id); } } catch (redisError) { logger.warn('⚠️ Redis error:', redisError); }

    io.to(`stream:${id}`).emit('stream_ended', { streamId: id, message: 'Ce live est terminé' });
    io.emit('stream_ended_global', { streamId: id });
    await logActivity(userId, 'END_STREAM', 'live_stream', parseInt(id), req, {});
    
    res.json({ message: 'Stream terminé avec succès', stream });
  } catch (error) {
    logger.error('❌ End live stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : S'ABONNER À UN STREAM
// =====================================================

export async function subscribeToStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { payment_method_id } = req.body;

    const streamResult = await query('SELECT * FROM live_streams WHERE id = $1 AND is_premium = true', [id]);
    if (streamResult.rows.length === 0) { res.status(404).json({ error: 'Stream premium non trouvé' }); return; }
    const stream = streamResult.rows[0];

    const existingSub = await query('SELECT id FROM subscriptions WHERE live_stream_id = $1 AND user_id = $2', [id, userId]);
    if (existingSub.rows.length > 0) { res.status(400).json({ error: 'Déjà abonné à ce stream' }); return; }

    const subResult = await query(`INSERT INTO subscriptions (user_id, live_stream_id, amount, payment_status, payment_method_id) VALUES ($1, $2, $3, 'completed', $4) RETURNING *`, [userId, id, stream.price, payment_method_id || null]);
    
    await logActivity(userId, 'SUBSCRIBE_STREAM', 'live_stream', parseInt(id), req, { amount: stream.price });
    res.status(201).json(subResult.rows[0]);
  } catch (error) {
    logger.error('❌ Subscribe to stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : S'ABONNER À UNE CHAÎNE
// =====================================================

export async function subscribeToChannel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const channelId = getParamId(req.params);
    const userId = req.user!.id;
    const { payment_method_id, auto_renew = true } = req.body;

    const channelResult = await query('SELECT * FROM user_channels WHERE id = $1 AND is_premium = true', [channelId]);
    if (channelResult.rows.length === 0) { res.status(404).json({ error: 'Chaîne premium non trouvée' }); return; }
    const channel = channelResult.rows[0];

    const existingSub = await query(`SELECT id FROM channel_subscriptions WHERE channel_id = $1 AND user_id = $2 AND status = 'active'`, [channelId, userId]);
    if (existingSub.rows.length > 0) { res.status(400).json({ error: 'Déjà abonné à cette chaîne' }); return; }

    const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1);
    const subResult = await query(`INSERT INTO channel_subscriptions (channel_id, user_id, expires_at, auto_renew, payment_method_id, status) VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`, [channelId, userId, expiresAt, auto_renew, payment_method_id || null]);
    await query('UPDATE user_channels SET total_subscribers = total_subscribers + 1 WHERE id = $1', [channelId]);

    res.status(201).json(subResult.rows[0]);
  } catch (error) {
    logger.error('❌ Subscribe to channel error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : LIKER UN STREAM
// =====================================================

export async function likeStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;

    const existingLike = await query('SELECT id FROM stream_likes WHERE stream_id = $1 AND user_id = $2', [id, userId]);
    let isLiked = false;

    if (existingLike.rows.length > 0) {
      await query('DELETE FROM stream_likes WHERE stream_id = $1 AND user_id = $2', [id, userId]);
      await query('UPDATE live_streams SET like_count = COALESCE(like_count, 0) - 1 WHERE id = $1', [id]);
    } else {
      await query('INSERT INTO stream_likes (stream_id, user_id) VALUES ($1, $2)', [id, userId]);
      await query('UPDATE live_streams SET like_count = COALESCE(like_count, 0) + 1 WHERE id = $1', [id]);
      isLiked = true;
    }

    const result = await query('SELECT like_count FROM live_streams WHERE id = $1', [id]);
    const likeCount = result.rows[0]?.like_count || 0;

    io.to(`stream:${id}`).emit('like_update', { count: likeCount });
    res.json({ like_count: likeCount, is_liked: isLiked });
  } catch (error) {
    logger.error('❌ Like stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : ENVOYER UN SUPER CHAT
// =====================================================

export async function sendSuperChat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { amount, message, color = '#FF0000' } = req.body;

    if (!amount || amount < 1) { res.status(400).json({ error: 'Montant minimum: 1€' }); return; }

    let filteredMessage = message;
    if (message) { const filterResult = await filterBadWords(message); filteredMessage = filterResult.filtered; }

    const result = await query(`INSERT INTO super_chats (stream_id, user_id, amount, message, color, is_pinned, pin_duration) VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *`, [id, userId, amount, filteredMessage?.trim() || null, color, Math.floor(amount / 5) * 60]);
    const superChat = result.rows[0];

    const userResult = await query('SELECT username, avatar FROM users WHERE id = $1', [userId]);
    const enrichedSuperChat = { ...superChat, username: userResult.rows[0]?.username || 'Anonymous', avatar: userResult.rows[0]?.avatar };

    io.to(`stream:${id}`).emit('new_super_chat', enrichedSuperChat);
    res.status(201).json(superChat);
  } catch (error) {
    logger.error('❌ Send super chat error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : SIGNALER UN STREAM
// =====================================================

export async function reportStream(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { reason, description, screenshot } = req.body;

    if (!reason || reason.trim().length < 5) { res.status(400).json({ error: 'La raison doit contenir au moins 5 caractères' }); return; }

    const reportResult = await query(`INSERT INTO reports (reporter_id, stream_id, report_type, reason, screenshot_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [userId, id, 'stream_violation', description ? `${reason}: ${description}` : reason, screenshot || null]);
    
    res.status(201).json({ report: reportResult.rows[0], message: 'Signalement envoyé avec succès' });
  } catch (error) {
    logger.error('❌ Report stream error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : RÉCUPÉRER LES MESSAGES DU CHAT
// =====================================================

export async function getStreamMessages(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const { limit = '100' } = req.query;

    const messages = await query(
      `SELECT cm.id, cm.message, cm.created_at, u.id as user_id, u.username, u.avatar 
       FROM live_chat_messages cm LEFT JOIN users u ON cm.user_id = u.id 
       WHERE cm.live_stream_id = $1 ORDER BY cm.created_at DESC LIMIT $2`, [id, Number(limit)]
    );

    res.json({ messages: messages.rows.reverse(), has_more: messages.rows.length === Number(limit) });
  } catch (error) {
    logger.error('❌ Get stream messages error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : RÉCUPÉRER LES STATISTIQUES
// =====================================================

export async function getStreamStats(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);

    const stats = await query(
      `SELECT COUNT(DISTINCT lv.user_id) as unique_viewers, COUNT(DISTINCT cm.user_id) as unique_chatters, COUNT(cm.id) as total_messages, COUNT(sl.user_id) as total_likes, COALESCE(SUM(sc.amount), 0) as total_super_chats 
       FROM live_streams ls 
       LEFT JOIN live_viewers lv ON ls.id = lv.stream_id 
       LEFT JOIN live_chat_messages cm ON ls.id = cm.live_stream_id 
       LEFT JOIN stream_likes sl ON ls.id = sl.stream_id 
       LEFT JOIN super_chats sc ON ls.id = sc.stream_id 
       WHERE ls.id = $1 GROUP BY ls.id`, [id]
    );

    res.json(stats.rows[0] || {});
  } catch (error) {
    logger.error('❌ Get stream stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : CRÉER UN CLIP
// =====================================================

export async function createClip(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { start_time, end_time, title } = req.body;

    if (!start_time || !end_time || start_time >= end_time) { res.status(400).json({ error: 'Temps de clip invalide' }); return; }
    const duration = end_time - start_time;
    if (duration > 60) { res.status(400).json({ error: 'Le clip ne peut pas dépasser 60 secondes' }); return; }

    const result = await query(`INSERT INTO clips (stream_id, user_id, title, start_time, end_time, duration) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [id, userId, title || 'Mon clip', start_time, end_time, duration]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('❌ Create clip error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEUR : RÉCUPÉRER LES SPECTATEURS
// =====================================================

export async function getStreamViewers(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const viewers = await query(`SELECT lv.user_id, u.username, u.avatar FROM live_viewers lv LEFT JOIN users u ON lv.user_id = u.id WHERE lv.stream_id = $1`, [id]);
    res.json({ viewers: viewers.rows, count: viewers.rows.length });
  } catch (error) {
    logger.error('❌ Get stream viewers error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// EXPORT PAR DÉFAUT
// =====================================================

export default {
  createLiveStream,
  getLiveStreams,
  getLiveStreamById,
  updateLiveStream,
  endLiveStream,
  subscribeToStream,
  subscribeToChannel,
  likeStream,
  sendSuperChat,
  reportStream,
  getStreamMessages,
  getStreamStats,
  createClip,
  getStreamViewers,
};