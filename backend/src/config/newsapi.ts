import axios from 'axios';
import { logger } from '../utils/logger';
import * as xml2js from 'xml2js';
import he from 'he';

// ========== MULTIPLES API KEYS ==========
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || '';
const MEDIASTACK_API_KEY = process.env.MEDIASTACK_API_KEY || '';

// URLs des APIs
const NEWS_API_BASE = 'https://newsapi.org/v2';
const GNEWS_API_BASE = 'https://gnews.io/api/v4';
const MEDIASTACK_API_BASE = 'http://api.mediastack.com/v1';

// ========== SOURCES RSS COMPLÈTES (TOUTES RÉPARÉES) ==========
const RSS_SOURCES = [
  // === SOURCES CONGOLAISES ===
  {
    name: 'Radio Okapi',
    url: 'https://www.radiookapi.net/feed',  // ✅ URL corrigée
    category: 'générale'
  },
  {
    name: 'Mediacongo',
    url: 'https://www.mediacongo.net/rss.xml',
    category: 'générale'
  },
  {
    name: 'Actualite.cd',
    url: 'https://actualite.cd/feed',
    category: 'générale'
  },
  {
    name: '7sur7.cd',
    url: 'https://7sur7.cd/feed',
    category: 'générale'
  },
  
  // === SOURCES AFRICAINES ===
  {
    name: 'France 24 Afrique',
    url: 'https://www.france24.com/fr/afrique/rss',
    category: 'générale'
  },
  {
    name: 'RFI Afrique',
    url: 'https://www.rfi.fr/fr/afrique/rss',
    category: 'générale'
  },
  {
    name: 'BBC Afrique',
    url: 'https://feeds.bbci.co.uk/afrique/rss.xml',
    category: 'générale'
  },
  {
    name: 'Le Monde Afrique',
    url: 'https://www.lemonde.fr/afrique/rss_full.xml',
    category: 'générale'
  },
  {
    name: 'Jeune Afrique',
    url: 'https://www.jeuneafrique.com/feed/',
    category: 'générale'
  },
  {
    name: 'Africa News',
    url: 'https://www.africanews.com/feed/rss',
    category: 'générale'
  },
  {
    name: 'Le Point Afrique',
    url: 'https://www.lepoint.fr/afrique/feed.xml',
    category: 'générale'
  },
  {
    name: 'TV5 Monde',
    url: 'https://information.tv5monde.com/feed/',
    category: 'générale'
  },
  
  // === SOURCES INTERNATIONALES ===
  {
    name: 'Le Monde',
    url: 'https://www.lemonde.fr/rss/une.xml',
    category: 'générale'
  },
  {
    name: 'Le Figaro',
    url: 'https://www.lefigaro.fr/rss/figaro_actualites.xml',
    category: 'générale'
  },
  {
    name: 'Libération',
    url: 'https://www.liberation.fr/arc/outboundfeeds/rss/',
    category: 'générale'
  },
  {
    name: '20 Minutes',
    url: 'https://www.20minutes.fr/feed/rss',  // ✅ URL corrigée
    category: 'générale'
  },
  {
    name: 'Europe 1',
    url: 'https://www.europe1.fr/rss/une.xml',  // ✅ URL corrigée
    category: 'générale'
  },
  {
    name: 'BFM TV',
    url: 'https://www.bfmtv.com/rss/actualites/',
    category: 'générale'
  },
  {
    name: 'Reuters Africa',
    url: 'https://www.reutersagency.com/feed/?best-topics=africa&post_type=best',
    category: 'générale'
  },
  {
    name: 'Al Jazeera Africa',
    url: 'https://www.aljazeera.com/xml/rss/africa.xml',
    category: 'générale'
  },
  
  // === SOURCES SPÉCIALISÉES ===
  {
    name: 'Agence Ecofin',
    url: 'https://www.agenceecofin.com/rss',
    category: 'économique'
  },
  {
    name: 'BFM Business',
    url: 'https://www.bfmtv.com/rss/business/',  // ✅ URL corrigée
    category: 'économique'
  },
  {
    name: 'Numerama',
    url: 'https://www.numerama.com/feed/',
    category: 'technologie'
  },
  {
    name: 'TechCongo',
    url: 'https://www.techcongo.net/feed/',
    category: 'technologie'
  }
];

