import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { page = '1', limit = '20', unread_only } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];

    if (unread_only === 'true') {
      whereClause += ' AND is_read = false';
    }

    const notifications = await query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread
       FROM notifications
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      notifications: notifications.rows,
      unread_count: parseInt(countResult.rows[0].unread),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const rawId = req.params.id;
    const id = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId) : null;

    if (id) {
      await query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    } else {
      // Marquer toutes comme lues
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [userId]
      );
    }

    // ✅ Invalider le cache Redis si disponible
    try {
      if (redisClient.isOpen) {
        await redisClient.del(`unread_count:${userId}`);
      }
    } catch (redisError) {
      logger.warn('Redis error in markAsRead (non-blocking):', redisError);
    }

    res.json({ message: 'Notifications marquées comme lues' });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const rawId = req.params.id;
    const id: string = Array.isArray(rawId) ? rawId[0] : rawId;

    // Vérifier si la notification est non lue avant de la supprimer
    const notifResult = await query(
      'SELECT is_read FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    // ✅ Invalider le cache Redis si la notification était non lue
    if (notifResult.rows.length > 0 && !notifResult.rows[0].is_read) {
      try {
        if (redisClient.isOpen) {
          await redisClient.del(`unread_count:${userId}`);
        }
      } catch (redisError) {
        logger.warn('Redis error in deleteNotification (non-blocking):', redisError);
      }
    }

    res.json({ message: 'Notification supprimée' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    let unreadCount = 0;

    // ✅ Essayer d'abord de récupérer depuis Redis (cache)
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(`unread_count:${userId}`);
        if (cached) {
          unreadCount = parseInt(cached);
          res.json({ unread_count: unreadCount });
          return;
        }
      }
    } catch (redisError) {
      logger.warn('Redis error in getUnreadCount (falling back to DB):', redisError);
    }

    // ✅ Fallback : récupérer depuis la base de données
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    unreadCount = parseInt(result.rows[0].count);

    // ✅ Mettre en cache pour les prochaines requêtes (si Redis disponible)
    try {
      if (redisClient.isOpen) {
        await redisClient.set(`unread_count:${userId}`, unreadCount.toString(), { EX: 60 });
      }
    } catch (redisError) {
      logger.warn('Redis error caching unread_count:', redisError);
    }

    res.json({ unread_count: unreadCount });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}