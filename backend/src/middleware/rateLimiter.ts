import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// ✅ Limiteur général - Limites augmentées pour le développement
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // ✅ Augmenté de 100 à 500
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  skip: () => process.env.NODE_ENV === 'development', // ✅ Désactiver en développement
});

// ✅ Limiteur strict pour l'authentification - Limites augmentées
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // ✅ Augmenté de 10 à 50
  message: { error: 'Trop de tentatives, veuillez réessayer plus tard' },
  skipSuccessfulRequests: true,
  skip: () => process.env.NODE_ENV === 'development', // ✅ Désactiver en développement
});

// ✅ Limiteur pour la création de signalements - Limites augmentées
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 50, // ✅ Augmenté de 10 à 50
  message: { error: 'Limite de signalements atteinte, veuillez patienter' },
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip;
  },
  skip: () => process.env.NODE_ENV === 'development', // ✅ Désactiver en développement
});

// ✅ Limiteur pour les commentaires - Limites augmentées
export const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // ✅ Augmenté de 20 à 100
  message: { error: 'Trop de commentaires, veuillez ralentir' },
  skip: () => process.env.NODE_ENV === 'development', // ✅ Désactiver en développement
});