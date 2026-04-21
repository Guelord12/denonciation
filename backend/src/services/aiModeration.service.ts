import { query } from '../database/connection';
import { logger } from '../utils/logger';
import axios from 'axios';
import sharp from 'sharp';
import { createHash } from 'crypto';
import { redisClient } from '../config/redis';
import { getGeocodingService } from './geocoding.service';

// =====================================================
// TYPES ET INTERFACES
// =====================================================

interface ModerationResult {
  approved: boolean;
  confidence: number;
  score: number;
  reasons: string[];
  flags: string[];
  requiresManualReview: boolean;
  suggestedCategory?: string;
}

interface ChatModerationResult {
  isClean: boolean;
  filteredMessage: string;
  violations: string[];
  severity: number;
  toxicity: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface ImageModerationResult {
  isSafe: boolean;
  violationType?: string;
  confidence: number;
  labels: string[];
  action: 'allow' | 'warn' | 'block';
  nsfw: {
    drawing: number;
    hentai: number;
    neutral: number;
    porn: number;
    sexy: number;
  };
}

interface VideoModerationResult {
  isSafe: boolean;
  violations: Array<{
    timestamp: number;
    type: string;
    confidence: number;
  }>;
  action: 'allow' | 'warn' | 'block';
}

// =====================================================
// CONFIGURATION ET CONSTANTES
// =====================================================

// Mots-clés et patterns pour la détection
const FORBIDDEN_PATTERNS: Record<string, string[]> = {
  hateSpeech: [
    'raciste', 'racisme', 'xénophobe', 'antisémite', 'négrophobe',
    'suprémaciste', 'génocide', 'ethnique', 'tribal', 'tribalisme',
    'haine', 'haïr', 'déteste', 'inférieur', 'inférieure',
    'aryen', 'kike', 'nègre', 'bamboula', 'chinetoque',
    'bougnoul', 'crouille', 'rital', 'boche', 'métèque',
  ],
  violence: [
    'tuer', 'massacrer', 'violenter', 'frapper', 'tabasser',
    'lyncher', 'brûler vif', 'égorger', 'assassiner', 'exterminer',
    'terroriser', 'menacer de mort', 'violence extrême',
    'décapiter', 'pendre', 'éventrer', 'démembrer', 'torturer',
  ],
  harassment: [
    'harceler', 'intimider', 'menacer', 'stalker', 'traquer',
    'humilier', 'insulter', 'grossier', 'vulgaire', 'obscène',
    'connard', 'salope', 'pute', 'enculé', 'batard',
    'fils de pute', 'ta gueule', 'ferme ta gueule',
  ],
  fakeNews: [
    'faux', 'mensonge', 'complot', 'conspiration', 'fake',
    'truqué', 'manipulation', 'désinformation', 'propagande',
    'hoax', 'rumeur', 'infox', 'intox',
  ],
  personalInfo: [
    'adresse', 'téléphone', 'email', 'numéro de', 'habite à',
    'domicile', 'résidence', 'passeport', 'carte d\'identité',
    'numéro de sécurité sociale', 'iban', 'rib', 'carte bancaire',
  ],
  sexualContent: [
    'sexe', 'porno', 'sexuel', 'érotique', 'obscène',
    'nudité', 'dénudé', 'exhibition', 'masturbation',
    'fellation', 'coït', 'baise', 'baiser', 'coucher',
  ],
  drugsAndAlcohol: [
    'drogue', 'cocaïne', 'héroïne', 'cannabis', 'alcool',
    'ivre', 'saoul', 'défoncé', 'shoot', 'sniffer',
    'ecstasy', 'mdma', 'lsd', 'champignon',
  ],
  weaponsAndDanger: [
    'arme', 'pistolet', 'fusil', 'couteau', 'bombe',
    'explosif', 'dynamite', 'grenade', 'mitraillette',
  ],
};

// Mots-clés positifs (signalements légitimes)
const LEGITIMATE_PATTERNS: Record<string, string[]> = {
  corruption: [
    'corruption', 'pot-de-vin', 'détournement', 'malversation',
    'fraude', 'enrichissement', 'illégal', 'marché public',
    'attribution', 'faveur', 'commission', 'bakchich',
    'concussion', 'prévarication', 'trafic d\'influence',
    'blanchiment', 'évasion fiscale', 'paradis fiscal',
  ],
  policeViolence: [
    'police', 'policier', 'brutalité', 'bavure', 'arrestation',
    'arbitraire', 'détention', 'garde à vue', 'menottes',
    'matraque', 'gaz lacrymogène', 'répression',
    'flashball', 'tasers', 'interpellation', 'violences policières',
  ],
  discrimination: [
    'discrimination', 'inégalité', 'exclusion', 'marginalisé',
    'refus d\'accès', 'traitement différencié', 'préjugé',
    'sexisme', 'homophobie', 'transphobie', 'validisme',
    'âgisme', 'grossophobie', 'xénophobie',
  ],
  environment: [
    'environnement', 'pollution', 'déforestation', 'rivière',
    'forêt', 'protégé', 'espèce', 'déchet', 'toxique',
    'climat', 'réchauffement', 'biodiversité', 'écosystème',
    'marée noire', 'décharge sauvage', 'braconnage',
  ],
  humanRights: [
    'droit', 'liberté', 'expression', 'manifestation', 'pacifique',
    'syndicat', 'grève', 'revendication', 'opposition',
    'démocratie', 'justice', 'égalité', 'fraternité',
    'droits humains', 'liberté de presse', 'censure',
  ],
  abuseOfPower: [
    'abus de pouvoir', 'autorité', 'dictateur', 'tyran',
    'oppression', 'répression', 'totalitaire', 'autocrate',
    'oligarchie', 'népotisme', 'clientélisme', 'copinage',
  ],
  fraudAndScam: [
    'arnaque', 'escroquerie', 'pyramide', 'ponzi',
    'phishing', 'hameçonnage', 'usurpation', 'faux profil',
    'vol d\'identité', 'fraude bancaire', 'abus de confiance',
  ],
};

// Poids des catégories pour le scoring
const CATEGORY_WEIGHTS: Record<string, number> = {
  corruption: 15,
  policeViolence: 15,
  discrimination: 12,
  environment: 10,
  humanRights: 12,
  abuseOfPower: 13,
  fraudAndScam: 10,
  hateSpeech: -20,
  violence: -25,
  harassment: -20,
  fakeNews: -15,
  personalInfo: -30,
  sexualContent: -35,
  drugsAndAlcohol: -20,
  weaponsAndDanger: -25,
};

// Configuration des APIs externes
const API_CONFIG = {
  sightengine: {
    apiUser: process.env.SIGHTENGINE_API_USER || '',
    apiSecret: process.env.SIGHTENGINE_API_SECRET || '',
    url: 'https://api.sightengine.com/1.0/check.json',
  },
  googleVision: {
    apiKey: process.env.GOOGLE_VISION_API_KEY || '',
    url: 'https://vision.googleapis.com/v1/images:annotate',
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || '',
    sentimentModel: 'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
    toxicityModel: 'https://api-inference.huggingface.co/models/unitary/toxic-bert',
    nsfwModel: 'https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    url: 'https://api.openai.com/v1/moderations',
  },
};

// =====================================================
// CLASSE PRINCIPALE DE MODÉRATION
// =====================================================

export class ModerationService {
  private bannedWordsCache: Map<string, { severity: number; replacement?: string; category: string }> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private userMessageHistory: Map<number, Array<{ timestamp: number; message: string }>> = new Map();
  private readonly SPAM_WINDOW = 10000; // 10 secondes
  private readonly SPAM_MAX_MESSAGES = 5;

