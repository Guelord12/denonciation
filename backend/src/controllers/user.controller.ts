import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { uploadToCloudinary } from '../config/cloudinary';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';

// =====================================================
// TYPES ET INTERFACES
// =====================================================

interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  city?: string;
  nationality?: string;
  birth_date?: string;
  gender?: string;
}

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface UpdateEmailData {
  email: string;
  password: string;
}

interface UpdateUsernameData {
  username: string;
  password: string;
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function getParamId(params: any): string {
  if (Array.isArray(params.id)) {
    return params.id[0];
  }
  return params.id;
}

async function logActivity(
  userId: number,
  action: string,
  entityType: string,
  entityId: number | string,
  req: Request
): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        action,
        entityType,
        String(entityId),
        req.ip || req.socket.remoteAddress || 'unknown',
        req.headers['user-agent'] || 'unknown'
      ]
    );
  } catch (error) {
    logger.error('❌ Log activity error:', error);
  }
}

async function deleteOldAvatar(avatarUrl: string | null): Promise<void> {
  if (!avatarUrl) return;
  
  try {
    if (avatarUrl.includes('cloudinary.com')) {
      const matches = avatarUrl.match(/\/v\d+\/(.+)\.\w+$/);
      if (matches) {
        const publicId = matches[1];
        logger.info(`📸 Old avatar to delete: ${publicId}`);
      }
    } else if (avatarUrl.startsWith('/uploads/')) {
      const filePath = `./uploads${avatarUrl}`;
      await fs.unlink(filePath).catch(() => {});
    }
  } catch (error) {
    logger.warn('⚠️ Could not delete old avatar:', error);
  }
}

// =====================================================
// CONTRÔLEURS PUBLICS
// =====================================================

