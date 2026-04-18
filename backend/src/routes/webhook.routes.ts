import { Router } from 'express';
import {
  handleTwilioWebhook,
  handleCloudinaryWebhook,
  handleNewsAPIWebhook,
} from '../controllers/webhook.controller';

const router = Router();

router.post('/twilio', handleTwilioWebhook);
router.post('/cloudinary', handleCloudinaryWebhook);
router.post('/news', handleNewsAPIWebhook);

export default router;