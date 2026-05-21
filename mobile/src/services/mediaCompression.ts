import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

interface CompressedMedia {
  uri: string;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB

export class MediaCompressionService {
  // Compresser une image
  static async compressImage(uri: string, quality: number = 0.7): Promise<CompressedMedia> {
    try {
      // Pour Expo, on utiliserait normalement ImageManipulator
      // Mais pour une solution simple, on retourne l'URI original
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const originalSize = fileInfo.size || 0;

      return {
        uri,
        size: originalSize,
        originalSize,
        compressionRatio: 1,
      };
    } catch (error) {
      console.error('Erreur compression image:', error);
      throw error;
    }
  }

  // Valider la taille du fichier
  static validateFileSize(size: number, type: 'image' | 'video' | 'document'): boolean {
    switch (type) {
      case 'image':
        return size <= MAX_IMAGE_SIZE;
      case 'video':
        return size <= MAX_VIDEO_SIZE;
      case 'document':
        return size <= MAX_DOCUMENT_SIZE;
      default:
        return false;
    }
  }

  // Obtenir le type MIME approprié
  static getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',

      // Vidéos
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      webm: 'video/webm',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      zip: 'application/zip',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  // Vérifier si le fichier est d'un type autorisé
  static isAllowedFileType(filename: string, allowedTypes: string[]): boolean {
    const mimeType = this.getMimeType(filename);
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        // Vérifier le type générique (e.g., image/*)
        return mimeType.startsWith(type.replace('/*', ''));
      }
      return mimeType === type;
    });
  }

  // Formatter la taille du fichier
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Traiter un fichier uploadé
  static async processUploadedFile(
    uri: string,
    filename: string,
    type: 'image' | 'video' | 'document'
  ): Promise<CompressedMedia> {
    // Valider le type
    const allowedTypes = {
      image: ['image/*'],
      video: ['video/*'],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
      ],
    };

    if (!this.isAllowedFileType(filename, allowedTypes[type])) {
      throw new Error(`Type de fichier non autorisé pour ${type}`);
    }

    // Obtenir la taille du fichier
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const fileSize = fileInfo.size || 0;

    // Valider la taille
    if (!this.validateFileSize(fileSize, type)) {
      const maxSize = {
        image: MAX_IMAGE_SIZE,
        video: MAX_VIDEO_SIZE,
        document: MAX_DOCUMENT_SIZE,
      };
      throw new Error(
        `Fichier trop volumineux. Maximum: ${this.formatFileSize(maxSize[type])}`
      );
    }

    // Compresser si c'est une image
    if (type === 'image') {
      return this.compressImage(uri);
    }

    return {
      uri,
      size: fileSize,
      originalSize: fileSize,
      compressionRatio: 1,
    };
  }
}

export default MediaCompressionService;