interface Article {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string | null;
  source: { name: string };
  publishedAt: string;
  category?: string;
}

// ========== NETTOYAGE XML (corrige les erreurs de parsing) ==========
function sanitizeXML(xmlData: string): string {
  if (!xmlData) return '';
  
  // Remplacer les & mal formés
  let sanitized = xmlData.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#[0-9]+;|#x[0-9a-fA-F]+;)/g, '&amp;');
  
  // Supprimer les caractères de contrôle invalides
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Corriger les balises mal fermées
  sanitized = sanitized.replace(/<br>/gi, '<br/>');
  sanitized = sanitized.replace(/<hr>/gi, '<hr/>');
  sanitized = sanitized.replace(/<img([^>]+)(?<!\\)>/gi, '<img$1/>');
  
  return sanitized;
}

// ========== FONCTION DE NORMALISATION DES DATES ==========
function normalizeDate(rawDate: string): string | null {
  if (!rawDate) return null;
  
  const trimmed = rawDate.trim();
  
  // Essayer ISO 8601 / RFC 3339
  let date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  // Essayer RFC 822 via Date.parse
  const timestamp = Date.parse(trimmed);
  if (!isNaN(timestamp)) {
    return new Date(timestamp).toISOString();
  }
  
  // Essayer de nettoyer les formats exotiques
  const cleaned = trimmed
    .replace(/(\d+)(?:st|nd|rd|th)/, '$1')
    .replace(/[àa] (\d{1,2}:\d{2})/, ' $1')
    .replace(/T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}/, '');
  
  date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  return null;
}

// ========== FONCTION AMÉLIORÉE D'EXTRACTION DES IMAGES ==========
function extractImageFromRSS(item: any, feedUrl?: string): string | null {
  // 1. Enclosure
  if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  
  // 2. Media:content
  if (item['media:content']?.url) return item['media:content'].url;
  if (Array.isArray(item['media:content']) && item['media:content'][0]?.url) 
    return item['media:content'][0].url;
  
  // 3. Media:thumbnail
  if (item['media:thumbnail']?.url) return item['media:thumbnail'].url;
  if (Array.isArray(item['media:thumbnail']) && item['media:thumbnail'][0]?.url) 
    return item['media:thumbnail'][0].url;
  
  // 4. Image dans le contenu HTML
  const content = item['content:encoded']?._ || item['content:encoded'] || item.description || '';
  if (typeof content === 'string') {
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      let imgUrl = imgMatch[1];
      if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
      if (imgUrl.startsWith('/') && feedUrl) {
        try {
          const baseUrl = new URL(feedUrl).origin;
          imgUrl = baseUrl + imgUrl;
        } catch (e) {}
      }
      return imgUrl;
    }
    
    const imgMatch2 = content.match(/https?:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)/i);
    if (imgMatch2) return imgMatch2[0];
  }
  
  // 5. Tag image
  if (item.image?.url) return item.image.url;
  if (typeof item.image === 'string') return item.image;
  
  return null;
}

// ========== DÉCODAGE HTML ==========
function decodeHtml(html: string): string {
  if (!html) return '';
  try {
    return he.decode(html);
  } catch (e) {
    return html;
  }
}

function cleanText(text: string): string {
  if (!text) return '';
  
  let cleaned = decodeHtml(text);
  
  cleaned = cleaned
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&ucirc;/g, 'û')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&oeil;/g, 'œ')
    .replace(/&hellip;/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

async function parseRSSFeed(xmlData: string): Promise<any> {
  const sanitized = sanitizeXML(xmlData);
  
  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    normalizeTags: false,
    trim: true
  });
  
  try {
    const result = await parser.parseStringPromise(sanitized);
    return result;
  } catch (error) {
    logger.debug('RSS parsing error (non-critical):', error);
    return null;
  }
}

