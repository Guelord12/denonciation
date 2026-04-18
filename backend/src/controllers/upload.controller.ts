import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export async function uploadFile(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const folder = req.query.folder as string || 'general';
    const fileUrl = await uploadToCloudinary(req.file, folder);

    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    logger.error('Upload file error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
}

export async function uploadMultipleFiles(req: AuthRequest, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const folder = req.query.folder as string || 'general';
    const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
    const urls = await Promise.all(uploadPromises);

    res.json({
      urls,
      count: urls.length
    });
  } catch (error) {
    logger.error('Upload multiple files error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
}

export async function deleteFile(req: AuthRequest, res: Response) {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID requis' });
    }

    await deleteFromCloudinary(publicId);

    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
}