import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from './errorHandler';

// Créer le dossier uploads s'il n'existe pas
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de stockage mémoire (pour Cloudinary)
const memoryStorage = multer.memoryStorage();

// Configuration de stockage disque
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'general';
    
    if (req.path.includes('avatar')) {
      folder = 'avatars';
    } else if (req.path.includes('report')) {
      folder = 'reports';
    } else if (req.path.includes('live')) {
      folder = 'thumbnails';
    }
    
    const fullPath = path.join(uploadDir, folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Filtre de fichiers
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Type de fichier non supporté', 400));
  }
};

// Taille maximale des fichiers
const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB par défaut

// Export des configurations multer
export const uploadMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: maxSize },
  fileFilter
});

export const uploadDisk = multer({
  storage: diskStorage,
  limits: { fileSize: maxSize },
  fileFilter
});

// Middlewares spécifiques
export const uploadAvatar = uploadMemory.single('avatar');
export const uploadReportMedia = uploadMemory.single('media');
export const uploadMultipleMedia = uploadMemory.array('media', 10);
export const uploadThumbnail = uploadMemory.single('thumbnail');

// Middleware de gestion d'erreur pour multer
export function handleMulterError(err: any, req: any, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Trop de fichiers' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
}