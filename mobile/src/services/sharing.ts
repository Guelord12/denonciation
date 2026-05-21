import * as Sharing from 'expo-sharing';
import * as QRCode from 'qrcode';
import { deepLinkUtils } from '../config/deepLinking';

interface ShareOptions {
  reportId?: string;
  streamId?: string;
  userId?: string;
  title: string;
  message: string;
  url?: string;
  includeQR?: boolean;
}

export class SharingService {
  // Partager un rapport
  static async shareReport(reportId: string, title: string, description: string) {
    const deepLink = deepLinkUtils.reportLink(reportId);
    const message = `${title}\n${description}\n\nPartagé depuis Denonce\n${deepLink}`;

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(message, {
        dialogTitle: `Partager: ${title}`,
      });
    }
  }

  // Partager un stream en direct
  static async shareLiveStream(streamId: string, title: string) {
    const deepLink = deepLinkUtils.liveLink(streamId);
    const message = `En direct: ${title}\n${deepLink}\n\nRegardez ce live sur Denonce!`;

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(message, {
        dialogTitle: `Partager le live: ${title}`,
      });
    }
  }

  // Partager un profil utilisateur
  static async shareUserProfile(userId: string, username: string) {
    const deepLink = deepLinkUtils.userLink(userId);
    const message = `Profil de ${username}\n${deepLink}`;

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(message, {
        dialogTitle: `Partager le profil de ${username}`,
      });
    }
  }

  // Générer un code QR pour un lien
  static async generateQRCode(url: string): Promise<string> {
    try {
      const qrCode = await QRCode.toDataURL(url, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      return qrCode;
    } catch (error) {
      console.error('Erreur lors de la génération du code QR:', error);
      throw error;
    }
  }

  // Partage avancé avec options
  static async shareWithOptions(options: ShareOptions) {
    const url = options.url || (
      options.reportId ? deepLinkUtils.reportLink(options.reportId) :
      options.streamId ? deepLinkUtils.liveLink(options.streamId) :
      options.userId ? deepLinkUtils.userLink(options.userId) :
      ''
    );

    if (!url) throw new Error('URL de partage non disponible');

    const message = `${options.title}\n${options.message}\n\n${url}`;

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(message, {
        dialogTitle: options.title,
      });
    }

    // Générer un code QR si demandé
    if (options.includeQR) {
      try {
        const qrCode = await this.generateQRCode(url);
        return { shared: true, qrCode };
      } catch (error) {
        console.warn('Code QR non généré:', error);
        return { shared: true, qrCode: null };
      }
    }

    return { shared: true, qrCode: null };
  }

  // Copier le lien dans le presse-papiers
  static async copyToClipboard(text: string) {
    // Note: Vous devez ajouter `expo-clipboard` au projet
    // npm install expo-clipboard
    // import * as Clipboard from 'expo-clipboard';
    // await Clipboard.setStringAsync(text);
  }
}

export default SharingService;
