import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    is_admin: boolean;
    is_banned: boolean;
    avatar?: string;
    first_name?: string;
    last_name?: string;
  };
  token?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // ✅ Vérifier si le token est blacklisté dans Redis (seulement si Redis est connecté)
    try {
      if (redisClient.isOpen) {
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
          res.status(401).json({ error: 'Token revoked' });
          return;
        }
      }
    } catch (redisError) {
      logger.warn('Redis error in authenticate (non-blocking):', redisError);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Vérifier le type de token
    if (decoded.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }
    
    const result = await query(
      `SELECT id, username, email, is_admin, is_banned, avatar, first_name, last_name 
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    
    if (user.is_banned) {
      res.status(403).json({ error: 'Account banned', reason: 'Your account has been banned' });
      return;
    }

    req.user = user;
    req.token = token;
    
    // ✅ Mettre à jour la dernière activité (seulement si Redis est connecté)
    try {
      if (redisClient.isOpen) {
        await redisClient.set(`user_activity:${user.id}`, Date.now().toString(), { EX: 300 });
      }
    } catch (redisError) {
      logger.warn('Redis error in authenticate activity (non-blocking):', redisError);
    }
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (roles.includes('admin') && !req.user.is_admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  };
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    query(
      `SELECT id, username, email, is_admin, is_banned, avatar, first_name, last_name 
       FROM users WHERE id = $1`,
      [decoded.userId]
    ).then(result => {
      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (!user.is_banned) {
          req.user = user;
        }
      }
      next();
    }).catch(() => {
      next();
    });
  } catch {
    next();
  }
}

export async function checkResourceOwnership(
  req: AuthRequest, 
  res: Response, 
  next: NextFunction,
  resourceTable: string,
  resourceIdParam: string = 'id',
  userIdField: string = 'user_id'
): Promise<void> {
  try {
    const resourceId = req.params[resourceIdParam];
    
    if (!resourceId) {
      res.status(400).json({ error: 'Resource ID required' });
      return;
    }
    
    const result = await query(
      `SELECT ${userIdField} FROM ${resourceTable} WHERE id = $1`,
      [resourceId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    
    const ownerId = result.rows[0][userIdField];
    
    if (ownerId !== req.user?.id && !req.user?.is_admin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('Resource ownership check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}