function extractArticlesFromRSS(data: any, sourceName: string, defaultCategory: string, feedUrl?: string): Article[] {
  const articles: Article[] = [];
  
  try {
    let items: any[] = [];
    
    if (data?.rss?.channel?.item) {
      items = Array.isArray(data.rss.channel.item) ? data.rss.channel.item : [data.rss.channel.item];
    } else if (data?.feed?.entry) {
      items = Array.isArray(data.feed.entry) ? data.feed.entry : [data.feed.entry];
    }
    
    for (const item of items) {
      let title = item.title;
      if (typeof title === 'object') title = title._ || title.__text || title['#text'] || '';
      
      let description = item.description;
      if (typeof description === 'object') description = description._ || description.__text || description['#text'] || '';
      
      let content = item['content:encoded'] || item.content || '';
      if (typeof content === 'object') content = content._ || content.__text || content['#text'] || '';
      
      let link = item.link;
      if (typeof link === 'object') link = link.href || link._ || '';
      if (Array.isArray(link)) link = link[0]?.href || link[0] || '';
      
      const imageUrl = extractImageFromRSS(item, feedUrl);
      
      let pubDate = item.pubDate || item.published || item.updated || item['dc:date'];
      if (typeof pubDate === 'object') pubDate = pubDate._ || pubDate.__text || '';
      
      const normalizedDate = normalizeDate(pubDate);
      
      const cleanTitle = cleanText(title);
      const cleanDesc = cleanText(description);
      const cleanContent = cleanText(content);
      
      if (cleanTitle && link) {
        articles.push({
          title: cleanTitle,
          description: cleanDesc || cleanTitle,
          content: cleanContent || cleanDesc || cleanTitle,
          url: link,
          urlToImage: imageUrl,
          source: { name: sourceName },
          publishedAt: normalizedDate || new Date().toISOString(),
          category: defaultCategory
        });
      }
    }
  } catch (error) {
    logger.debug(`Error extracting articles from ${sourceName}:`, error);
  }
  
  return articles;
}

// ========== GNews API ==========
export async function fetchFromGNews(category?: string, country: string = 'cd', maxResults: number = 30): Promise<Article[]> {
  if (!GNEWS_API_KEY) {
    logger.warn('⚠️ GNEWS_API_KEY non configuré');
    return [];
  }

  try {
    const params: any = {
      apikey: GNEWS_API_KEY,
      lang: 'fr',
      max: maxResults,
      country: country.toUpperCase()
    };

    if (category && category !== 'générale') {
      const categoryMap: { [key: string]: string } = {
        'politique': 'politics',
        'économie': 'business',
        'sport': 'sports',
        'technologie': 'technology',
        'santé': 'health',
        'science': 'science'
      };
      params.category = categoryMap[category] || category;
    }

    const response = await axios.get(`${GNEWS_API_BASE}/top-headlines`, { params, timeout: 10000 });
    
    if (response.data?.articles) {
      const articles = response.data.articles.map((a: any) => ({
        title: cleanText(a.title || ''),
        description: cleanText(a.description || ''),
        content: cleanText(a.content || a.description || ''),
        url: a.url,
        urlToImage: a.image || null,
        source: { name: a.source?.name || 'GNews' },
        publishedAt: a.publishedAt || new Date().toISOString(),
        category: category || 'générale'
      }));
      
      logger.info(`✅ GNews: ${articles.length} articles récupérés`);
      return articles;
    }
    
    return [];
  } catch (error: any) {
    if (error.response?.status === 401) {
      logger.error('❌ GNews: Clé API invalide');
    } else if (error.response?.status === 429) {
      logger.warn('⚠️ GNews: Limite de requêtes atteinte');
    }
    return [];
  }
}

