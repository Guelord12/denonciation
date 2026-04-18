import axios from 'axios';
import { logger } from '../utils/logger';

const translationCache = new Map<string, string>();

export async function translateText({ text, to, from = 'auto' }: { text: string; to: string; from?: string }): Promise<string> {
  const cacheKey = `${text}|${to}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text, langpair: `${from}|${to}` },
    });

    if (response.data.responseStatus === 200) {
      const translated = response.data.responseData.translatedText;
      translationCache.set(cacheKey, translated);
      return translated;
    }
    return text;
  } catch (error) {
    logger.error('Translation error:', error);
    return text;
  }
}