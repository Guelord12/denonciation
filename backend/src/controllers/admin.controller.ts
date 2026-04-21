import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { redisClient } from '../config/redis';
import { sendSMS } from '../services/sms.service';
import { logger } from '../utils/logger';
import { io } from '../index';
import { learnFromManualModeration } from '../services/aiModeration.service';

// =====================================================
// FONCTIONS UTILITAIRES ROBUSTES POUR REDIS
// =====================================================

async function safeRedisSCard(key: string): Promise<number> {
  try {
    if (redisClient && redisClient.isOpen) {
      return await redisClient.sCard(key) || 0;
    }
    return 0;
  } catch (error) {
    logger.warn(`Redis sCard error for key ${key}:`, error);
    return 0;
  }
}

async function safeRedisHLen(key: string): Promise<number> {
  try {
    if (redisClient && redisClient.isOpen) {
      return await redisClient.hLen(key) || 0;
    }
    return 0;
  } catch (error) {
    logger.warn(`Redis hLen error for key ${key}:`, error);
    return 0;
  }
}

async function safeRedisGet(key: string): Promise<string | null> {
  try {
    if (redisClient && redisClient.isOpen) {
      return await redisClient.get(key);
    }
    return null;
  } catch (error) {
    logger.warn(`Redis get error for key ${key}:`, error);
    return null;
  }
}

async function safeRedisFlushAll(): Promise<void> {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.flushAll();
    }
  } catch (error) {
    logger.warn('Redis flushAll error:', error);
  }
}