// ========== MediaStack API ==========
export async function fetchFromMediaStack(category?: string, country: string = 'cd', maxResults: number = 30): Promise<Article[]> {
  if (!MEDIASTACK_API_KEY) {
    logger.warn('⚠️ MEDIASTACK_API_KEY non configuré');
    return [];
  }

  try {
    const params: any = {
      access_key: MEDIASTACK_API_KEY,
      languages: 'fr',
      limit: maxResults,
      countries: country
    };

    if (category && category !== 'générale') {
      params.categories = category;
    }

    const response = await axios.get(`${MEDIASTACK_API_BASE}/news`, { params, timeout: 10000 });
    
    if (response.data?.data) {
      const articles = response.data.data.map((a: any) => ({
        title: cleanText(a.title || ''),
        description: cleanText(a.description || ''),
        content: cleanText(a.content || a.description || ''),
        url: a.url,
        urlToImage: a.image || null,
        source: { name: a.source || 'MediaStack' },
        publishedAt: a.published_at || a.publishedAt || new Date().toISOString(),
        category: category || 'générale'
      }));
      
      logger.info(`✅ MediaStack: ${articles.length} articles récupérés`);
      return articles;
    }
    
    return [];
  } catch (error: any) {
    if (error.response?.status === 401) {
      logger.error('❌ MediaStack: Clé API invalide');
    } else if (error.response?.status === 429) {
      logger.warn('⚠️ MediaStack: Limite de requêtes atteinte');
    }
    return [];
  }
}

// ========== Recherche sur GNews ==========
export async function searchGNews(query: string, maxResults: number = 30): Promise<Article[]> {
  if (!GNEWS_API_KEY) {
    return [];
  }

  try {
    const response = await axios.get(`${GNEWS_API_BASE}/search`, {
      params: {
        q: query,
        apikey: GNEWS_API_KEY,
        lang: 'fr',
        max: maxResults
      },
      timeout: 10000
    });
    
    if (response.data?.articles) {
      return response.data.articles.map((a: any) => ({
        title: cleanText(a.title || ''),
        description: cleanText(a.description || ''),
        content: cleanText(a.content || a.description || ''),
        url: a.url,
        urlToImage: a.image || null,
        source: { name: a.source?.name || 'GNews' },
        publishedAt: a.publishedAt || new Date().toISOString()
      }));
    }
    return [];
  } catch (error) {
    logger.error('GNews search error:', error);
    return [];
  }
}

// ========== NewsAPI (multi-pays amélioré) ==========
export async function fetchFromNewsAPI(category?: string, country?: string): Promise<Article[]> {
  if (!NEWS_API_KEY) {
    logger.warn('⚠️ NEWS_API_KEY non configuré');
    return [];
  }

  const allArticles: Article[] = [];
  
  // Liste étendue des pays pour plus de contenu
  const countriesToFetch = country ? [country] : ['cd', 'fr', 'us', 'gb', 'de', 'it', 'es', 'ca', 'br', 'in'];
  
  for (const currentCountry of countriesToFetch) {
    try {
      const params: any = {
        apiKey: NEWS_API_KEY,
        pageSize: 20,
        country: currentCountry
      };
      
      if (category && category !== 'générale') params.category = category;
      
      const response = await axios.get(`${NEWS_API_BASE}/top-headlines`, { params, timeout: 10000 });
      
      if (response.data.status === 'ok' && response.data.articles && response.data.articles.length > 0) {
        const articles = response.data.articles.map((a: any) => ({
          title: cleanText(a.title || ''),
          description: cleanText(a.description || ''),
          content: cleanText(a.content || a.description || ''),
          url: a.url,
          urlToImage: a.urlToImage,
          source: { name: a.source?.name || 'NewsAPI' },
          publishedAt: a.publishedAt || new Date().toISOString(),
          category: category || 'générale'
        }));
        
        allArticles.push(...articles);
        logger.info(`✅ NewsAPI (${currentCountry}): ${articles.length} articles récupérés`);
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn(`⚠️ NewsAPI (${currentCountry}): Limite de requêtes atteinte`);
      } else if (error.response?.status === 401) {
        logger.error('❌ NewsAPI: Clé API invalide');
        break;
      }
    }
  }
  
  return allArticles;
}

