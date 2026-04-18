import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import {
  handleChatbotMessage,
  getChatbotSuggestions,
  translateContent,
  getSupportedLanguages,
} from '../controllers/chatbot.controller';

const router = Router();

router.get('/languages', getSupportedLanguages);
router.get('/suggestions', getChatbotSuggestions);
router.post('/translate', translateContent);
router.post('/message', optionalAuth, handleChatbotMessage);

export default router;