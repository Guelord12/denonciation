import { Request, Response } from 'express';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { uploadToCloudinary } from '../config/cloudinary';
import { io } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { moderateReport, autoModerateAllPending } from '../services/aiModeration.service';

// Fonction utilitaire pour extraire l'ID des params en toute sécurité
function getParamId(params: any): string {
  return Array.isArray(params.id) ? params.id[0] : params.id;
}

export async function createReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, category_id, city_id, latitude, longitude, is_live } = req.body;
    
    let mediaPath: string | null = null;
    let mediaType: string | null = null;

    if (req.file) {
      mediaPath = await uploadToCloudinary(req.file, 'reports');
      mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 
                  req.file.mimetype.startsWith('video/') ? 'video' : 'document';
    }

    // ✅ CORRECTION : Utiliser reporter_id
    const result = await query(
      `INSERT INTO reports 
       (reporter_id, title, description, category_id, city_id, latitude, longitude, media_type, media_path, is_live, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [userId, title, description, category_id, city_id, latitude, longitude, mediaType, mediaPath, is_live || false]
    );

    const report = result.rows[0];
    const fullReport = await getReportWithDetails(report.id, false);

    await notifyAdmins('new_report', `Nouveau signalement: ${title}`, report.id);
    io.emit('new_report', anonymizeReport(fullReport));
    await logActivity(userId, 'CREATE_REPORT', 'report', report.id, req);

    // ✅ LANCER LA MODÉRATION IA EN ARRIÈRE-PLAN (NON BLOQUANT)
    setTimeout(async () => {
      try {
        logger.info(`🤖 [AI] Starting background moderation for report ${report.id}`);
        const moderationResult = await moderateReport(report.id);
        
        if (!moderationResult.requiresManualReview) {
          const newStatus = moderationResult.approved ? 'approved' : 'rejected';
          
          await query(
            `UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2`,
            [newStatus, report.id]
          );
          
          // Notifier l'utilisateur
          await query(
            `INSERT INTO notifications (user_id, type, content, related_id)
             VALUES ($1, 'report_status', $2, $3)`,
            [
              userId,
              `Votre signalement "${title}" a été ${newStatus === 'approved' ? 'approuvé' : 'rejeté'} automatiquement après analyse.`,
              report.id
            ]
          );
          
          // Logger l'activité IA
          await query(
            `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'AI_AUTO_MODERATION', 'report', report.id, req.ip || req.socket.remoteAddress, req.headers['user-agent']]
          );
          
          logger.info(`✅ [AI] Auto-moderated report ${report.id}: ${newStatus} (confidence: ${moderationResult.confidence}%, score: ${moderationResult.score})`);
          logger.info(`   Reasons: ${moderationResult.reasons.join(', ')}`);
          if (moderationResult.flags.length > 0) {
            logger.info(`   Flags: ${moderationResult.flags.join(', ')}`);
          }
        } else {
          logger.info(`👁️ [AI] Report ${report.id} requires manual review (confidence: ${moderationResult.confidence}%, score: ${moderationResult.score})`);
          logger.info(`   Reasons: ${moderationResult.reasons.join(', ')}`);
        }
      } catch (aiError) {
        logger.error('❌ [AI] Background moderation error:', aiError);
      }
    }, 1000);

    // Message plus informatif pour l'utilisateur
    res.status(201).json({
      ...fullReport,
      message: 'Votre signalement a été créé et sera analysé automatiquement.'
    });
  } catch (error) {
    logger.error('Create report error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du signalement' });
  }
}

