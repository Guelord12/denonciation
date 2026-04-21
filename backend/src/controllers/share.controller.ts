import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { io } from '../index';

// Fonction utilitaire pour extraire l'ID des params en toute sécurité
function getParamId(params: any): string {
  return Array.isArray(params.id) ? params.id[0] : params.id;
}

export async function shareReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { platform } = req.body;

    // Récupérer le mode de visibilité du signalement parent
    const reportResult = await query(
      'SELECT id, reporter_id, title, is_anonymous FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      res.status(404).json({ error: 'Signalement non trouvé' });
      return;
    }

    const report = reportResult.rows[0];
    const isAnonymous = report.is_anonymous;

    const shareLink = `${process.env.WEB_URL}/reports/${id}`;

    const result = await query(
      `INSERT INTO shares (report_id, user_id, share_link, platform, is_anonymous)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, shareLink, platform, isAnonymous]
    );

    // Notification (toujours envoyée)
    if (report.reporter_id !== userId) {
      const notificationContent = isAnonymous 
        ? `Un utilisateur a partagé votre signalement "${report.title}"`
        : `${req.user!.username} a partagé votre signalement "${report.title}"`;
        
      await query(
        `INSERT INTO notifications (user_id, type, content, related_id)
         VALUES ($1, 'new_share', $2, $3)`,
        [report.reporter_id, notificationContent, id]
      );
    }

    // Incrémenter le compteur de partages
    await query(
      'UPDATE reports SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = $1',
      [id]
    );

    // Émettre l'événement
    io.to(`report:${id}`).emit('report_shared', {
      report_id: id,
      platform,
      shared_by_anonymous: isAnonymous
    });

    res.json({ 
      share_link: shareLink,
      message: 'Signalement partagé avec succès'
    });
  } catch (error) {
    logger.error('Share report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getShares(req: AuthRequest, res: Response): Promise<void> {
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

    const shares = await query(
      `SELECT s.id, s.platform, s.created_at, s.is_anonymous,
              u.id as sharer_id,
              u.username,
              u.avatar
       FROM shares s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.report_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limitNum, offset]
    );

    // Appliquer l'anonymisation selon les règles
    const processedShares = shares.rows.map(share => {
      const isShareOwner = share.sharer_id === currentUserId;
      const shouldAnonymize = !isAdmin && !isShareOwner && !isReportOwner && (isAnonymous || share.is_anonymous);
      
      if (shouldAnonymize) {
        return {
          ...share,
          username: 'Utilisateur anonyme',
          avatar: null
        };
      }
      return share;
    });

    const countResult = await query(
      'SELECT COUNT(*) as total FROM shares WHERE report_id = $1',
      [id]
    );

    res.json({
      shares: processedShares,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get shares error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default {
  shareReport,
  getShares
};