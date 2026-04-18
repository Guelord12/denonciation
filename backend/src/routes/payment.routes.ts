import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createPaymentIntent,
  confirmPayment,
  handleStripeWebhook,
} from '../controllers/payment.controller';

const router = Router();

// Route publique pour le webhook Stripe (pas d'authentification)
router.post('/webhook', handleStripeWebhook);

// Routes authentifiées
router.use(authenticate);
router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);

export default router;