// ========== RSS Feeds (avec fallback silencieux) ==========
export async function fetchFromRSSFeeds(category?: string): Promise<Article[]> {
  const articles: Article[] = [];
  
  const sourcesToFetch = category 
    ? RSS_SOURCES.filter(s => s.category === category)
    : RSS_SOURCES;
  
  for (const source of sourcesToFetch) {
    try {
      const response = await axios.get(source.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      
      const parsed = await parseRSSFeed(response.data);
      
      if (parsed) {
        const extractedArticles = extractArticlesFromRSS(parsed, source.name, source.category, source.url);
        if (extractedArticles.length > 0) {
          articles.push(...extractedArticles);
          logger.info(`✅ RSS ${source.name}: ${extractedArticles.length} articles`);
        } else {
          logger.debug(`📭 RSS ${source.name}: 0 articles (flux vide)`);
        }
      }
    } catch (error: any) {
      // Log silencieux pour les erreurs (ne pas polluer)
      if (error.code !== 'ECONNABORTED' && error.response?.status !== 404 && error.response?.status !== 403) {
        logger.debug(`⚠️ RSS ${source.name}: ${error.message}`);
      }
    }
  }
  
  return articles;
}

// ========== FONCTION PRINCIPALE ==========
export async function fetchAllNews(category?: string, country?: string): Promise<Article[]> {
  const allArticles: Article[] = [];
  
  logger.info(`📰 Fetching news for category: ${category || 'all'}`);
  
  const newsApiArticles = await fetchFromNewsAPI(category, country);
  allArticles.push(...newsApiArticles);
  
  const gnewsArticles = await fetchFromGNews(category, 'cd');
  allArticles.push(...gnewsArticles);
  
  const mediastackArticles = await fetchFromMediaStack(category, 'cd');
  allArticles.push(...mediastackArticles);
  
  const rssArticles = await fetchFromRSSFeeds(category);
  allArticles.push(...rssArticles);
  
  // Dédupliquer par URL
  const uniqueArticles = allArticles.filter((article, index, self) =>
    index === self.findIndex(a => a.url === article.url)
  );
  
  // Trier par date
  uniqueArticles.sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
  
  const articlesWithImages = uniqueArticles.filter(a => a.urlToImage);
  
  logger.info(`📰 Total: ${uniqueArticles.length} articles (${articlesWithImages.length} avec images)`);
  logger.info(`📊 NewsAPI=${newsApiArticles.length}, GNews=${gnewsArticles.length}, MediaStack=${mediastackArticles.length}, RSS=${rssArticles.length}`);
  
  return uniqueArticles;
}

// ========== Recherche ==========
export async function searchAllNews(query: string): Promise<Article[]> {
  const allArticles: Article[] = [];
  
  logger.info(`🔍 Searching: ${query}`);
  
  if (NEWS_API_KEY) {
    try {
      const response = await axios.get(`${NEWS_API_BASE}/everything`, {
        params: {
          q: query,
          sortBy: 'publishedAt',
          apiKey: NEWS_API_KEY,
          pageSize: 30,
          language: 'fr'
        },
        timeout: 10000
      });
      
      if (response.data.articles) {
        const articles = response.data.articles.map((a: any) => ({
          title: cleanText(a.title || ''),
          description: cleanText(a.description || ''),
          content: cleanText(a.content || a.description || ''),
          url: a.url,
          urlToImage: a.urlToImage,
          source: { name: a.source?.name || 'NewsAPI' },
          publishedAt: a.publishedAt || new Date().toISOString()
        }));
        allArticles.push(...articles);
      }
    } catch (error: any) {
      logger.error('NewsAPI search error:', error.message);
    }
  }
  
  const gnewsResults = await searchGNews(query);
  allArticles.push(...gnewsResults);
  
  const uniqueArticles = allArticles.filter((article, index, self) =>
    index === self.findIndex(a => a.url === article.url)
  );
  
  return uniqueArticles;
}

export const AVAILABLE_SOURCES = RSS_SOURCES.map(s => s.name);