  constructor() {
    this.loadBannedWords();
  }

  // =====================================================
  // INITIALISATION ET GESTION DU CACHE
  // =====================================================

  /**
   * Charge les mots interdits depuis la base de données
   */
  private async loadBannedWords(): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastCacheUpdate < this.CACHE_TTL) {
        return;
      }

      const result = await query(`
        SELECT word, severity, replacement, category 
        FROM banned_words 
        WHERE is_regex = false
      `);

      this.bannedWordsCache.clear();
      result.rows.forEach((row: any) => {
        this.bannedWordsCache.set(row.word.toLowerCase(), {
          severity: row.severity,
          replacement: row.replacement,
          category: row.category || 'general',
        });
      });

      this.lastCacheUpdate = now;
      logger.info(`✅ Loaded ${this.bannedWordsCache.size} banned words from database`);
    } catch (error) {
      logger.error('❌ Error loading banned words:', error);
    }
  }

  /**
   * Ajoute un mot interdit dynamiquement
   */
  public async addBannedWord(
    word: string,
    severity: number,
    category: string,
    replacement?: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO banned_words (word, severity, replacement, category)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (word) DO UPDATE 
         SET severity = EXCLUDED.severity, 
             replacement = EXCLUDED.replacement,
             category = EXCLUDED.category`,
        [word.toLowerCase(), severity, replacement, category]
      );

      this.bannedWordsCache.set(word.toLowerCase(), {
        severity,
        replacement,
        category,
      });

      logger.info(`✅ Added banned word: ${word}`);
    } catch (error) {
      logger.error('❌ Error adding banned word:', error);
    }
  }

  // =====================================================
  // MODÉRATION DE SIGNALEMENTS
  // =====================================================

  /**
   * Modère un signalement (fonction principale améliorée)
   */
  public async moderateReport(reportId: number): Promise<ModerationResult> {
    try {
      // Récupérer le signalement avec plus de détails - SANS trust_score
      const reportResult = await query(
        `SELECT r.*, 
                c.name as category_name,
                u.username,
                (SELECT COUNT(*) FROM reports WHERE reporter_id = r.reporter_id) as user_report_count,
                (SELECT COUNT(*) FROM reports WHERE reporter_id = r.reporter_id AND status = 'approved') as user_approved_count
         FROM reports r 
         LEFT JOIN categories c ON r.category_id = c.id 
         LEFT JOIN users u ON r.reporter_id = u.id
         WHERE r.id = $1`,
        [reportId]
      );

      if (reportResult.rows.length === 0) {
        throw new Error('Report not found');
      }

      const report = reportResult.rows[0];
      const content = `${report.title} ${report.description}`.toLowerCase();

      const result: ModerationResult = {
        approved: false,
        confidence: 0,
        score: 0,
        reasons: [],
        flags: [],
        requiresManualReview: false,
      };

      // 1. Détection des patterns interdits
      await this.detectForbiddenPatterns(content, result);

      // 2. Détection des patterns légitimes
      const { maxScore, suggestedCategory } = await this.detectLegitimatePatterns(content);
      result.score += maxScore;
      result.suggestedCategory = suggestedCategory || report.category_name;

      // 3. Analyse de la qualité du contenu
      await this.analyzeContentQuality(report, result);

      // 4. Analyse des médias (images/vidéos)
      if (report.media_path) {
        await this.analyzeMediaContent(report, result);
      }

      // 5. Vérification de l'historique utilisateur
      await this.analyzeUserHistory(report, result);

      // 6. Détection de spam et doublons
      await this.detectSpamAndDuplicates(report, result);

      // 7. Analyse sémantique avec IA (OpenAI)
      if (content.length > 20) {
        await this.analyzeWithAI(content, result);
      }

      // 8. Détection de localisation
      await this.analyzeLocation(report, result);

      // 9. Vérification des preuves
      await this.analyzeEvidence(report, result);

      // 10. Décision finale avec apprentissage automatique
      await this.makeDecision(result, report);

      // 11. Mise à jour du statut
      await this.updateReportStatus(reportId, result);

      // 12. Logger la décision
      logger.info(
        `[AI Moderation] Report ${reportId}: score=${result.score}, ` +
        `approved=${result.approved}, confidence=${result.confidence}%, ` +
        `flags=[${result.flags.join(', ')}]`
      );

      // 13. Notifier l'utilisateur
      await this.notifyUser(report, result);

      return result;

    } catch (error) {
      logger.error('❌ AI Moderation error:', error);
      return {
        approved: false,
        confidence: 0,
        score: 0,
        reasons: ['Erreur lors de l\'analyse'],
        flags: ['error'],
        requiresManualReview: true,
      };
    }
  }

  /**
   * Détecte les patterns interdits dans le contenu
   */
  private async detectForbiddenPatterns(content: string, result: ModerationResult): Promise<void> {
    for (const [category, patterns] of Object.entries(FORBIDDEN_PATTERNS)) {
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          result.flags.push(`${category}:${pattern}`);
          result.score += CATEGORY_WEIGHTS[category] || -10;
          result.reasons.push(`Contient du contenu inapproprié: ${category}`);
        }
      }
    }

    // Détection d'expressions régulières pour emails et téléphones
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+?\d{1,3}[- ]?)?\d{9,15}/g;
    const creditCardRegex = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;

    if (emailRegex.test(content) || phoneRegex.test(content) || creditCardRegex.test(content)) {
      result.flags.push('personalInfo:detected');
      result.score -= 30;
      result.reasons.push('Contient des informations personnelles');
    }
  }

  /**
   * Détecte les patterns légitimes
   */
  private async detectLegitimatePatterns(content: string): Promise<{ maxScore: number; suggestedCategory: string }> {
    let maxScore = 0;
    let suggestedCategory = '';

    for (const [category, patterns] of Object.entries(LEGITIMATE_PATTERNS)) {
      let categoryScore = 0;
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          categoryScore += CATEGORY_WEIGHTS[category] || 5;
        }
      }
      if (categoryScore > maxScore) {
        maxScore = categoryScore;
        suggestedCategory = category;
      }
    }

    return { maxScore, suggestedCategory };
  }

  /**
   * Analyse la qualité du contenu
   */
  private async analyzeContentQuality(report: any, result: ModerationResult): Promise<void> {
    // Longueur du titre
    if (report.title.length < 10) {
      result.score -= 5;
      result.reasons.push('Titre trop court (moins de 10 caractères)');
    } else if (report.title.length > 100) {
      result.score += 3;
      result.reasons.push('Titre détaillé');
    }

    // Longueur de la description
    if (!report.description) {
      result.score -= 10;
      result.reasons.push('Description manquante');
    } else if (report.description.length < 50) {
      result.score -= 5;
      result.reasons.push('Description trop courte (moins de 50 caractères)');
    } else if (report.description.length > 500) {
      result.score += 8;
      result.reasons.push('Description très détaillée');
    } else if (report.description.length > 200) {
      result.score += 5;
      result.reasons.push('Description détaillée');
    }

    // Analyse de la grammaire et orthographe basique
    const words = report.description?.split(/\s+/) || [];
    const uniqueWords = new Set(words.map((w: string) => w.toLowerCase()));
    const vocabularyRichness = uniqueWords.size / words.length;
    
    if (vocabularyRichness > 0.7) {
      result.score += 3;
      result.reasons.push('Vocabulaire riche et varié');
    }
  }

  /**
   * Analyse les médias (images/vidéos)
   */
  private async analyzeMediaContent(report: any, result: ModerationResult): Promise<void> {
    result.score += 15;
    result.reasons.push('Preuve média fournie');

    // Vérifier le type de média
    const mediaPath = report.media_path;
    const isVideo = mediaPath && mediaPath.match(/\.(mp4|mov|avi|webm|mkv)$/i);
    const isImage = mediaPath && mediaPath.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    if (isVideo) {
      result.score += 5;
      result.reasons.push('Preuve vidéo (plus fiable)');
      
      // Analyser la vidéo si possible
      try {
        const videoAnalysis = await this.analyzeVideo(mediaPath);
        if (!videoAnalysis.isSafe) {
          result.score -= 20;
          result.flags.push('inappropriate_video_content');
          result.reasons.push('Contenu vidéo inapproprié détecté');
        }
      } catch (error) {
        logger.warn('Could not analyze video:', error);
      }
    } else if (isImage) {
      // Analyser l'image
      try {
        const imageAnalysis = await this.analyzeImage(mediaPath);
        if (!imageAnalysis.isSafe) {
          result.score -= 15;
          result.flags.push('inappropriate_image_content');
          result.reasons.push(`Contenu image inapproprié: ${imageAnalysis.violationType}`);
        }
      } catch (error) {
        logger.warn('Could not analyze image:', error);
      }
    }
  }

  /**
   * Analyse l'historique utilisateur
   */
  private async analyzeUserHistory(report: any, result: ModerationResult): Promise<void> {
    // Utiliser reporter_id, SANS trust_score
    const userStats = await query(
      `SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reports,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_reports,
        AVG(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approval_rate
       FROM reports WHERE reporter_id = $1`,
      [report.reporter_id]
    );

    const stats = userStats.rows[0];
    const approvalRate = stats.total_reports > 0
      ? (stats.approved_reports / stats.total_reports) * 15
      : 0;

    result.score += approvalRate;

    if (stats.rejected_reports > 5) {
      result.score -= 20;
      result.flags.push('user_has_many_rejections');
      result.reasons.push('Utilisateur avec historique de signalements rejetés');
    } else if (stats.rejected_reports > 2) {
      result.score -= 10;
      result.flags.push('user_has_some_rejections');
    }

    if (stats.approved_reports > 10) {
      result.score += 15;
      result.reasons.push('Utilisateur très fiable (10+ signalements approuvés)');
      result.flags.push('trusted_user');
    } else if (stats.approved_reports > 5) {
      result.score += 8;
      result.reasons.push('Utilisateur fiable (5+ signalements approuvés)');
    }

    // Calculer le trust score à partir de l'historique
    const calculatedTrustScore = stats.total_reports > 0 
      ? Math.min(100, Math.round((stats.approved_reports / stats.total_reports) * 100))
      : 50;
    
    result.score += calculatedTrustScore / 20; // Max 5 points

    // Vérifier l'âge du compte
    const accountAge = await query(
      `SELECT created_at FROM users WHERE id = $1`,
      [report.reporter_id]
    );

    if (accountAge.rows.length > 0) {
      const ageInDays = Math.floor((Date.now() - new Date(accountAge.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24));
      
      if (ageInDays < 1) {
        result.score -= 10;
        result.flags.push('new_account');
        result.reasons.push('Compte créé il y a moins de 24h');
      } else if (ageInDays < 7) {
        result.score -= 5;
        result.flags.push('recent_account');
      } else if (ageInDays > 365) {
        result.score += 5;
        result.reasons.push('Compte ancien (> 1 an)');
      }
    }
  }

  /**
   * Détecte le spam et les doublons
   */
  private async detectSpamAndDuplicates(report: any, result: ModerationResult): Promise<void> {
    // Vérifier les signalements récents du même utilisateur
    const recentReports = await query(
      `SELECT COUNT(*) as count FROM reports 
       WHERE reporter_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [report.reporter_id]
    );

    const recentCount = parseInt(recentReports.rows[0].count);
    if (recentCount > 5) {
      result.score -= 30;
      result.flags.push('excessive_spam');
      result.reasons.push('Trop de signalements en 1 heure (> 5)');
    } else if (recentCount > 3) {
      result.score -= 15;
      result.flags.push('spam_detected');
      result.reasons.push('Plusieurs signalements en peu de temps');
    }

    // Vérifier les doublons de contenu
    const similarReports = await query(
      `SELECT COUNT(*) as count FROM reports 
       WHERE reporter_id = $1 AND (
         title ILIKE $2 OR 
         description ILIKE $3
       ) AND created_at > NOW() - INTERVAL '24 hours'`,
      [
        report.reporter_id,
        `%${report.title.substring(0, 30)}%`,
        `%${report.description?.substring(0, 30)}%`
      ]
    );

    if (parseInt(similarReports.rows[0].count) > 1) {
      result.score -= 20;
      result.flags.push('duplicate_content');
      result.reasons.push('Contenu similaire déjà signalé récemment');
    }

    // Vérifier les signalements globaux similaires
    const globalSimilarReports = await query(
      `SELECT COUNT(*) as count FROM reports 
       WHERE title ILIKE $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [`%${report.title.substring(0, 20)}%`]
    );

    if (parseInt(globalSimilarReports.rows[0].count) > 10) {
      result.score += 10;
      result.flags.push('trending_issue');
      result.reasons.push('Sujet tendance (plusieurs signalements similaires)');
    }
  }

  /**
   * Analyse avec IA (OpenAI)
   */
  private async analyzeWithAI(content: string, result: ModerationResult): Promise<void> {
    if (!API_CONFIG.openai.apiKey) return;

    try {
      const response = await axios.post(
        API_CONFIG.openai.url,
        { input: content },
        {
          headers: {
            'Authorization': `Bearer ${API_CONFIG.openai.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const moderation = response.data.results[0];
      
      if (moderation.flagged) {
        result.score -= 15;
        result.flags.push('openai_flagged');
        result.reasons.push('Contenu signalé par l\'IA OpenAI');
        
        // Analyser les catégories spécifiques
        const categories = moderation.categories;
        for (const [category, flagged] of Object.entries(categories)) {
          if (flagged) {
            result.flags.push(`openai_${category}`);
          }
        }
      }
    } catch (error) {
      logger.warn('OpenAI moderation failed:', error);
    }
  }

  /**
   * Analyse la localisation avec géocodage inverse
   */
  private async analyzeLocation(report: any, result: ModerationResult): Promise<void> {
    if (report.latitude && report.longitude) {
      // ✅ CORRECTION : Convertir les coordonnées en nombres flottants
      const lat = typeof report.latitude === 'string' 
        ? parseFloat(report.latitude) 
        : report.latitude;
      const lng = typeof report.longitude === 'string' 
        ? parseFloat(report.longitude) 
        : report.longitude;

      // Vérifier que les coordonnées sont valides
      if (isNaN(lat) || isNaN(lng)) {
        result.score -= 5;
        result.flags.push('invalid_coordinates');
        result.reasons.push('Coordonnées GPS invalides');
        return;
      }

      // Vérifier que les coordonnées sont dans les plages valides
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        result.score -= 10;
        result.flags.push('out_of_bounds_coordinates');
        result.reasons.push('Coordonnées GPS hors limites');
        return;
      }

      result.score += 8;
      result.reasons.push('Localisation précise fournie');

      try {
        const geocodingService = getGeocodingService();
        const content = `${report.title} ${report.description || ''}`;
        
        const validationResult = await geocodingService.validateLocationWithContent(
          lat,
          lng,
          content
        );

        if (validationResult.location) {
          const loc = validationResult.location;
          result.reasons.push(`Lieu détecté: ${loc.displayName}`);
          
          // Ajouter des points selon la précision
          if (loc.city) {
            result.score += 2;
            result.reasons.push(`Ville identifiée: ${loc.city}`);
          }
          
          if (loc.country) {
            result.score += 1;
            result.reasons.push(`Pays identifié: ${loc.country}`);
          }

          // Vérifier la cohérence avec le contenu
          if (validationResult.isValid) {
            result.score += 5;
            result.reasons.push('Localisation cohérente avec le contenu');
          } else {
            result.score -= 10;
            result.flags.push('inconsistent_location');
            result.reasons.push(`Localisation incohérente: ${validationResult.issues.join(', ')}`);
            
            if (validationResult.suggestedLocation) {
              result.reasons.push(`Ville suggérée: ${validationResult.suggestedLocation.displayName}`);
            }
          }

          // Vérifications supplémentaires
          if (validationResult.issues.includes('Les coordonnées pointent vers l\'océan')) {
            result.score -= 20;
            result.flags.push('ocean_location');
            result.reasons.push('Coordonnées dans l\'océan - signalement suspect');
          }

          if (validationResult.issues.includes('Les coordonnées pointent vers une zone très isolée')) {
            result.flags.push('remote_location');
            result.reasons.push('Zone très isolée - vérifier la véracité');
          }
        } else {
          result.score -= 5;
          result.flags.push('unable_to_geocode');
          result.reasons.push('Impossible de géocoder la localisation');
        }

      } catch (error) {
        logger.warn('Geocoding validation failed:', error);
        result.flags.push('geocoding_error');
        result.reasons.push('Erreur lors de la validation de la localisation');
      }
    } else {
      // Pas de localisation fournie
      result.score -= 5;
      result.reasons.push('Aucune localisation fournie');
    }
  }

  /**
   * Analyse les preuves
   */
  private async analyzeEvidence(report: any, result: ModerationResult): Promise<void> {
    let evidenceScore = 0;

    // Preuves multiples
    if (report.evidence_urls && Array.isArray(report.evidence_urls)) {
      evidenceScore += report.evidence_urls.length * 3;
      result.reasons.push(`${report.evidence_urls.length} preuves supplémentaires fournies`);
    }

    // Témoins
    if (report.witnesses && report.witnesses > 0) {
      evidenceScore += Math.min(report.witnesses, 5) * 2;
      result.reasons.push(`${report.witnesses} témoin(s) mentionné(s)`);
    }

    // Documents officiels
    if (report.has_official_documents) {
      evidenceScore += 10;
      result.reasons.push('Documents officiels fournis');
    }

    result.score += evidenceScore;
  }

  /**
   * Prend la décision finale
   */
  private async makeDecision(result: ModerationResult, report: any): Promise<void> {
    // Vérifier les flags critiques
    const criticalFlags = ['personalInfo:detected', 'excessive_spam', 'inappropriate_video_content', 'ocean_location'];
    const hasCriticalFlag = result.flags.some(flag => 
      criticalFlags.some(critical => flag.includes(critical))
    );

    if (hasCriticalFlag) {
      result.approved = false;
      result.confidence = 95;
      result.reasons.push('Contient des violations critiques');
    } else if (result.score >= 25) {
      result.approved = true;
      result.confidence = Math.min(70 + result.score, 98);
      result.reasons.push('Contenu légitime et bien documenté');
    } else if (result.score >= 15) {
      result.approved = true;
      result.confidence = Math.min(60 + result.score, 90);
      result.reasons.push('Contenu probablement légitime');
    } else if (result.score <= -15) {
      result.approved = false;
      result.confidence = Math.min(70 + Math.abs(result.score), 95);
      result.reasons.push('Contenu inapproprié ou non conforme');
    } else if (result.score <= -5) {
      result.requiresManualReview = true;
      result.confidence = 45;
      result.reasons.push('Score négatif, nécessite une revue');
    } else {
      result.requiresManualReview = true;
      result.confidence = 50;
      result.reasons.push('Score neutre, nécessite une revue humaine');
    }

    // Ajuster en fonction du trust score calculé
    const calculatedTrustScore = report.user_approved_count && report.user_report_count
      ? Math.min(100, Math.round((report.user_approved_count / report.user_report_count) * 100))
      : 50;
    
    if (calculatedTrustScore > 80 && !hasCriticalFlag) {
      result.confidence = Math.min(result.confidence + 10, 99);
    }
  }

  /**
   * Met à jour le statut du signalement
   */
  private async updateReportStatus(reportId: number, result: ModerationResult): Promise<void> {
    if (!result.requiresManualReview) {
      const newStatus = result.approved ? 'approved' : 'rejected';
      
      await query(
        `UPDATE reports 
         SET status = $1, 
             updated_at = NOW(),
             moderation_score = $2,
             moderation_flags = $3,
             auto_moderated = true
         WHERE id = $4`,
        [newStatus, result.score, JSON.stringify(result.flags), reportId]
      );

      // Logger l'activité
      await query(
        `INSERT INTO activity_logs (action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['AI_AUTO_MODERATION', 'report', reportId, JSON.stringify(result)]
      );
    } else {
      // Marquer pour revue manuelle
      await query(
        `UPDATE reports 
         SET status = 'pending_review',
             moderation_score = $1,
             moderation_flags = $2
         WHERE id = $3`,
        [result.score, JSON.stringify(result.flags), reportId]
      );
    }
  }

  /**
   * Notifie l'utilisateur du résultat
   */
  private async notifyUser(report: any, result: ModerationResult): Promise<void> {
    if (result.requiresManualReview) return;

    const status = result.approved ? 'approuvé' : 'rejeté';
    const message = result.approved
      ? `Votre signalement "${report.title}" a été approuvé automatiquement après analyse. Merci pour votre contribution !`
      : `Votre signalement "${report.title}" n'a pas pu être validé automatiquement. Raisons: ${result.reasons.join(', ')}`;

    await query(
      `INSERT INTO notifications (user_id, type, content, related_id, priority)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        report.reporter_id,
        result.approved ? 'report_approved' : 'report_rejected',
        message,
        report.id,
        result.approved ? 'normal' : 'low'
      ]
    );
  }

  // =====================================================
  // MODÉRATION DE CHAT EN DIRECT
  // =====================================================

  /**
   * Modère un message de chat en temps réel
   */
  public async moderateChatMessage(
    message: string,
    userId: number,
    streamId: number
  ): Promise<ChatModerationResult> {
    const violations: string[] = [];
    let filteredMessage = message;
    let maxSeverity = 0;
    let toxicity = 0;
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';

    try {
      // 1. Vérification anti-spam
      const spamCheck = await this.checkSpam(userId, message);
      if (spamCheck.isSpam) {
        violations.push('Spam detected');
        maxSeverity = Math.max(maxSeverity, 3);
      }

      // 2. Vérification des mots interdits
      const words = message.toLowerCase().split(/\s+/);
      
      for (const word of words) {
        const bannedWord = this.bannedWordsCache.get(word);
        if (bannedWord) {
          violations.push(`Banned word: ${word} (${bannedWord.category})`);
          maxSeverity = Math.max(maxSeverity, bannedWord.severity);
          
          if (bannedWord.replacement) {
            filteredMessage = filteredMessage.replace(
              new RegExp(word, 'gi'),
              bannedWord.replacement
            );
          } else {
            filteredMessage = filteredMessage.replace(
              new RegExp(word, 'gi'),
              '***'
            );
          }
        }
      }

      // 3. Détection de liens malveillants
      if (this.detectMaliciousLinks(message)) {
        violations.push('Malicious link detected');
        maxSeverity = Math.max(maxSeverity, 5);
        filteredMessage = '[Message bloqué: lien non autorisé]';
      }

      // 4. Détection de CAPS LOCK excessif
      const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
      if (message.length > 20 && capsRatio > 0.7) {
        violations.push('Excessive CAPS LOCK');
        maxSeverity = Math.max(maxSeverity, 2);
        filteredMessage = filteredMessage.toLowerCase();
      }

      // 5. Détection d'emoji excessif
      const emojiCount = (message.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
      if (emojiCount > 10) {
        violations.push('Excessive emojis');
        maxSeverity = Math.max(maxSeverity, 1);
      }

      // 6. Analyse de toxicité avec IA
      if (API_CONFIG.huggingface.apiKey) {
        const toxicityResult = await this.analyzeToxicity(message);
        toxicity = toxicityResult.toxicity;
        
        if (toxicity > 0.8) {
          violations.push(`High toxicity (${(toxicity * 100).toFixed(0)}%)`);
          maxSeverity = Math.max(maxSeverity, 4);
        } else if (toxicity > 0.5) {
          violations.push(`Moderate toxicity (${(toxicity * 100).toFixed(0)}%)`);
          maxSeverity = Math.max(maxSeverity, 2);
        }

        const sentimentResult = await this.analyzeSentiment(message);
        sentiment = sentimentResult.sentiment;
      }

      // 7. Enregistrer dans l'historique utilisateur
      this.updateUserMessageHistory(userId, message);

      // 8. Logger si nécessaire
      if (maxSeverity >= 3) {
        await this.logChatViolation(userId, streamId, message, violations, maxSeverity);
      }

      return {
        isClean: violations.length === 0,
        filteredMessage,
        violations,
        severity: maxSeverity,
        toxicity,
        sentiment,
      };

    } catch (error) {
      logger.error('Chat moderation error:', error);
      return {
        isClean: true,
        filteredMessage: message,
        violations: [],
        severity: 0,
        toxicity: 0,
        sentiment: 'neutral',
      };
    }
  }

  /**
   * Vérifie le spam pour un utilisateur
   */
  private async checkSpam(userId: number, message: string): Promise<{ isSpam: boolean; reason?: string }> {
    const history = this.userMessageHistory.get(userId) || [];
    const now = Date.now();

    // Nettoyer l'historique ancien
    const recentHistory = history.filter(h => now - h.timestamp < this.SPAM_WINDOW);
    this.userMessageHistory.set(userId, recentHistory);

    // Vérifier le nombre de messages
    if (recentHistory.length >= this.SPAM_MAX_MESSAGES) {
      return { isSpam: true, reason: 'Too many messages' };
    }

    // Vérifier les messages identiques
    const identicalMessages = recentHistory.filter(h => h.message === message);
    if (identicalMessages.length >= 3) {
      return { isSpam: true, reason: 'Repeated identical messages' };
    }

    return { isSpam: false };
  }

  /**
   * Met à jour l'historique des messages utilisateur
   */
  private updateUserMessageHistory(userId: number, message: string): void {
    const history = this.userMessageHistory.get(userId) || [];
    history.push({ timestamp: Date.now(), message });
    this.userMessageHistory.set(userId, history);
  }

  /**
   * Détecte les liens malveillants
   */
  private detectMaliciousLinks(message: string): boolean {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlPattern) || [];

    const suspiciousDomains = [
      'bit.ly', 'tinyurl', 'short.link', 'rebrand.ly',
      'discord.gg', 'telegram.me', 'whatsapp.com',
      'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
      'adf.ly', 'shorte.st', 'bc.vc', 'ouo.io',
    ];

    for (const url of urls) {
      for (const domain of suspiciousDomains) {
        if (url.toLowerCase().includes(domain)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Analyse la toxicité d'un message
   */
  private async analyzeToxicity(text: string): Promise<{ toxicity: number; categories: any }> {
    try {
      const response = await axios.post(
        API_CONFIG.huggingface.toxicityModel,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${API_CONFIG.huggingface.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const results = response.data[0];
      let maxToxicity = 0;
      const categories: any = {};

      results.forEach((result: any) => {
        categories[result.label] = result.score;
        if (result.label === 'toxic' || result.label === 'severe_toxic') {
          maxToxicity = Math.max(maxToxicity, result.score);
        }
      });

      return { toxicity: maxToxicity, categories };
    } catch (error) {
      logger.warn('Toxicity analysis failed:', error);
      return { toxicity: 0, categories: {} };
    }
  }

  /**
   * Analyse le sentiment d'un message
   */
  private async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }> {
    try {
      const response = await axios.post(
        API_CONFIG.huggingface.sentimentModel,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${API_CONFIG.huggingface.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const results = response.data[0];
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      let maxScore = 0;

      results.forEach((result: any) => {
        if (result.score > maxScore) {
          maxScore = result.score;
          sentiment = result.label.toLowerCase();
        }
      });

      return { sentiment, score: maxScore };
    } catch (error) {
      logger.warn('Sentiment analysis failed:', error);
      return { sentiment: 'neutral', score: 0.5 };
    }
  }

  /**
   * Log une violation de chat
   */
  private async logChatViolation(
    userId: number,
    streamId: number,
    message: string,
    violations: string[],
    severity: number
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO moderation_logs 
         (stream_id, user_id, violation_type, severity, description, action_taken)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [streamId, userId, 'chat_violation', 
         severity > 4 ? 'critical' : severity > 2 ? 'high' : 'medium',
         `Message: ${message.substring(0, 100)}... Violations: ${violations.join(', ')}`,
         severity > 4 ? 'temporary_ban' : 'warning']
      );
    } catch (error) {
      logger.error('Error logging chat violation:', error);
    }
  }

  // =====================================================
  // MODÉRATION D'IMAGES
  // =====================================================

  /**
   * Analyse une image pour détection de contenu inapproprié
   */
  public async analyzeImage(imagePathOrBuffer: string | Buffer): Promise<ImageModerationResult> {
    try {
      let imageBuffer: Buffer;

      if (typeof imagePathOrBuffer === 'string') {
        // ✅ CORRECTION : Gérer les URLs Cloudinary correctement
        if (imagePathOrBuffer.startsWith('http://') || imagePathOrBuffer.startsWith('https://')) {
          // Télécharger l'image depuis l'URL
          const response = await axios.get(imagePathOrBuffer, {
            responseType: 'arraybuffer',
            timeout: 10000
          });
          imageBuffer = Buffer.from(response.data);
        } else {
          // Charger l'image depuis le système de fichiers local
          const fs = require('fs');
          // Vérifier que le fichier existe
          if (!fs.existsSync(imagePathOrBuffer)) {
            logger.warn(`Image file not found: ${imagePathOrBuffer}`);
            return {
              isSafe: true,
              confidence: 0,
              labels: ['file_not_found'],
              action: 'allow',
              nsfw: { drawing: 0, hentai: 0, neutral: 1, porn: 0, sexy: 0 },
            };
          }
          imageBuffer = fs.readFileSync(imagePathOrBuffer);
        }
      } else {
        imageBuffer = imagePathOrBuffer;
      }

      // Redimensionner pour l'API
      const resizedImage = await sharp(imageBuffer)
        .resize(800, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Essayer Sightengine d'abord
      if (API_CONFIG.sightengine.apiUser) {
        return await this.analyzeImageWithSightengine(resizedImage);
      }

      // Fallback: HuggingFace NSFW
      if (API_CONFIG.huggingface.apiKey) {
        return await this.analyzeImageWithHuggingFace(resizedImage);
      }

      // Dernier recours: analyse basique
      return await this.basicImageAnalysis(resizedImage);

    } catch (error) {
      logger.error('Image analysis error:', error);
      return {
        isSafe: true,
        confidence: 0,
        labels: ['error'],
        action: 'allow',
        nsfw: { drawing: 0, hentai: 0, neutral: 1, porn: 0, sexy: 0 },
      };
    }
  }

  /**
   * Analyse avec Sightengine
   */
  private async analyzeImageWithSightengine(imageBuffer: Buffer): Promise<ImageModerationResult> {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('media', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });
      formData.append('models', 'nudity-2.1,wad,offensive,scam,gore,face-attributes');
      formData.append('api_user', API_CONFIG.sightengine.apiUser);
      formData.append('api_secret', API_CONFIG.sightengine.apiSecret);

      const response = await axios.post(API_CONFIG.sightengine.url, formData, {
        headers: formData.getHeaders(),
      });

      const data = response.data;
      const violations: string[] = [];
      let violationType: string | undefined;
      let maxConfidence = 0;

      // Nudité
      if (data.nudity) {
        const nsfw = {
          drawing: data.nudity.raw || 0,
          hentai: data.nudity.hentai || 0,
          neutral: data.nudity.safe || 1,
          porn: data.nudity.porn || 0,
          sexy: data.nudity.sexy || 0,
        };

        if (data.nudity.safe < 0.7) {
          violations.push(`Nudity detected (${((1 - data.nudity.safe) * 100).toFixed(0)}%)`);
          maxConfidence = Math.max(maxConfidence, data.nudity.raw || 0);
          violationType = 'nudity';
        }

        if (data.nudity.porn > 0.5) {
          violations.push(`Pornographic content (${(data.nudity.porn * 100).toFixed(0)}%)`);
          maxConfidence = Math.max(maxConfidence, data.nudity.porn);
          violationType = 'pornography';
        }
      }

      // Contenu offensant
      if (data.offensive && data.offensive.prob > 0.7) {
        violations.push(`Offensive content (${(data.offensive.prob * 100).toFixed(0)}%)`);
        maxConfidence = Math.max(maxConfidence, data.offensive.prob);
        violationType = violationType || 'offensive';
      }

      // Violence/Gore
      if (data.gore && data.gore.prob > 0.6) {
        violations.push(`Violence/Gore (${(data.gore.prob * 100).toFixed(0)}%)`);
        maxConfidence = Math.max(maxConfidence, data.gore.prob);
        violationType = violationType || 'violence';
      }

      // Armes
      if (data.weapon && data.weapon.prob > 0.7) {
        violations.push(`Weapon detected (${(data.weapon.prob * 100).toFixed(0)}%)`);
        maxConfidence = Math.max(maxConfidence, data.weapon.prob);
      }

      // Drogues
      if (data.drug && data.drug.prob > 0.6) {
        violations.push(`Drug related content (${(data.drug.prob * 100).toFixed(0)}%)`);
        maxConfidence = Math.max(maxConfidence, data.drug.prob);
      }

      let action: 'allow' | 'warn' | 'block' = 'allow';
      if (maxConfidence > 0.85) {
        action = 'block';
      } else if (maxConfidence > 0.6) {
        action = 'warn';
      }

      return {
        isSafe: violations.length === 0,
        violationType,
        confidence: maxConfidence,
        labels: violations,
        action,
        nsfw: data.nudity ? {
          drawing: data.nudity.raw || 0,
          hentai: data.nudity.hentai || 0,
          neutral: data.nudity.safe || 1,
          porn: data.nudity.porn || 0,
          sexy: data.nudity.sexy || 0,
        } : { drawing: 0, hentai: 0, neutral: 1, porn: 0, sexy: 0 },
      };

    } catch (error) {
      logger.error('Sightengine analysis error:', error);
      throw error;
    }
  }

  /**
   * Analyse avec HuggingFace NSFW
   */
  private async analyzeImageWithHuggingFace(imageBuffer: Buffer): Promise<ImageModerationResult> {
    try {
      const base64Image = imageBuffer.toString('base64');

      const response = await axios.post(
        API_CONFIG.huggingface.nsfwModel,
        { inputs: base64Image },
        {
          headers: {
            'Authorization': `Bearer ${API_CONFIG.huggingface.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      const nsfw = {
        drawing: data.find((d: any) => d.label === 'drawings')?.score || 0,
        hentai: data.find((d: any) => d.label === 'hentai')?.score || 0,
        neutral: data.find((d: any) => d.label === 'neutral')?.score || 1,
        porn: data.find((d: any) => d.label === 'porn')?.score || 0,
        sexy: data.find((d: any) => d.label === 'sexy')?.score || 0,
      };

      const maxNSFW = Math.max(nsfw.drawing, nsfw.hentai, nsfw.porn, nsfw.sexy);
      const violations: string[] = [];

      if (nsfw.porn > 0.6) violations.push('Pornographic content');
      if (nsfw.sexy > 0.7) violations.push('Sexually suggestive content');
      if (nsfw.hentai > 0.6) violations.push('Hentai content');

      let action: 'allow' | 'warn' | 'block' = 'allow';
      if (maxNSFW > 0.8) action = 'block';
      else if (maxNSFW > 0.5) action = 'warn';

      return {
        isSafe: violations.length === 0,
        violationType: violations.length > 0 ? 'nsfw' : undefined,
        confidence: maxNSFW,
        labels: violations,
        action,
        nsfw,
      };

    } catch (error) {
      logger.error('HuggingFace analysis error:', error);
      throw error;
    }
  }

  /**
   * Analyse basique d'image (fallback)
   */
  private async basicImageAnalysis(imageBuffer: Buffer): Promise<ImageModerationResult> {
    try {
      const stats = await sharp(imageBuffer).stats();

      // Analyse simple des couleurs chair
      const skinToneRatio = this.calculateSkinToneRatio(stats);
      const isSuspicious = skinToneRatio > 0.4;

      return {
        isSafe: !isSuspicious,
        violationType: isSuspicious ? 'possible_nudity' : undefined,
        confidence: skinToneRatio,
        labels: isSuspicious ? ['Possible skin tone dominance'] : [],
        action: isSuspicious ? 'warn' : 'allow',
        nsfw: { drawing: 0, hentai: 0, neutral: 1, porn: 0, sexy: 0 },
      };
    } catch (error) {
      return {
        isSafe: true,
        confidence: 0,
        labels: [],
        action: 'allow',
        nsfw: { drawing: 0, hentai: 0, neutral: 1, porn: 0, sexy: 0 },
      };
    }
  }

  private calculateSkinToneRatio(stats: any): number {
    // Implémentation simplifiée
    let skinPixels = 0;
    let totalPixels = 0;

    for (const channel of ['r', 'g', 'b']) {
      const channelStats = stats.channels[channel === 'r' ? 0 : channel === 'g' ? 1 : 2];
      // Plage approximative de couleurs chair
      if (channelStats.mean > 80 && channelStats.mean < 220) {
        skinPixels += channelStats.pixels;
      }
      totalPixels += channelStats.pixels;
    }

    return totalPixels > 0 ? skinPixels / (totalPixels * 3) : 0;
  }

  // =====================================================
  // MODÉRATION DE VIDÉOS
  // =====================================================

  /**
   * Analyse une vidéo pour détection de contenu inapproprié
   */
  public async analyzeVideo(videoPath: string): Promise<VideoModerationResult> {
    try {
      const violations: Array<{ timestamp: number; type: string; confidence: number }> = [];
      
      // Extraire des frames à intervalles réguliers
      const frames = await this.extractVideoFrames(videoPath, 5);
      
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const timestamp = (i / frames.length) * 100; // Pourcentage de la vidéo
        
        const analysis = await this.analyzeImage(frame);
        
        if (!analysis.isSafe) {
          violations.push({
            timestamp,
            type: analysis.violationType || 'unknown',
            confidence: analysis.confidence,
          });
        }
      }

      const isSafe = violations.length < 2;
      let action: 'allow' | 'warn' | 'block' = 'allow';
      
      if (violations.length >= 3) {
        action = 'block';
      } else if (violations.length >= 1) {
        action = 'warn';
      }

      return { isSafe, violations, action };

    } catch (error) {
      logger.error('Video analysis error:', error);
      return { isSafe: true, violations: [], action: 'allow' };
    }
  }

  /**
   * Extrait des frames d'une vidéo
   */
  private async extractVideoFrames(videoPath: string, count: number): Promise<Buffer[]> {
    // À implémenter avec ffmpeg
    // Pour l'instant, retourne un tableau vide
    logger.warn('Video frame extraction not implemented');
    return [];
  }

  // =====================================================
  // FONCTIONS D'APPRENTISSAGE AUTOMATIQUE
  // =====================================================

  /**
   * Apprend d'une modération manuelle
   */
  public async learnFromManualModeration(
    reportId: number,
    manualDecision: 'approved' | 'rejected',
    moderatorId: number,
    notes?: string
  ): Promise<void> {
    try {
      const report = await query('SELECT * FROM reports WHERE id = $1', [reportId]);

      if (report.rows.length === 0) return;

      const content = `${report.rows[0].title} ${report.rows[0].description}`;
      const contentHash = createHash('md5').update(content).digest('hex');

      // Enregistrer pour apprentissage
      await query(
        `INSERT INTO moderation_learning 
         (report_id, content_hash, ai_prediction, manual_decision, moderator_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          reportId,
          contentHash,
          report.rows[0].status,
          manualDecision,
          moderatorId,
          notes
        ]
      );

      // Mettre à jour le rapport
      await query(
        `UPDATE reports 
         SET status = $1, 
             moderated_by = $2,
             moderated_at = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [manualDecision, moderatorId, reportId]
      );

      // Notifier l'utilisateur
      const message = manualDecision === 'approved'
        ? `Votre signalement "${report.rows[0].title}" a été approuvé après revue.`
        : `Votre signalement "${report.rows[0].title}" a été rejeté après revue.`;

      await query(
        `INSERT INTO notifications (user_id, type, content, related_id)
         VALUES ($1, $2, $3, $4)`,
        [report.rows[0].reporter_id, 'report_reviewed', message, reportId]
      );

      logger.info(`[AI Learning] Learned from manual moderation for report ${reportId}: ${manualDecision}`);

    } catch (error) {
      logger.error('Learn from manual moderation error:', error);
    }
  }

  /**
   * Modération automatique de tous les signalements en attente
   */
  public async autoModerateAllPending(): Promise<{
    processed: number;
    approved: number;
    rejected: number;
    manual: number;
  }> {
    try {
      const pendingReports = await query(
        `SELECT id FROM reports 
         WHERE status = 'pending' 
         ORDER BY created_at ASC 
         LIMIT 100`
      );

      let approved = 0;
      let rejected = 0;
      let manual = 0;

      for (const row of pendingReports.rows) {
        const result = await this.moderateReport(row.id);

        if (result.requiresManualReview) {
          manual++;
        } else if (result.approved) {
          approved++;
        } else {
          rejected++;
        }
      }

      logger.info(
        `[AI Moderation] Batch processed ${pendingReports.rows.length} reports: ` +
        `${approved} approved, ${rejected} rejected, ${manual} manual`
      );

      return {
        processed: pendingReports.rows.length,
        approved,
        rejected,
        manual,
      };

    } catch (error) {
      logger.error('Auto moderate all error:', error);
      return { processed: 0, approved: 0, rejected: 0, manual: 0 };
    }
  }

  /**
   * Génère un rapport de modération
   */
  public async generateModerationReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const stats = await query(
        `SELECT 
          COUNT(*) as total_reports,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN auto_moderated = true THEN 1 END) as auto_moderated,
          AVG(moderation_score) as avg_score,
          COUNT(CASE WHEN requires_manual_review = true THEN 1 END) as manual_review
         FROM reports 
         WHERE created_at BETWEEN $1 AND $2`,
        [startDate, endDate]
      );

      const violations = await query(
        `SELECT 
          violation_type,
          COUNT(*) as count
         FROM moderation_logs
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY violation_type
         ORDER BY count DESC`,
        [startDate, endDate]
      );

      const topReporters = await query(
        `SELECT 
          u.username,
          COUNT(*) as report_count,
          COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count
         FROM reports r
         JOIN users u ON r.reporter_id = u.id
         WHERE r.created_at BETWEEN $1 AND $2
         GROUP BY u.id, u.username
         ORDER BY report_count DESC
         LIMIT 10`,
        [startDate, endDate]
      );

      return {
        period: { startDate, endDate },
        overview: stats.rows[0],
        violations: violations.rows,
        topReporters: topReporters.rows,
      };

    } catch (error) {
      logger.error('Generate moderation report error:', error);
      throw error;
    }
  }
}