export async function getReports(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '20', 
      category, 
      city, 
      status,
      user_id,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (category) {
      params.push(category);
      whereClause += ` AND r.category_id = $${params.length}`;
    }

    if (city) {
      params.push(city);
      whereClause += ` AND r.city_id = $${params.length}`;
    }

    // Par défaut, afficher seulement les signalements approuvés
    if (status) {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    } else {
      whereClause += ` AND r.status = 'approved'`;
    }

    // ✅ CORRECTION : Filtrer par utilisateur avec reporter_id
    if (user_id) {
      params.push(user_id);
      whereClause += ` AND r.reporter_id = $${params.length}`;
    }

    const allowedSortFields = ['created_at', 'views_count', 'likes_count'];
    const sortField = allowedSortFields.includes(String(sort)) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const isAdmin = (req as AuthRequest).user?.is_admin || false;

    // ✅ CORRECTION : Utiliser reporter_id dans la jointure
    const reports = await query(
      `SELECT 
        r.*,
        u.username, u.avatar as user_avatar, u.first_name, u.last_name, u.id as user_id,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        ci.name as city_name, ci.country as city_country,
        (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count,
        (SELECT COUNT(*) FROM witnesses WHERE report_id = r.id) as witnesses_count,
        (SELECT COUNT(*) FROM shares WHERE report_id = r.id) as shares_count
       FROM reports r
       LEFT JOIN users u ON r.reporter_id = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN cities ci ON r.city_id = ci.id
       ${whereClause}
       ORDER BY r.${sortField} ${sortOrder}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM reports r ${whereClause}`,
      params
    );

    // Anonymiser les rapports pour les non-admins
    const processedReports = isAdmin ? reports.rows : reports.rows.map(anonymizeReport);

    res.json({
      reports: processedReports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getReportById(req: Request, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = (req as AuthRequest).user?.id;
    const isAdmin = (req as AuthRequest).user?.is_admin || false;
    
    const report = await getReportWithDetails(parseInt(id), false);

    if (!report) {
      res.status(404).json({ error: 'Signalement non trouvé' });
      return;
    }

    // ✅ CORRECTION : Vérifier avec reporter_id
    if (report.status !== 'approved' && report.reporter_id !== userId && !isAdmin) {
      res.status(403).json({ error: 'Ce signalement est en attente de validation' });
      return;
    }

    await query('UPDATE reports SET views_count = views_count + 1 WHERE id = $1', [id]);

    const comments = await query(
      `SELECT c.*, 
              CASE WHEN $2 THEN 'Utilisateur anonyme' ELSE u.username END as username,
              CASE WHEN $2 THEN null ELSE u.avatar END as avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.report_id = $1
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [id, !isAdmin]
    );

    const witnesses = await query(
      `SELECT w.*, 
              CASE WHEN $2 THEN 'Utilisateur anonyme' ELSE u.username END as username,
              CASE WHEN $2 THEN null ELSE u.avatar END as avatar
       FROM witnesses w
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.report_id = $1
       ORDER BY w.created_at DESC`,
      [id, !isAdmin]
    );

    let userLiked = false;
    let userWitnessed = false;
    
    if (userId) {
      const likeResult = await query(
        'SELECT id FROM likes WHERE report_id = $1 AND user_id = $2',
        [id, userId]
      );
      userLiked = likeResult.rows.length > 0;

      const witnessResult = await query(
        'SELECT id FROM witnesses WHERE report_id = $1 AND user_id = $2',
        [id, userId]
      );
      userWitnessed = witnessResult.rows.length > 0;
    }

    // Anonymiser le rapport pour les non-admins
    const finalReport = isAdmin ? report : anonymizeReport(report);

    res.json({
      ...finalReport,
      comments: comments.rows,
      witnesses: witnesses.rows,
      user_interactions: {
        liked: userLiked,
        witnessed: userWitnessed
      }
    });
  } catch (error) {
    logger.error('Get report by id error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function updateReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { title, description, category_id, city_id } = req.body;

    // ✅ CORRECTION : Utiliser reporter_id
    const reportResult = await query(
      'SELECT reporter_id FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      res.status(404).json({ error: 'Signalement non trouvé' });
      return;
    }

    if (reportResult.rows[0].reporter_id !== userId && !req.user!.is_admin) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (title) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (description) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (category_id) {
      updates.push(`category_id = $${paramIndex++}`);
      params.push(category_id);
    }
    if (city_id) {
      updates.push(`city_id = $${paramIndex++}`);
      params.push(city_id);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await query(
      `UPDATE reports SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    const updatedReport = await getReportWithDetails(parseInt(id), false);
    await logActivity(userId, 'UPDATE_REPORT', 'report', parseInt(id), req);

    res.json(updatedReport);
  } catch (error) {
    logger.error('Update report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function deleteReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;

    // ✅ CORRECTION : Utiliser reporter_id
    const reportResult = await query(
      'SELECT reporter_id FROM reports WHERE id = $1',
      [id]
    );

    if (reportResult.rows.length === 0) {
      res.status(404).json({ error: 'Signalement non trouvé' });
      return;
    }

    if (reportResult.rows[0].reporter_id !== userId && !req.user!.is_admin) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    await query('DELETE FROM reports WHERE id = $1', [id]);
    await logActivity(userId, 'DELETE_REPORT', 'report', parseInt(id), req);

    res.json({ message: 'Signalement supprimé avec succès' });
  } catch (error) {
    logger.error('Delete report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function likeReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;

    const existingLike = await query(
      'SELECT id FROM likes WHERE report_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingLike.rows.length > 0) {
      await query('DELETE FROM likes WHERE report_id = $1 AND user_id = $2', [id, userId]);
      
      const likesCount = await query(
        'SELECT COUNT(*) as count FROM likes WHERE report_id = $1',
        [id]
      );

      res.json({ liked: false, likes_count: parseInt(likesCount.rows[0].count) });
    } else {
      await query(
        'INSERT INTO likes (report_id, user_id) VALUES ($1, $2)',
        [id, userId]
      );

      const likesCount = await query(
        'SELECT COUNT(*) as count FROM likes WHERE report_id = $1',
        [id]
      );

      // ✅ CORRECTION : Utiliser reporter_id
      const report = await query(
        'SELECT reporter_id, title FROM reports WHERE id = $1',
        [id]
      );

      if (report.rows[0].reporter_id !== userId) {
        await query(
          `INSERT INTO notifications (user_id, type, content, related_id)
           VALUES ($1, 'new_like', $2, $3)`,
          [report.rows[0].reporter_id, `Un utilisateur a aimé votre signalement "${report.rows[0].title}"`, id]
        );
      }

      res.json({ liked: true, likes_count: parseInt(likesCount.rows[0].count) });
    }
  } catch (error) {
    logger.error('Like report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function addWitness(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { testimony } = req.body;

    const existingWitness = await query(
      'SELECT id FROM witnesses WHERE report_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingWitness.rows.length > 0) {
      res.status(400).json({ error: 'Vous avez déjà témoigné sur ce signalement' });
      return;
    }

    const result = await query(
      `INSERT INTO witnesses (report_id, user_id, testimony)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, userId, testimony]
    );

    // ✅ CORRECTION : Utiliser reporter_id
    const report = await query(
      'SELECT reporter_id, title FROM reports WHERE id = $1',
      [id]
    );

    if (report.rows[0].reporter_id !== userId) {
      await query(
        `INSERT INTO notifications (user_id, type, content, related_id)
         VALUES ($1, 'new_witness', $2, $3)`,
        [report.rows[0].reporter_id, `Un utilisateur a témoigné sur votre signalement "${report.rows[0].title}"`, id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Add witness error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function shareReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = getParamId(req.params);
    const userId = req.user!.id;
    const { platform } = req.body;

    const shareLink = `${process.env.WEB_URL}/reports/${id}`;

    await query(
      `INSERT INTO shares (report_id, user_id, share_link, platform)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, shareLink, platform]
    );

    res.json({ share_link: shareLink });
  } catch (error) {
    logger.error('Share report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function anonymizeReport(report: any): any {
  if (!report) return report;
  
  return {
    ...report,
    username: 'Utilisateur anonyme',
    user_avatar: null,
    first_name: null,
    last_name: null,
  };
}

async function getReportWithDetails(id: number, anonymize: boolean = true): Promise<any> {
  // ✅ CORRECTION : Utiliser reporter_id
  const result = await query(
    `SELECT 
      r.*,
      u.username, u.avatar as user_avatar, u.first_name, u.last_name, u.id as user_id,
      c.name as category_name, c.icon as category_icon, c.color as category_color,
      ci.name as city_name, ci.country as city_country,
      (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
      (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count,
      (SELECT COUNT(*) FROM witnesses WHERE report_id = r.id) as witnesses_count,
      (SELECT COUNT(*) FROM shares WHERE report_id = r.id) as shares_count
     FROM reports r
     LEFT JOIN users u ON r.reporter_id = u.id
     LEFT JOIN categories c ON r.category_id = c.id
     LEFT JOIN cities ci ON r.city_id = ci.id
     WHERE r.id = $1`,
    [id]
  );

  const report = result.rows[0];
  
  if (report && anonymize) {
    return anonymizeReport(report);
  }
  
  return report || null;
}

async function notifyAdmins(type: string, content: string, relatedId: number): Promise<void> {
  const admins = await query('SELECT id FROM users WHERE is_admin = true');
  
  for (const admin of admins.rows) {
    await query(
      `INSERT INTO notifications (user_id, type, content, related_id)
       VALUES ($1, $2, $3, $4)`,
      [admin.id, type, content, relatedId]
    );
  }
}

async function logActivity(userId: number, action: string, entityType: string, entityId: number, req: Request): Promise<void> {
  await query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, entityType, entityId, req.ip || req.socket.remoteAddress, req.headers['user-agent']]
  );
}

// ✅ Exporter la fonction pour le scheduler
export { autoModerateAllPending };