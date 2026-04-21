import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { io } from '../index';

// Fonction utilitaire pour extraire l'ID des params en toute sécurité
function getParamId(params: any): string {
  return Array.isArray(params.id) ? params.id[0] : params.id;
}

// =====================================================
// FONCTIONS UTILITAIRES DE VISIBILITÉ
// =====================================================

function shouldAnonymizeComment(report: any, isAdmin: boolean, isCommentOwner: boolean): boolean {
  if (isAdmin) return false;
  if (isCommentOwner) return false;
  return report.is_anonymous === true || report.visibility_mode === 'anonymous';
}

function anonymizeComment(comment: any, shouldAnonymize: boolean): any {
  if (!shouldAnonymize) return comment;
  
  return {
    ...comment,
    username: 'Utilisateur anonyme',
    avatar: null
  };
}

export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { report_id, content, parent_id } = req.body;

    // ✅ Récupérer le mode de visibilité du signalement parent
    const reportResult = await query(
      'SELECT id, reporter_id, title, is_anonymous, visibility_mode FROM reports WHERE id = $1',
      [report_id]
    );

    if (reportResult.rows.length === 0) {
      res.status(404).json({ error: 'Signalement non trouvé' });
      return;
    }

    const report = reportResult.rows[0];
    const isAnonymous = report.is_anonymous;

    const result = await query(
      `INSERT INTO comments (report_id, user_id, content, parent_id, is_anonymous)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [report_id, userId, content, parent_id || null, isAnonymous]
    );

    const comment = result.rows[0];

    const userResult = await query(
      'SELECT username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const fullComment = {
      ...comment,
      username: userResult.rows[0].username,
      avatar: userResult.rows[0].avatar,
      user_id: userId
    };

    // ✅ Notification (toujours envoyée, mais contenu potentiellement anonymisé)
    if (report.reporter_id !== userId) {
      await query(
        `INSERT INTO notifications (user_id, type, content, related_id)
         VALUES ($1, 'new_comment', $2, $3)`,
        [
          report.reporter_id,
          `Un utilisateur a commenté votre signalement "${report.title}"`,
          report_id
        ]
      );
    }

    if (parent_id) {
      const parentResult = await query(
        'SELECT user_id FROM comments WHERE id = $1',
        [parent_id]
      );
      
      if (parentResult.rows.length > 0 && parentResult.rows[0].user_id !== userId) {
        await query(
          `INSERT INTO notifications (user_id, type, content, related_id)
           VALUES ($1, 'new_comment', $2, $3)`,
          [
            parentResult.rows[0].user_id,
            `Un utilisateur a répondu à votre commentaire`,
            report_id
          ]
        );
      }
    }

    // ✅ Anonymiser avant d'envoyer aux clients (sauf pour l'auteur et les admins)
    const isAdmin = req.user?.is_admin || false;
    const isOwner = report.reporter_id === userId;
    const shouldAnonymize = !isAdmin && !isOwner && isAnonymous;
    
    const commentForClients = shouldAnonymize 
      ? { ...fullComment, username: 'Utilisateur anonyme', avatar: null }
      : fullComment;
    
    io.to(`report:${report_id}`).emit('new_comment', commentForClients);
    await logActivity(userId, 'CREATE_COMMENT', 'comment', comment.id, req);

    // ✅ Retourner la version appropriée selon qui fait la requête
    const responseComment = isAdmin || isOwner ? fullComment : commentForClients;
    res.status(201).json(responseComment);
  } catch (error) {
    logger.error('Create comment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getComments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const report_id = Array.isArray(req.params.report_id) ? req.params.report_id[0] : req.params.report_id;
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    const isAdmin = req.user?.is_admin || false;
    const currentUserId = req.user?.id || null;

    // ✅ Récupérer d'abord le mode de visibilité du signalement
    const reportResult = await query(
      'SELECT reporter_id, is_anonymous, visibility_mode FROM reports WHERE id = $1',
      [report_id]
    );
    
    const report = reportResult.rows[0];
    const isReportOwner = report?.reporter_id === currentUserId;
    const isAnonymous = report?.is_anonymous ?? true;

    const comments = await query(
      `WITH RECURSIVE comment_tree AS (
        SELECT c.*, 
               u.username, u.avatar,
               u.id as commenter_id,
               0 as level
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.report_id = $1 AND c.parent_id IS NULL
        
        UNION ALL
        
        SELECT c.*, 
               u.username, u.avatar,
               u.id as commenter_id,
               ct.level + 1
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        INNER JOIN comment_tree ct ON c.parent_id = ct.id
        WHERE c.report_id = $1
      )
      SELECT * FROM comment_tree
      ORDER BY level, created_at DESC
      LIMIT $2 OFFSET $3`,
      [report_id, limitNum, offset]
    );

    // ✅ Appliquer l'anonymisation selon les règles
    const processedComments = comments.rows.map(comment => {
      const isCommentOwner = comment.commenter_id === currentUserId;
      const shouldAnonymize = !isAdmin && !isCommentOwner && !isReportOwner && isAnonymous;
      
      if (shouldAnonymize) {
        return {
          ...comment,
          username: 'Utilisateur anonyme',
          avatar: null
        };
      }
      return comment;
    });

    const countResult = await query(
      'SELECT COUNT(*) as total FROM comments WHERE report_id = $1',
      [report_id]
    );

    res.json({
      comments: processedComments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get comments error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function updateComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { content } = req.body;

    const commentResult = await query(
      'SELECT c.user_id, c.report_id, r.is_anonymous FROM comments c JOIN reports r ON c.report_id = r.id WHERE c.id = $1',
      [id]
    );

    if (commentResult.rows.length === 0) {
      res.status(404).json({ error: 'Commentaire non trouvé' });
      return;
    }

    const comment = commentResult.rows[0];

    if (comment.user_id !== userId && !req.user!.is_admin) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    await query(
      `UPDATE comments 
       SET content = $1, is_edited = true, updated_at = NOW()
       WHERE id = $2`,
      [content, id]
    );

    const result = await query(
      `SELECT c.*, u.username, u.avatar, u.id as commenter_id
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    await logActivity(userId, 'UPDATE_COMMENT', 'comment', parseInt(id), req);

    const updatedComment = result.rows[0];
    const isAdmin = req.user?.is_admin || false;
    const isOwner = updatedComment.commenter_id === userId;
    const shouldAnonymize = !isAdmin && !isOwner && comment.is_anonymous;

    const response = shouldAnonymize
      ? { ...updatedComment, username: 'Utilisateur anonyme', avatar: null }
      : updatedComment;

    res.json(response);
  } catch (error) {
    logger.error('Update comment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;

    const commentResult = await query(
      'SELECT user_id, report_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentResult.rows.length === 0) {
      res.status(404).json({ error: 'Commentaire non trouvé' });
      return;
    }

    if (commentResult.rows[0].user_id !== userId && !req.user!.is_admin) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    const reportId = commentResult.rows[0].report_id;

    await query('DELETE FROM comments WHERE id = $1', [id]);

    io.to(`report:${reportId}`).emit('comment_deleted', { commentId: id });
    await logActivity(userId, 'DELETE_COMMENT', 'comment', parseInt(id), req);

    res.json({ message: 'Commentaire supprimé avec succès' });
  } catch (error) {
    logger.error('Delete comment error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function logActivity(userId: number, action: string, entityType: string, entityId: number, req: AuthRequest): Promise<void> {
  await query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, entityType, entityId, req.ip || req.socket.remoteAddress, req.headers['user-agent']]
  );
}