// =====================================================
// EXPORT DES FONCTIONS UTILITAIRES
// =====================================================

// Instance singleton du service
let moderationServiceInstance: ModerationService | null = null;

export function getModerationService(): ModerationService {
  if (!moderationServiceInstance) {
    moderationServiceInstance = new ModerationService();
  }
  return moderationServiceInstance;
}

// Export des fonctions pour compatibilité avec l'existant
export async function moderateReport(reportId: number): Promise<ModerationResult> {
  return getModerationService().moderateReport(reportId);
}

export async function autoModerateAllPending(): Promise<{
  processed: number;
  approved: number;
  rejected: number;
  manual: number;
}> {
  return getModerationService().autoModerateAllPending();
}

export async function moderateComment(commentId: number): Promise<ModerationResult> {
  // À implémenter si nécessaire
  return getModerationService().moderateReport(commentId);
}

export async function learnFromManualModeration(
  reportId: number,
  manualDecision: 'approved' | 'rejected',
  moderatorId: number
): Promise<void> {
  return getModerationService().learnFromManualModeration(reportId, manualDecision, moderatorId);
}

export async function moderateChatMessage(
  message: string,
  userId: number,
  streamId: number
): Promise<ChatModerationResult> {
  return getModerationService().moderateChatMessage(message, userId, streamId);
}

export async function analyzeImage(imagePath: string): Promise<ImageModerationResult> {
  return getModerationService().analyzeImage(imagePath);
}

export default ModerationService;