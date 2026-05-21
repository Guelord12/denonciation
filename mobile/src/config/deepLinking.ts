// Configuration du deep linking pour Denonce
export const deepLinkingConfig = {
  prefixes: ['denonce://', 'https://denonce.app/', 'https://www.denonce.app/'],
  config: {
    screens: {
      // Navigation vers des rapports spécifiques
      ReportDetail: 'report/:id',
      // Navigation vers des streams en direct
      LiveStreamScreen: 'live/:streamId',
      // Navigation vers le chat
      ChatScreen: 'chat/:chatId',
      // Navigation vers le profil utilisateur
      UserProfile: 'user/:userId',
      // Navigation vers les signalements d'une catégorie
      ReportsByCategory: 'category/:categoryId',
      // Navigation vers les actualités
      ActualitesScreen: 'news/:newsId',
      // Navigation vers la notification
      NotificationDetail: 'notification/:notificationId',
      // Page de partage/signalement
      CreateReportScreen: 'create-report',
      // Navigation par défaut
      HomeScreen: '',
    },
  },
};

// Utilitaires pour générer des deep links
export const deepLinkUtils = {
  // Générer un lien vers un rapport
  reportLink: (reportId: string) => `denonce://report/${reportId}`,

  // Générer un lien vers un stream en direct
  liveLink: (streamId: string) => `denonce://live/${streamId}`,

  // Générer un lien vers un profil utilisateur
  userLink: (userId: string) => `denonce://user/${userId}`,

  // Générer un lien vers une catégorie
  categoryLink: (categoryId: string) => `denonce://category/${categoryId}`,

  // Générer un lien vers les actualités
  newsLink: (newsId: string) => `denonce://news/${newsId}`,

  // Générer une URL web si l'app n'est pas installée
  webUrl: (path: string) => `https://denonce.app/${path}`,

  // Parser un deep link
  parseLink: (link: string) => {
    const match = link.match(/denonce:\/\/([^/]+)\/(.+)/);
    if (match) {
      return { type: match[1], id: match[2] };
    }
    return null;
  },
};

export default deepLinkingConfig;
