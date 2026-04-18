import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { validateEmail, validatePassword, validateUsername } from '../utils/validators';
import { redisClient } from '../config/redis';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendWelcomeEmail } from '../services/email.service';
import { sendSMS } from '../services/sms.service';

// Fonctions utilitaires pour les tokens
function generateAccessToken(userId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(
    { userId, type: 'access' },
    secret,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );
}

function generateRefreshToken(userId: number): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  
  return jwt.sign(
    { userId, type: 'refresh' },
    secret,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any }
  );
}

async function storeRefreshToken(userId: number, token: string): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      console.log('⚠️ Redis not available, skipping refresh token storage');
      return;
    }
    
    const decoded = jwt.decode(token) as any;
    const expiresAt = new Date(decoded.exp * 1000);
    
    await redisClient.set(`refresh_token:${userId}:${token}`, '1', {
      EX: Math.floor((expiresAt.getTime() - Date.now()) / 1000)
    });
  } catch (error) {
    console.warn('⚠️ Redis error (non-blocking):', error);
  }
}

async function createSession(userId: number, token: string, req: Request): Promise<void> {
  const decoded = jwt.decode(token) as any;
  const expiresAt = new Date(decoded.exp * 1000);
  
  await query(
    `INSERT INTO user_sessions (user_id, token, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      token,
      req.headers['user-agent'],
      req.ip || req.socket.remoteAddress,
      expiresAt
    ]
  );
}

async function logActivity(userId: number, action: string, entityType: string, entityId: number, req: Request): Promise<void> {
  await query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, entityType, entityId, req.ip || req.socket.remoteAddress, req.headers['user-agent']]
  );
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

// =====================================================
// CONTROLLERS
// =====================================================

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { 
      username, 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      country, 
      city, 
      nationality, 
      birth_date, 
      gender 
    } = req.body;

    console.log('📝 [REGISTER] Attempt:', { 
      username, 
      email, 
      phone, 
      birth_date,
      nationality,
      gender,
      country,
      city
    });

    // Validation
    if (!validateUsername(username)) {
      console.log('❌ [REGISTER] Invalid username');
      res.status(400).json({ error: 'Nom d\'utilisateur invalide (3-50 caractères)' });
      return;
    }
    if (!validateEmail(email)) {
      console.log('❌ [REGISTER] Invalid email');
      res.status(400).json({ error: 'Email invalide' });
      return;
    }
    if (!validatePassword(password)) {
      console.log('❌ [REGISTER] Invalid password');
      res.status(400).json({ error: 'Mot de passe invalide (min 8 caractères, majuscule, minuscule, chiffre)' });
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ [REGISTER] User already exists');
      res.status(409).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
      return;
    }

    // Hasher le mot de passe
    const password_hash = await bcrypt.hash(password, 10);

    // ✅ Créer l'utilisateur avec TOUS les champs
    const result = await query(
      `INSERT INTO users (
        username, email, password_hash, first_name, last_name, 
        phone, country, city, nationality, birth_date, gender
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, username, email, first_name, last_name, phone, country, city, nationality, birth_date, gender, is_admin, created_at`,
      [username, email, password_hash, first_name || null, last_name || null, 
       phone || null, country || null, city || null, nationality || null, 
       birth_date || null, gender || null]
    );

    const user = result.rows[0];
    console.log('✅ [REGISTER] User created:', user.id);
    console.log('📋 [REGISTER] User details:', { 
      phone: user.phone, 
      country: user.country, 
      city: user.city,
      nationality: user.nationality,
      birth_date: user.birth_date,
      gender: user.gender
    });

    // Créer une notification de bienvenue
    await query(
      `INSERT INTO notifications (user_id, type, content)
       VALUES ($1, 'welcome', $2)`,
      [user.id, `Bienvenue ${user.username} sur Dénonciation ! Votre compte a été créé avec succès.`]
    );

    // ✅ Envoyer un email de bienvenue (asynchrone, non bloquant)
    setTimeout(async () => {
      try {
        const emailSent = await sendWelcomeEmail(email, {
          username: user.username,
          first_name: user.first_name || user.username
        });
        if (emailSent) {
          console.log(`✅ [REGISTER] Welcome email sent to ${email}`);
        } else {
          console.warn(`⚠️ [REGISTER] Failed to send welcome email to ${email}`);
        }
      } catch (emailError) {
        console.error('❌ [REGISTER] Email error:', emailError);
      }
    }, 100);

    // ✅ Envoyer un SMS de bienvenue (asynchrone, non bloquant)
    if (phone) {
      setTimeout(async () => {
        try {
          const smsResult = await sendSMS(
            phone,
            `[Dénonciation] Bienvenue ${user.first_name || user.username} ! Votre compte a été créé avec succès. Merci de contribuer à une société plus juste.`
          );
          if (smsResult.success) {
            console.log(`✅ [REGISTER] Welcome SMS sent to ${phone}`);
          } else {
            console.warn(`⚠️ [REGISTER] Failed to send welcome SMS to ${phone}: ${smsResult.error}`);
          }
        } catch (smsError) {
          console.error('❌ [REGISTER] SMS error:', smsError);
        }
      }, 100);
    } else {
      console.log(`ℹ️ [REGISTER] No phone number provided, skipping SMS`);
    }

    // Générer les tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Stocker le refresh token
    await storeRefreshToken(user.id, refreshToken);

    // Logger l'activité
    await logActivity(user.id, 'REGISTER', 'user', user.id, req);

    console.log('✅ [REGISTER] Success:', { userId: user.id, username: user.username });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        country: user.country,
        city: user.city,
        nationality: user.nationality,
        birth_date: user.birth_date,
        gender: user.gender,
        is_admin: user.is_admin
      },
      tokens: {
        access: accessToken,
        refresh: refreshToken
      }
    });
  } catch (error) {
    console.error('❌ [REGISTER] Error:', error);
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    console.log('📝 [LOGIN] Attempt:', { username });

    const result = await query(
      `SELECT id, username, email, password_hash, is_admin, is_banned, 
              first_name, last_name, phone, country, city, nationality, birth_date, gender, avatar
       FROM users WHERE username = $1 OR email = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      console.log('❌ [LOGIN] User not found');
      res.status(401).json({ error: 'Identifiants invalides' });
      return;
    }

    const user = result.rows[0];

    if (user.is_banned) {
      console.log('❌ [LOGIN] User is banned');
      res.status(403).json({ error: 'Votre compte a été banni' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ [LOGIN] Invalid password');
      res.status(401).json({ error: 'Identifiants invalides' });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await storeRefreshToken(user.id, refreshToken);
    await createSession(user.id, refreshToken, req);
    await logActivity(user.id, 'LOGIN', 'user', user.id, req);

    delete user.password_hash;

    console.log('✅ [LOGIN] Success:', { userId: user.id, username: user.username });

    res.json({
      user,
      tokens: {
        access: accessToken,
        refresh: refreshToken
      }
    });
  } catch (error) {
    console.error('❌ [LOGIN] Error:', error);
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;
    console.log('📝 [LOGOUT] Attempt:', { userId });

    if (refreshToken) {
      await query('DELETE FROM user_sessions WHERE token = $1', [refreshToken]);
    }

    if (userId) {
      try {
        if (redisClient.isOpen) {
          await redisClient.del(`refresh_token:${userId}`);
        }
      } catch (redisError) {
        console.warn('⚠️ Redis error during logout (non-blocking):', redisError);
      }
      await logActivity(userId, 'LOGOUT', 'user', userId, req);
    }

    console.log('✅ [LOGOUT] Success');
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('❌ [LOGOUT] Error:', error);
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Erreur lors de la déconnexion' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    console.log('📝 [REFRESH] Attempt');

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token requis' });
      return;
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    const decoded = jwt.verify(refreshToken, secret) as any;
    
    const session = await query(
      'SELECT * FROM user_sessions WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (session.rows.length === 0) {
      console.log('❌ [REFRESH] Invalid or expired session');
      res.status(401).json({ error: 'Refresh token invalide ou expiré' });
      return;
    }

    const user = await query(
      'SELECT id, is_banned FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (user.rows.length === 0 || user.rows[0].is_banned) {
      console.log('❌ [REFRESH] User not found or banned');
      res.status(403).json({ error: 'Utilisateur non trouvé ou banni' });
      return;
    }

    const newAccessToken = generateAccessToken(decoded.userId);
    console.log('✅ [REFRESH] Success');

    res.json({ access: newAccessToken });
  } catch (error) {
    console.error('❌ [REFRESH] Error:', error);
    logger.error('Refresh error:', error);
    res.status(401).json({ error: 'Refresh token invalide' });
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    
    const result = await query(
      `SELECT id, username, email, first_name, last_name, avatar, 
              phone, country, city, nationality, birth_date, gender,
              is_admin, is_banned, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const user = result.rows[0];

    const stats = await query(
      `SELECT 
        (SELECT COUNT(*) FROM reports WHERE user_id = $1) as reports_count,
        (SELECT COUNT(*) FROM comments WHERE user_id = $1) as comments_count,
        (SELECT COUNT(*) FROM likes WHERE user_id = $1) as likes_count,
        (SELECT COUNT(*) FROM live_streams WHERE user_id = $1) as streams_count
      `,
      [userId]
    );

    res.json({
      ...user,
      stats: stats.rows[0]
    });
  } catch (error) {
    logger.error('Me error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!validatePassword(newPassword)) {
      res.status(400).json({ error: 'Nouveau mot de passe invalide' });
      return;
    }

    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    await logActivity(userId, 'CHANGE_PASSWORD', 'user', userId, req);

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email requis' });
      return;
    }

    const result = await query(
      'SELECT id, username FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Ne pas révéler si l'email existe ou non
      res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });
      return;
    }

    const user = result.rows[0];
    const resetToken = jwt.sign(
      { userId: user.id, type: 'reset' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Envoyer l'email de réinitialisation
    const resetLink = `${process.env.WEB_URL}/reset-password?token=${resetToken}`;
    
    // TODO: Implémenter l'envoi d'email de réinitialisation
    console.log(`📧 Reset password link for ${email}: ${resetLink}`);

    res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token et mot de passe requis' });
      return;
    }

    if (!validatePassword(password)) {
      res.status(400).json({ error: 'Mot de passe invalide' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'reset') {
      res.status(400).json({ error: 'Token invalide' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, decoded.userId]
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(400).json({ error: 'Token invalide ou expiré' });
  }
}