async function getActiveUsersCount(): Promise<number> {
  try {
    if (redisClient && redisClient.isOpen) {
      return await redisClient.sCard('active_users') || 0;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

async function getActiveStreamsCount(): Promise<number> {
  try {
    if (redisClient && redisClient.isOpen) {
      return await redisClient.hLen('active_streams') || 0;
    }
    const result = await query("SELECT COUNT(*) as count FROM live_streams WHERE status = 'active'");
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    return 0;
  }
}

async function getTotalViewersCount(): Promise<number> {
  try {
    if (redisClient && redisClient.isOpen) {
      const total = await redisClient.get('total_live_viewers');
      return parseInt(total || '0');
    }
    const result = await query("SELECT COALESCE(SUM(viewer_count), 0) as total FROM live_streams WHERE status = 'active'");
    return parseInt(result.rows[0]?.total || '0');
  } catch (error) {
    return 0;
  }
}

async function getTodayReportsCount(): Promise<number> {
  try {
    const result = await query('SELECT COUNT(*) as count FROM reports WHERE DATE(created_at) = CURRENT_DATE');
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    return 0;
  }
}

async function getTodayUsersCount(): Promise<number> {
  try {
    const result = await query('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURRENT_DATE');
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    return 0;
  }
}

async function getPendingModerationCount(): Promise<number> {
  try {
    const result = await query(
      "SELECT COUNT(*) as count FROM reports WHERE requires_manual_review = true AND status = 'pending'"
    );
    return parseInt(result.rows[0]?.count || '0');
  } catch (error) {
    return 0;
  }
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    console.log('📊 [ADMIN] Fetching dashboard stats...');
    
    const stats = await Promise.all([
      query('SELECT COUNT(*) as total FROM users').catch(err => { logger.error('Users count error:', err); return { rows: [{ total: 0 }] }; }),
      query('SELECT COUNT(*) as total FROM reports').catch(err => { logger.error('Reports count error:', err); return { rows: [{ total: 0 }] }; }),
      query('SELECT COUNT(*) as total FROM reports WHERE status = $1', ['pending']).catch(err => { logger.error('Pending reports error:', err); return { rows: [{ total: 0 }] }; }),
      query('SELECT COUNT(*) as total FROM live_streams WHERE status = $1', ['active']).catch(err => { logger.error('Active streams error:', err); return { rows: [{ total: 0 }] }; }),
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) 
        ORDER BY date ASC
      `).catch(err => { logger.error('User growth error:', err); return { rows: [] }; }),
      query(`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM reports 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) 
        ORDER BY date ASC
      `).catch(err => { logger.error('Report growth error:', err); return { rows: [] }; }),
      query(`
        SELECT c.name, c.color, COUNT(r.id) as count
        FROM categories c
        LEFT JOIN reports r ON r.category_id = c.id
        GROUP BY c.id, c.name, c.color
        ORDER BY count DESC
      `).catch(err => { logger.error('Categories error:', err); return { rows: [] }; })
    ]);

    const activeUsers = await getActiveUsersCount();
    const totalViewers = await getTotalViewersCount();

    const response = {
      totalUsers: parseInt(stats[0].rows[0]?.total || '0'),
      totalReports: parseInt(stats[1].rows[0]?.total || '0'),
      pendingReports: parseInt(stats[2].rows[0]?.total || '0'),
      activeStreams: parseInt(stats[3].rows[0]?.total || '0'),
      activeUsers: activeUsers,
      totalLiveViewers: totalViewers,
      userGrowth: stats[4].rows || [],
      reportGrowth: stats[5].rows || [],
      reportsByCategory: stats[6].rows || []
    };
    
    console.log(`✅ [ADMIN] Stats fetched: ${response.totalUsers} users, ${response.totalReports} reports, ${response.activeUsers} active`);
    
    res.json(response);
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    console.error('❌ [ADMIN] Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET ALL USERS
// =====================================================

export async function getAllUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', search = '', banned } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    console.log(`📊 [ADMIN] Fetching users - page: ${pageNum}, search: "${search}", banned: ${banned}`);
    
    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;
    
    if (search && search !== '') {
      whereConditions.push(`(username ILIKE $${paramCounter} OR email ILIKE $${paramCounter} OR first_name ILIKE $${paramCounter} OR last_name ILIKE $${paramCounter})`);
      params.push(`%${search}%`);
      paramCounter++;
    }
    
    if (banned !== undefined && banned !== '') {
      whereConditions.push(`is_banned = $${paramCounter}`);
      params.push(banned === 'true');
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const users = await query(
      `SELECT 
        id, username, email, first_name, last_name, avatar, phone,
        country, city, is_banned, is_admin, created_at, updated_at,
        (SELECT COUNT(*) FROM reports WHERE reporter_id = users.id) as reports_count,
        (SELECT COUNT(*) FROM comments WHERE user_id = users.id) as comments_count
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0]?.total || '0');
    console.log(`✅ [ADMIN] Found ${users.rows.length} users (total: ${total})`);

    res.json({
      users: users.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    console.error('❌ [ADMIN] Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// BAN USER
// =====================================================

export async function banUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    await query(
      'UPDATE users SET is_banned = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user!.id, 'BAN_USER', 'user', userId, JSON.stringify({ reason })]
    );

    const userResult = await query('SELECT phone, username FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0]?.phone) {
      try {
        await sendSMS(
          userResult.rows[0].phone,
          `Votre compte a été banni. Raison: ${reason}`
        );
      } catch (smsError) {
        logger.warn('Failed to send ban SMS:', smsError);
      }
    }

    io.to(`user:${userId}`).emit('account_banned', { reason });
    logger.info(`User ${userId} banned by admin ${req.user!.id}`);
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    logger.error('Ban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// UNBAN USER
// =====================================================

export async function unbanUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    await query(
      'UPDATE users SET is_banned = false, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id) 
       VALUES ($1, $2, $3, $4)`,
      [req.user!.id, 'UNBAN_USER', 'user', userId]
    );

    logger.info(`User ${userId} unbanned by admin ${req.user!.id}`);
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    logger.error('Unban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// SEND WARNING SMS
// =====================================================

export async function sendWarningSMS(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { message, violationType } = req.body;

    const userResult = await query(
      'SELECT phone, first_name, username FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows[0]?.phone) {
      res.status(400).json({ error: 'User has no phone number' });
      return;
    }

    const user = userResult.rows[0];
    
    const violationsResult = await query(
      `SELECT COUNT(*) as count FROM activity_logs 
       WHERE user_id = $1 AND action = 'SEND_WARNING' AND created_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );
    
    const violationCount = parseInt(violationsResult.rows[0]?.count || '0') + 1;
    
    let warningMessage = `[DENONCIATION] Avertissement #${violationCount}: ${message}`;
    
    if (violationCount >= 3) {
      warningMessage += ' Prochain manquement entraînera un bannissement.';
    }

    await sendSMS(user.phone, warningMessage);

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user!.id, 'SEND_WARNING', 'user', userId, JSON.stringify({ message: warningMessage, violationType, violationCount })]
    );

    await query(
      `INSERT INTO notifications (user_id, type, content, related_id) 
       VALUES ($1, $2, $3, $4)`,
      [userId, 'system', warningMessage, userId]
    );

    io.to(`user:${userId}`).emit('warning_received', { message: warningMessage, violationCount });

    res.json({ message: 'Warning sent successfully', violationCount });
  } catch (error) {
    logger.error('Send warning SMS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET REALTIME STATS
// =====================================================

export async function getRealtimeStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [
      activeUsers,
      activeStreams,
      totalViewers,
      todayReports,
      todayUsers,
      pendingModeration
    ] = await Promise.all([
      getActiveUsersCount(),
      getActiveStreamsCount(),
      getTotalViewersCount(),
      getTodayReportsCount(),
      getTodayUsersCount(),
      getPendingModerationCount()
    ]);

    const response = {
      activeUsers: activeUsers,
      activeStreams: activeStreams,
      totalViewers: totalViewers,
      todayReports: todayReports,
      todayUsers: todayUsers,
      pendingModeration: pendingModeration,
      timestamp: new Date().toISOString()
    };
    
    io.to('admins').emit('stats_update', response);
    
    res.json(response);
  } catch (error) {
    logger.error('Get realtime stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET REPORTS
// =====================================================

export async function getReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', status, category } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    console.log(`📊 [ADMIN] Fetching reports - page: ${pageNum}, status: ${status}`);
    
    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;
    
    if (status && status !== '') {
      whereConditions.push(`r.status = $${paramCounter}`);
      params.push(status);
      paramCounter++;
    }
    
    if (category && category !== '') {
      whereConditions.push(`r.category_id = $${paramCounter}`);
      params.push(category);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const reports = await query(
      `SELECT 
        r.*, 
        u.username, u.avatar as user_avatar,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        city.name as city_name,
        (SELECT COUNT(*) FROM likes WHERE report_id = r.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE report_id = r.id) as comments_count,
        (SELECT COUNT(*) FROM witnesses WHERE report_id = r.id) as witnesses_count
       FROM reports r
       LEFT JOIN users u ON r.reporter_id = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN cities city ON r.city_id = city.id
       ${whereClause}
       ORDER BY r.created_at DESC 
       LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM reports r ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0]?.total || '0');
    console.log(`✅ [ADMIN] Found ${reports.rows.length} reports (total: ${total})`);

    res.json({
      reports: reports.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    console.error('❌ [ADMIN] Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// UPDATE REPORT STATUS
// =====================================================

export async function updateReportStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rawReportId = req.params.reportId;
    const reportId = Array.isArray(rawReportId) ? rawReportId[0] : rawReportId;
    const { status, reason } = req.body;

    const result = await query(
      `UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING reporter_id, title`,
      [status, reportId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user!.id, 'UPDATE_REPORT_STATUS', 'report', reportId, JSON.stringify({ status, reason })]
    );

    await query(
      `INSERT INTO notifications (user_id, type, content, related_id) 
       VALUES ($1, $2, $3, $4)`,
      [result.rows[0].reporter_id, 'report_status', 
       `Votre signalement "${result.rows[0].title}" a été ${status === 'approved' ? 'approuvé' : 'rejeté'}. ${reason || ''}`, 
       reportId]
    );

    io.to(`user:${result.rows[0].reporter_id}`).emit('report_status_updated', { reportId, status, reason });

    if (status === 'approved' || status === 'rejected') {
      try {
        await learnFromManualModeration(parseInt(reportId), status, req.user!.id);
        logger.info(`🧠 [AI Learning] Recorded manual moderation for report ${reportId}: ${status}`);
      } catch (aiError) {
        logger.error('AI learning error:', aiError);
      }
    }

    res.json({ message: 'Report status updated successfully' });
  } catch (error) {
    logger.error('Update report status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// GET MODERATION REPORTS
// =====================================================

export async function getModerationReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    console.log(`📊 [ADMIN] Fetching moderation reports - page: ${pageNum}, status: ${status || 'all'}`);
    
    let whereConditions: string[] = ['r.requires_manual_review = true'];
    const params: any[] = [];
    
    if (status && status !== '') {
      if (status === 'pending') {
        whereConditions.push(`r.status = 'pending'`);
      } else if (status === 'reviewed') {
        whereConditions.push(`r.status IN ('approved', 'rejected') AND r.auto_moderated = false`);
      } else if (status === 'resolved') {
        whereConditions.push(`r.status IN ('approved', 'rejected') AND r.resolved_by IS NOT NULL`);
      }
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const reportsQuery = `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.status,
        r.reporter_id,
        r.moderation_score,
        r.moderation_flags,
        r.auto_moderated,
        r.requires_manual_review,
        r.created_at,
        r.report_type,
        r.resolved_by,
        r.resolution_note,
        u.username as reporter_username,
        u.avatar as reporter_avatar,
        c.name as category_name,
        c.color as category_color,
        resolver.username as resolver_username,
        CASE 
          WHEN r.stream_id IS NOT NULL THEN 'live'
          WHEN r.report_type = 'stream_violation' THEN 'live'
          ELSE 'report'
        END as target_type,
        CASE 
          WHEN r.stream_id IS NOT NULL THEN (SELECT title FROM live_streams WHERE id = r.stream_id)
          ELSE r.title
        END as target_preview,
        COALESCE(r.description, r.title) as reason
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN users resolver ON r.resolved_by = resolver.id
      ${whereClause}
      ORDER BY 
        CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
        r.moderation_score ASC NULLS LAST,
        r.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    console.log(`🔍 [ADMIN] Reports query whereClause: ${whereClause}`);
    
    const reportsResult = await query(reportsQuery, [limitNum, offset]);
    
    const countQuery = `
      SELECT COUNT(*) as total FROM reports r
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, []);
    const total = parseInt(countResult.rows[0]?.total || '0');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN r.status IN ('approved', 'rejected') AND r.auto_moderated = false THEN 1 END) as reviewed,
        COUNT(CASE WHEN r.status IN ('approved', 'rejected') AND r.resolved_by IS NOT NULL THEN 1 END) as resolved
      FROM reports r
      WHERE r.requires_manual_review = true
    `;
    
    const statsResult = await query(statsQuery, []);
    const stats = statsResult.rows[0];
    
    console.log(`✅ [ADMIN] Found ${reportsResult.rows.length} moderation reports (total: ${total})`);
    console.log(`   Stats: pending=${stats.pending}, reviewed=${stats.reviewed}, resolved=${stats.resolved}`);

    res.json({
      reports: reportsResult.rows,
      stats: {
        pending: parseInt(stats.pending) || 0,
        reviewed: parseInt(stats.reviewed) || 0,
        resolved: parseInt(stats.resolved) || 0,
        total: total
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get moderation reports error:', error);
    console.error('❌ [ADMIN] Get moderation reports error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}

// =====================================================
// RESOLVE MODERATION REPORT
// =====================================================

export async function resolveModerationReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { reportId } = req.params;
    const { resolution, action } = req.body;

    console.log(`📝 [ADMIN] Resolving moderation report ${reportId} with action: ${action || 'resolved'}`);

    const updateResult = await query(
      `UPDATE reports 
       SET status = $1, 
           requires_manual_review = false, 
           resolved_by = $2, 
           resolved_at = NOW(),
           resolution_note = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING reporter_id, title`,
      [action || 'resolved', req.user!.id, resolution || 'Signalement traité', reportId]
    );

    if (updateResult.rows.length === 0) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const report = updateResult.rows[0];

    await query(
      `INSERT INTO notifications (user_id, type, content, related_id, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        report.reporter_id,
        'moderation_resolved',
        `Votre signalement "${report.title}" a été examiné et ${action === 'approved' ? 'approuvé' : 'traité'}.`,
        reportId
      ]
    );

    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [req.user!.id, 'RESOLVE_MODERATION', 'report', reportId, JSON.stringify({ resolution, action })]
    );

    io.to('admins').emit('stats_update', { type: 'moderation_resolved', reportId });

    logger.info(`✅ Moderation report ${reportId} resolved by admin ${req.user!.id}`);
    
    res.json({ 
      message: 'Moderation report resolved successfully',
      reportId: reportId
    });
  } catch (error) {
    logger.error('Resolve moderation report error:', error);
    console.error('❌ [ADMIN] Resolve moderation report error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}

// =====================================================
// GET ACTIVITY LOGS
// =====================================================

export async function getActivityLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '50', userId, action } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;
    
    if (userId && userId !== '') {
      whereConditions.push(`al.user_id = $${paramCounter}`);
      params.push(userId);
      paramCounter++;
    }
    
    if (action && action !== '') {
      whereConditions.push(`al.action = $${paramCounter}`);
      params.push(action);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const logs = await query(
      `SELECT al.*, u.username, u.email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC 
       LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`,
      params
    );

    res.json({
      logs: logs.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0]?.total || '0'),
        pages: Math.ceil(parseInt(countResult.rows[0]?.total || '0') / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// EXPORT DATA
// =====================================================

export async function exportData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    let data: any[] = [];
    
    switch (type) {
      case 'users':
        const usersResult = await query(`
          SELECT id, username, email, first_name, last_name, phone, 
                 is_banned, is_admin, created_at,
                 (SELECT COUNT(*) FROM reports WHERE reporter_id = users.id) as reports_count
          FROM users
          WHERE created_at BETWEEN $1 AND $2
          ORDER BY created_at DESC
        `, [startDate || '2000-01-01', endDate || new Date().toISOString()]);
        data = usersResult.rows;
        break;
        
      case 'reports':
        const reportsResult = await query(`
          SELECT r.id, r.title, r.description, r.status, r.created_at, 
                 u.username, c.name as category
          FROM reports r
          LEFT JOIN users u ON r.reporter_id = u.id
          LEFT JOIN categories c ON r.category_id = c.id
          WHERE r.created_at BETWEEN $1 AND $2
          ORDER BY r.created_at DESC
        `, [startDate || '2000-01-01', endDate || new Date().toISOString()]);
        data = reportsResult.rows;
        break;
        
      default:
        res.status(400).json({ error: 'Invalid export type' });
        return;
    }
    
    if (data.length > 0) {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_export_${new Date().toISOString()}.csv`);
      res.send(csv);
    } else {
      res.status(404).json({ error: 'No data found' });
    }
  } catch (error) {
    logger.error('Export data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];
  
  csvRows.push(headers.join(','));
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return value.toISOString();
      return String(value);
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// =====================================================
// UPDATE SETTINGS
// =====================================================

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const settings = req.body;
    
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, details) 
       VALUES ($1, $2, $3, $4)`,
      [req.user!.id, 'UPDATE_SETTINGS', 'settings', JSON.stringify(settings)]
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =====================================================
// CLEAR CACHE
// =====================================================

export async function clearCache(req: AuthRequest, res: Response): Promise<void> {
  try {
    await safeRedisFlushAll();
    
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type) 
       VALUES ($1, $2, $3)`,
      [req.user!.id, 'CLEAR_CACHE', 'cache']
    );

    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    logger.error('Clear cache error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}