export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = getParamId(req.params);
    
    const result = await query(
      `SELECT 
        u.id, 
        u.username, 
        u.first_name, 
        u.last_name, 
        u.avatar, 
        u.country, 
        u.city,
        u.nationality,
        u.gender,
        u.created_at,
        u.is_admin,
        u.is_banned,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = u.id) as reports_count,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = u.id) as streams_count,
        (SELECT COUNT(*) FROM user_follows WHERE user_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) as following_count
       FROM users u
       WHERE u.id = $1 AND u.is_banned = false`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const user = result.rows[0];

    // ✅ CORRECTION : Utiliser reporter_id
    const reports = await query(
      `SELECT 
        r.id, 
        r.title, 
        r.description,
        r.status,
        r.created_at, 
        COALESCE(r.views_count, 0) as views_count,
        c.name as category_name,
        c.color as category_color,
        (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count
       FROM reports r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.reporter_id = $1 AND r.status = 'approved'
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [userId]
    );

    const streams = await query(
      `SELECT 
        ls.id,
        ls.title,
        ls.status,
        ls.start_time,
        ls.viewer_count,
        ls.like_count,
        ls.thumbnail_path
       FROM live_streams ls
       WHERE ls.user_id = $1 AND ls.status IN ('active', 'ended')
       ORDER BY ls.created_at DESC
       LIMIT 6`,
      [userId]
    );

    res.json({
      ...user,
      recent_reports: reports.rows,
      recent_streams: streams.rows
    });

  } catch (error) {
    logger.error('❌ Get user profile error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getUserReports(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id 
      ? getParamId(req.params) 
      : String((req as AuthRequest).user?.id);
      
    const { page = '1', limit = '20', status } = req.query;
    
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    // ✅ CORRECTION : Utiliser reporter_id
    let whereConditions: string[] = ['r.reporter_id = $1'];
    let params: any[] = [userId];
    let paramCounter = 2;

    if (status) {
      whereConditions.push(`r.status = $${paramCounter++}`);
      params.push(status);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const reports = await query(
      `SELECT 
        r.*,
        c.name as category_name, 
        c.icon as category_icon, 
        c.color as category_color,
        (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count
       FROM reports r
       LEFT JOIN categories c ON r.category_id = c.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramCounter++} OFFSET $${paramCounter++}`,
      [...params, limitNum, offset]
    );

    // ✅ CORRECTION : Utiliser reporter_id
    const countResult = await query(
      'SELECT COUNT(*) as total FROM reports WHERE reporter_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      reports: reports.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        has_more: offset + limitNum < total
      }
    });

  } catch (error) {
    logger.error('❌ Get user reports error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getUserStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = getParamId(req.params);

    // ✅ CORRECTION : Utiliser reporter_id
    const stats = await query(
      `SELECT 
        (SELECT COUNT(*) FROM reports WHERE reporter_id = $1) as total_reports,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = $1 AND status = 'approved') as approved_reports,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = $1 AND status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = $1 AND status = 'rejected') as rejected_reports,
        (SELECT COUNT(*) FROM comments WHERE user_id = $1) as total_comments,
        (SELECT COUNT(*) FROM likes WHERE user_id = $1) as total_likes_given,
        (SELECT COUNT(*) FROM stream_likes WHERE user_id = $1) as total_stream_likes_given,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = $1) as total_streams,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = $1 AND status = 'active') as active_streams,
        (SELECT COUNT(*) FROM user_follows WHERE user_id = $1) as followers_count,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1) as following_count,
        COALESCE((SELECT SUM(views_count) FROM reports WHERE reporter_id = $1), 0) as total_report_views,
        COALESCE((SELECT SUM(view_count) FROM live_streams WHERE user_id = $1), 0) as total_stream_views,
        COALESCE((SELECT SUM(like_count) FROM live_streams WHERE user_id = $1), 0) as total_stream_likes_received,
        COALESCE((SELECT SUM(amount) FROM earnings WHERE user_id = $1 AND status = 'paid'), 0) as total_earnings
      `,
      [userId]
    );

    // ✅ CORRECTION : Utiliser reporter_id
    const reportsByCategory = await query(
      `SELECT 
        c.name as category_name,
        c.color as category_color,
        COUNT(r.id) as count
       FROM reports r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.reporter_id = $1
       GROUP BY c.id, c.name, c.color
       ORDER BY count DESC`,
      [userId]
    );

    // ✅ CORRECTION : Utiliser reporter_id
    const monthlyStats = await query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
       FROM reports
       WHERE reporter_id = $1
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`,
      [userId]
    );

    res.json({
      ...stats.rows[0],
      reports_by_category: reportsByCategory.rows,
      monthly_stats: monthlyStats.rows
    });

  } catch (error) {
    logger.error('❌ Get user stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEURS AUTHENTIFIÉS (PROFIL PERSONNEL)
// =====================================================

export async function getMyProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const result = await query(
      `SELECT 
        id,
        username,
        email,
        avatar,
        first_name,
        last_name,
        birth_date,
        gender,
        country,
        city,
        nationality,
        phone,
        is_admin,
        is_banned,
        created_at,
        updated_at
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const user = result.rows[0];

    // ✅ CORRECTION : Utiliser reporter_id
    const stats = await query(
      `SELECT 
        (SELECT COUNT(*) FROM reports WHERE reporter_id = $1) as total_reports,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = $1 AND status = 'approved') as approved_reports,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = $1 AND status = 'pending') as pending_reports,
        (SELECT COUNT(*) FROM comments WHERE user_id = $1) as total_comments,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = $1) as total_streams,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = $1 AND status = 'active') as active_streams,
        (SELECT COUNT(*) FROM user_follows WHERE user_id = $1) as followers_count,
        (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1) as following_count,
        COALESCE((SELECT SUM(amount) FROM earnings WHERE user_id = $1 AND status = 'paid'), 0) as total_earnings,
        COALESCE((SELECT SUM(amount) FROM earnings WHERE user_id = $1 AND status = 'pending'), 0) as pending_earnings
       FROM users WHERE id = $1`,
      [userId]
    );

    const unreadNotifications = await query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );

    res.json({
      ...user,
      stats: stats.rows[0] || {},
      unread_notifications: parseInt(unreadNotifications.rows[0]?.count || '0')
    });

  } catch (error) {
    logger.error('❌ Get my profile error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const updates: UpdateProfileData = req.body;

    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCounter = 1;

    if (updates.first_name !== undefined) {
      if (updates.first_name && updates.first_name.length > 50) {
        res.status(400).json({ error: 'Le prénom ne peut pas dépasser 50 caractères' });
        return;
      }
      updateFields.push(`first_name = $${paramCounter++}`);
      updateValues.push(updates.first_name?.trim() || null);
    }

    if (updates.last_name !== undefined) {
      if (updates.last_name && updates.last_name.length > 50) {
        res.status(400).json({ error: 'Le nom ne peut pas dépasser 50 caractères' });
        return;
      }
      updateFields.push(`last_name = $${paramCounter++}`);
      updateValues.push(updates.last_name?.trim() || null);
    }

    if (updates.phone !== undefined) {
      if (updates.phone && !/^[0-9+\-\s()]{8,20}$/.test(updates.phone)) {
        res.status(400).json({ error: 'Format de téléphone invalide' });
        return;
      }
      updateFields.push(`phone = $${paramCounter++}`);
      updateValues.push(updates.phone?.trim() || null);
    }

    if (updates.country !== undefined) {
      updateFields.push(`country = $${paramCounter++}`);
      updateValues.push(updates.country?.trim() || null);
    }

    if (updates.city !== undefined) {
      updateFields.push(`city = $${paramCounter++}`);
      updateValues.push(updates.city?.trim() || null);
    }

    if (updates.nationality !== undefined) {
      updateFields.push(`nationality = $${paramCounter++}`);
      updateValues.push(updates.nationality?.trim() || null);
    }

    if (updates.birth_date !== undefined) {
      if (updates.birth_date) {
        const birthDate = new Date(updates.birth_date);
        const now = new Date();
        const age = now.getFullYear() - birthDate.getFullYear();
        if (age < 13) {
          res.status(400).json({ error: 'Vous devez avoir au moins 13 ans' });
          return;
        }
        if (birthDate > now) {
          res.status(400).json({ error: 'La date de naissance ne peut pas être dans le futur' });
          return;
        }
      }
      updateFields.push(`birth_date = $${paramCounter++}`);
      updateValues.push(updates.birth_date || null);
    }

    if (updates.gender !== undefined) {
      if (updates.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(updates.gender)) {
        res.status(400).json({ error: 'Genre invalide' });
        return;
      }
      updateFields.push(`gender = $${paramCounter++}`);
      updateValues.push(updates.gender || null);
    }

    if (updateFields.length === 0) {
      res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      return;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCounter}`,
      updateValues
    );

    const result = await query(
      `SELECT 
        id, username, email, first_name, last_name, avatar, phone, 
        country, city, nationality, birth_date, gender, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    await logActivity(userId, 'UPDATE_PROFILE', 'user', userId, req);

    logger.info(`📝 User ${userId} updated their profile`);

    res.json(result.rows[0]);

  } catch (error) {
    logger.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni' });
      return;
    }

    const oldAvatarResult = await query(
      'SELECT avatar FROM users WHERE id = $1',
      [userId]
    );
    const oldAvatar = oldAvatarResult.rows[0]?.avatar;

    const avatarUrl = await uploadToCloudinary(req.file, 'avatars');

    await query(
      'UPDATE users SET avatar = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, userId]
    );

    await deleteOldAvatar(oldAvatar);

    await logActivity(userId, 'UPDATE_AVATAR', 'user', userId, req);

    logger.info(`📸 User ${userId} updated their avatar`);

    res.json({ 
      avatar: avatarUrl,
      message: 'Avatar mis à jour avec succès'
    });

  } catch (error) {
    logger.error('❌ Upload avatar error:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'upload' });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { current_password, new_password, confirm_password }: ChangePasswordData = req.body;

    if (!current_password || !new_password || !confirm_password) {
      res.status(400).json({ error: 'Tous les champs sont requis' });
      return;
    }

    if (new_password !== confirm_password) {
      res.status(400).json({ error: 'Les mots de passe ne correspondent pas' });
      return;
    }

    if (new_password.length < 8) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
      return;
    }

    if (!/[A-Z]/.test(new_password)) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins une majuscule' });
      return;
    }

    if (!/[0-9]/.test(new_password)) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins un chiffre' });
      return;
    }

    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const isValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      return;
    }

    const isSamePassword = await bcrypt.compare(new_password, userResult.rows[0].password_hash);
    if (isSamePassword) {
      res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'ancien' });
      return;
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    await logActivity(userId, 'CHANGE_PASSWORD', 'user', userId, req);

    logger.info(`🔐 User ${userId} changed their password`);

    res.json({ message: 'Mot de passe modifié avec succès' });

  } catch (error) {
    logger.error('❌ Change password error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function updateEmail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { email, password }: UpdateEmailData = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email et mot de passe requis' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Format d\'email invalide' });
      return;
    }

    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.toLowerCase(), userId]
    );

    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: 'Cet email est déjà utilisé' });
      return;
    }

    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    const isValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Mot de passe incorrect' });
      return;
    }

    await query(
      'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
      [email.toLowerCase(), userId]
    );

    await logActivity(userId, 'UPDATE_EMAIL', 'user', userId, req);

    logger.info(`📧 User ${userId} updated their email`);

    res.json({ 
      email: email.toLowerCase(),
      message: 'Email mis à jour avec succès' 
    });

  } catch (error) {
    logger.error('❌ Update email error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function updateUsername(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { username, password }: UpdateUsernameData = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
      return;
    }

    if (username.length < 3 || username.length > 30) {
      res.status(400).json({ error: 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères' });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      res.status(400).json({ error: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, - et _' });
      return;
    }

    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, userId]
    );

    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
      return;
    }

    const userResult = await query(
      'SELECT password_hash, username as old_username FROM users WHERE id = $1',
      [userId]
    );

    const isValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Mot de passe incorrect' });
      return;
    }

    const oldUsername = userResult.rows[0].old_username;

    await query(
      'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2',
      [username, userId]
    );

    await logActivity(userId, 'UPDATE_USERNAME', 'user', userId, req);

    logger.info(`👤 User ${userId} changed username from ${oldUsername} to ${username}`);

    res.json({ 
      username,
      message: 'Nom d\'utilisateur mis à jour avec succès' 
    });

  } catch (error) {
    logger.error('❌ Update username error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Mot de passe requis' });
      return;
    }

    const userResult = await query(
      'SELECT password_hash, avatar FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const isValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Mot de passe incorrect' });
      return;
    }

    await deleteOldAvatar(userResult.rows[0].avatar);

    await logActivity(userId, 'DELETE_ACCOUNT', 'user', userId, req);

    await query('DELETE FROM users WHERE id = $1', [userId]);

    logger.info(`🗑️ User ${userId} (${req.user!.username}) deleted their account`);

    res.json({ message: 'Compte supprimé avec succès' });

  } catch (error) {
    logger.error('❌ Delete account error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// CONTRÔLEURS ADMIN
// =====================================================

export async function getAllUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    const {
      page = '1',
      limit = '20',
      search,
      is_banned,
      country,
      city,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramCounter = 1;

    if (search) {
      whereConditions.push(`(u.username ILIKE $${paramCounter} OR u.email ILIKE $${paramCounter} OR u.first_name ILIKE $${paramCounter} OR u.last_name ILIKE $${paramCounter})`);
      params.push(`%${search}%`);
      paramCounter++;
    }

    if (is_banned !== undefined) {
      whereConditions.push(`u.is_banned = $${paramCounter++}`);
      params.push(is_banned === 'true');
    }

    if (country) {
      whereConditions.push(`u.country = $${paramCounter++}`);
      params.push(country);
    }

    if (city) {
      whereConditions.push(`u.city = $${paramCounter++}`);
      params.push(city);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const allowedSortFields = ['id', 'username', 'email', 'created_at', 'updated_at'];
    const sortField = allowedSortFields.includes(sort as string) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    // ✅ CORRECTION : Utiliser reporter_id
    const users = await query(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.avatar,
        u.first_name,
        u.last_name,
        u.country,
        u.city,
        u.is_admin,
        u.is_banned,
        u.created_at,
        u.updated_at,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = u.id) as reports_count,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = u.id) as streams_count
       FROM users u
       ${whereClause}
       ORDER BY u.${sortField} ${sortOrder}
       LIMIT $${paramCounter++} OFFSET $${paramCounter++}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      users: users.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        has_more: offset + limitNum < total,
      }
    });

  } catch (error) {
    logger.error('❌ Get all users error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function toggleBanUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.is_admin) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    const userId = getParamId(req.params);
    const { is_banned, reason } = req.body;

    if (is_banned === undefined) {
      res.status(400).json({ error: 'Statut de bannissement requis' });
      return;
    }

    const userResult = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    if (userResult.rows[0].is_admin && is_banned) {
      res.status(403).json({ error: 'Impossible de bannir un administrateur' });
      return;
    }

    await query(
      'UPDATE users SET is_banned = $1, updated_at = NOW() WHERE id = $2',
      [is_banned, userId]
    );

    await logActivity(req.user!.id, is_banned ? 'BAN_USER' : 'UNBAN_USER', 'user', parseInt(userId), req);

    logger.info(`${is_banned ? '🚫' : '✅'} User ${userId} ${is_banned ? 'banned' : 'unbanned'} by admin ${req.user!.id}`);

    res.json({ 
      message: `Utilisateur ${is_banned ? 'banni' : 'débanni'} avec succès`,
      is_banned 
    });

  } catch (error) {
    logger.error('❌ Toggle ban user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// =====================================================
// EXPORT PAR DÉFAUT
// =====================================================

export default {
  getUserProfile,
  getUserReports,
  getUserStats,
  getMyProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  updateEmail,
  updateUsername,
  deleteAccount,
  getAllUsers,
  toggleBanUser,
};