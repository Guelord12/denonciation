import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { io } from '../index';

// Fonction utilitaire pour extraire l'ID des params en toute sécurité
function getParamId(params: any): string {
  return Array.isArray(params.id) ? params.id[0] : params.id;
}

export async function toggleLike(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;

    // Vérifier que le signalement existe et récupérer son mode de visibilité
    const reportResult = await query(
      'SELECT id, reporter_id, title, is_anonymous FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      res.status(404).json({ error: 'Signalement non trouvé' });
      return;
    }

    const report = reportResult.rows[0];

    const existingLike = await query(
      'SELECT id FROM likes WHERE report_id = $1 AND user_id = $2',
      [id, userId]
    );

    let liked = false;

    if (existingLike.rows.length > 0) {
      await query('DELETE FROM likes WHERE report_id = $1 AND user_id = $2', [id, userId]);
      liked = false;
    } else {
      await query(
        'INSERT INTO likes (report_id, user_id) VALUES ($1, $2)',
        [id, userId]
      );
      liked = true;

      // Notification (toujours envoyée, mais l'identité du likeur dépend du mode de visibilité)
      if (report.reporter_id !== userId) {
        const notificationContent = report.is_anonymous 
          ? `Un utilisateur a aimé votre signalement "${report.title}"`
          : `${req.user!.username} a aimé votre signalement "${report.title}"`;
          
        await query(
          `INSERT INTO notifications (user_id, type, content, related_id)
           VALUES ($1, 'new_like', $2, $3)`,
          [report.reporter_id, notificationContent, id]
        );
      }
    }

    const likesCount = await query(
      'SELECT COUNT(*) as count FROM likes WHERE report_id = $1',
      [id]
    );

    const totalLikes = parseInt(likesCount.rows[0].count);

    // Émettre l'événement avec les informations appropriées
    io.to(`report:${id}`).emit('like_update', {
      report_id: id,
      likes_count: totalLikes,
      user_liked: liked,
      // Si le report est anonyme, on ne révèle pas qui a liké
      liker_info: report.is_anonymous ? null : {
        user_id: userId,
        username: req.user!.username
      }
    });

    res.json({
      liked,
      likes_count: totalLikes
    });
  } catch (error) {
    logger.error('Toggle like error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getLikes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    const isAdmin = req.user?.is_admin || false;
    const currentUserId = req.user?.id || null;

    // Récupérer le mode de visibilité du signalement
    const reportResult = await query(
      'SELECT reporter_id, is_anonymous FROM reports WHERE id = $1',
      [id]
    );
    
    const report = reportResult.rows[0];
    const isReportOwner = report?.reporter_id === currentUserId;
    const isAnonymous = report?.is_anonymous ?? true;

    const likes = await query(
      `SELECT l.id, l.created_at,
              u.id as user_id,
              u.username,
              u.avatar
       FROM likes l
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.report_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limitNum, offset]
    );

    // Appliquer l'anonymisation selon les règles
    const processedLikes = likes.rows.map(like => {
      const isLikeOwner = like.user_id === currentUserId;
      const shouldAnonymize = !isAdmin && !isLikeOwner && !isReportOwner && isAnonymous;
      
      if (shouldAnonymize) {
        return {
          ...like,
          username: 'Utilisateur anonyme',
          avatar: null
        };
      }
      return like;
    });

    const countResult = await query(
      'SELECT COUNT(*) as total FROM likes WHERE report_id = $1',
      [id]
    );

    res.json({
      likes: processedLikes,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get likes error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default {
  toggleLike,
  getLikes
};