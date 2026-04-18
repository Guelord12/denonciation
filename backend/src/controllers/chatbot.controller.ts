import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { processChatbotMessage } from '../services/chatbot.service';
import { translateText } from '../services/translation.service';
import { logger } from '../utils/logger';

export async function handleChatbotMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { message, language = 'fr' } = req.body;
    const userId = req.user?.id || 0;

    if (!message) {
      res.status(400).json({ error: 'Message requis' });
      return;
    }

    const response = await processChatbotMessage(message, userId, language);
    res.json(response);
  } catch (error) {
    logger.error('Chatbot controller error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function getChatbotSuggestions(req: Request, res: Response): Promise<void> {
  try {
    const { language = 'fr' } = req.query;

    const suggestions: Record<string, string[]> = {
      fr: ['📝 Comment signaler un abus ?', '📊 Voir mes signalements', '📂 Quelles sont les catégories ?', '🎥 Comment faire un live ?', '📞 Contacter le support'],
      en: ['📝 How to report abuse?', '📊 View my reports', '📂 What are the categories?', '🎥 How to go live?', '📞 Contact support'],
      sw: ['📝 Jinsi ya kuripoti unyanyasaji?', '📊 Tazama ripoti zangu', '📂 Kategoria ni zipi?', '🎥 Jinsi ya kufanya live?', '📞 Wasiliana na msaada'],
      ln: ['📝 Ndenge nini ya kotinda mabe?', '📊 Tala matindi na ngai', '📂 Mitindo nini ezali?', '🎥 Ndenge nini ya kosala live?', '📞 Solola na lisalisi'],
    };

    res.json({ suggestions: suggestions[language as string] || suggestions.fr });
  } catch (error) {
    logger.error('Chatbot suggestions error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function translateContent(req: Request, res: Response): Promise<void> {
  try {
    const { text, to, from = 'auto' } = req.body;

    if (!text || !to) {
      res.status(400).json({ error: 'Texte et langue cible requis' });
      return;
    }

    const translated = await translateText({ text, to, from });
    res.json({ original: text, translated, language: to });
  } catch (error) {
    logger.error('Translation error:', error);
    res.status(500).json({ error: 'Erreur de traduction' });
  }
}

export async function getSupportedLanguages(req: Request, res: Response): Promise<void> {
  res.json({
    languages: {
      fr: 'Français',
      en: 'English',
      sw: 'Kiswahili',
      ln: 'Lingala',
      tsh: 'Tshiluba',
      kg: 'Kikongo',
    },
  });
}