import { query } from '../database/connection';
import { logger } from '../utils/logger';

const INTENTS: Record<string, string[]> = {
  GREETING: ['bonjour', 'salut', 'hello', 'hi', 'mbote', 'jambo'],
  HELP: ['aide', 'help', 'aider', 'assistance'],
  REPORT: ['signaler', 'dénoncer', 'report', 'abus'],
  STATUS: ['statut', 'état', 'suivi', 'status'],
};

const RESPONSES: Record<string, Record<string, string>> = {
  fr: {
    greeting: 'Bonjour ! Je suis l\'assistant Dénonciation. Comment puis-je vous aider ?',
    help: 'Je peux vous aider à signaler un abus, suivre vos signalements, ou connaître les catégories.',
    report: 'Pour signaler un abus, cliquez sur "Signaler" et remplissez le formulaire.',
    status: 'Vous pouvez suivre le statut de vos signalements dans votre tableau de bord.',
    default: 'Je n\'ai pas compris. Pouvez-vous reformuler ?',
  },
  en: {
    greeting: 'Hello! I\'m the Dénonciation assistant. How can I help you?',
    help: 'I can help you report abuse, track your reports, or know categories.',
    report: 'To report abuse, click "Report" and fill out the form.',
    status: 'You can track your reports status in your dashboard.',
    default: 'I didn\'t understand. Could you rephrase?',
  },
};

export async function processChatbotMessage(message: string, userId: number, language: string = 'fr') {
  const lowerMessage = message.toLowerCase();
  let detectedIntent: string | null = null;

  for (const [intent, keywords] of Object.entries(INTENTS)) {
    if (keywords.some(k => lowerMessage.includes(k))) {
      detectedIntent = intent;
      break;
    }
  }

  const responses = RESPONSES[language] || RESPONSES.fr;
  let responseText: string;
  let type: 'text' | 'suggestion' = 'text';
  let suggestions: string[] | undefined;

  switch (detectedIntent) {
    case 'GREETING':
      responseText = responses.greeting;
      suggestions = ['📝 Signaler un abus', '📊 Mes signalements', '🆘 Aide'];
      type = 'suggestion';
      break;
    case 'HELP':
      responseText = responses.help;
      suggestions = ['📝 Signaler un abus', '📊 Mes signalements', '📂 Catégories'];
      type = 'suggestion';
      break;
    case 'REPORT':
      responseText = responses.report;
      break;
    case 'STATUS':
      const stats = await query(
        `SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending 
         FROM reports WHERE user_id = $1`,
        [userId]
      );
      const s = stats.rows[0];
      responseText = `Vous avez ${s.total} signalement(s) dont ${s.pending} en attente.`;
      break;
    default:
      responseText = responses.default;
      suggestions = ['📝 Signaler un abus', '🆘 Aide'];
      type = 'suggestion';
  }

  await query(
    `INSERT INTO activity_logs (user_id, action, entity_type, details)
     VALUES ($1, $2, $3, $4)`,
    [userId, 'CHATBOT_INTERACTION', 'chatbot', JSON.stringify({ question: message, response: responseText })]
  );

  return { message: responseText, type, suggestions };
}