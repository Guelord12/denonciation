import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { io } from '../index';

// Fonction utilitaire pour extraire l'ID des params en toute sécurité
function getParamId(params: any): string {
  return Array.isArray(params.id) ? params.id[0] : params.id;
}

export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { report_id, content, parent_id } = req.body;

    const reportResult = await query(
      'SELECT id, user_id, title FROM reports WHERE id = $1',
      [report_id]
    );

    if (reportResult.rows.length === 0) {
      res.status(404).json({ error: 'Signalement non trouvé' });
      return;
    }

    const result = await query(
      `INSERT INTO comments (report_id, user_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [report_id, userId, content, parent_id || null]
    );

    const comment = result.rows[0];

    const userResult = await query(
      'SELECT username, avatar FROM users WHERE id = $1',
      [userId]
    );

    const fullComment = {
      ...comment,
      username: userResult.rows[0].username,
      avatar: userResult.rows[0].avatar
    };

    if (reportResult.rows[0].user_id !== userId) {
      await query(
        `INSERT INTO notifications (user_id, type, content, related_id)
         VALUES ($1, 'new_comment', $2, $3)`,
        [
          reportResult.rows[0].user_id,
          `Un utilisateur a commenté votre signalement "${reportResult.rows[0].title}"`,
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

    // Anonymiser avant d'envoyer aux clients
    const anonymizedComment = {
      ...fullComment,
      username: 'Utilisateur anonyme',
      avatar: null
    };
    
    io.to(`report:${report_id}`).emit('new_comment', anonymizedComment);
    await logActivity(userId, 'CREATE_COMMENT', 'comment', comment.id, req);

    res.status(201).json(anonymizedComment);
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

    const comments = await query(
      `WITH RECURSIVE comment_tree AS (
        SELECT c.*, 
               CASE WHEN $2 THEN 'Utilisateur anonyme' ELSE u.username END as username,
               CASE WHEN $2 THEN null ELSE u.avatar END as avatar,
               0 as level
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.report_id = $1 AND c.parent_id IS NULL
        
        UNION ALL
        
        SELECT c.*, 
               CASE WHEN $2 THEN 'Utilisateur anonyme' ELSE u.username END as username,
               CASE WHEN $2 THEN null ELSE u.avatar END as avatar,
               ct.level + 1
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        INNER JOIN comment_tree ct ON c.parent_id = ct.id
        WHERE c.report_id = $1
      )
      SELECT * FROM comment_tree
      ORDER BY level, created_at DESC
      LIMIT $3 OFFSET $4`,
      [report_id, !isAdmin, limitNum, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM comments WHERE report_id = $1',
      [report_id]
    );

    res.json({
      comments: comments.rows,
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
      'SELECT user_id FROM comments WHERE id = $1',
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

    await query(
      `UPDATE comments 
       SET content = $1, is_edited = true, updated_at = NOW()
       WHERE id = $2`,
      [content, id]
    );

    const result = await query(
      `SELECT c.*, u.username, u.avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    await logActivity(userId, 'UPDATE_COMMENT', 'comment', parseInt(id), req);

    // Anonymiser pour la réponse
    const response = {
      ...result.rows[0],
      username: req.user?.is_admin ? result.rows[0].username : 'Utilisateur anonyme',
      avatar: req.user?.is_admin ? result.rows[0].avatar : null
    };

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