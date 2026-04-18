import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function createPaymentIntent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { amount, currency = 'usd', stream_id } = req.body;
    const userId = req.user!.id;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        user_id: userId.toString(),
        stream_id: stream_id?.toString(),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    logger.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
}

export async function confirmPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { payment_intent_id } = req.body;
    const userId = req.user!.id;

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      res.status(400).json({ error: 'Payment not completed' });
      return;
    }

    if (paymentIntent.metadata.user_id !== userId.toString()) {
      res.status(403).json({ error: 'Payment does not belong to user' });
      return;
    }

    if (paymentIntent.metadata.stream_id) {
      await query(
        `INSERT INTO subscriptions (user_id, live_stream_id, amount, payment_status)
         VALUES ($1, $2, $3, 'completed')
         ON CONFLICT (user_id, live_stream_id) DO UPDATE
         SET payment_status = 'completed', amount = $3`,
        [userId, paymentIntent.metadata.stream_id, paymentIntent.amount / 100]
      );
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
}

export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    res.status(400).send('Missing signature');
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        logger.info(`Payment succeeded: ${paymentIntent.id}`);
        
        const { user_id, stream_id } = paymentIntent.metadata;
        if (user_id && stream_id) {
          await query(
            `INSERT INTO subscriptions (user_id, live_stream_id, amount, payment_status)
             VALUES ($1, $2, $3, 'completed')
             ON CONFLICT (user_id, live_stream_id) DO UPDATE
             SET payment_status = 'completed', amount = $3`,
            [parseInt(user_id), parseInt(stream_id), paymentIntent.amount / 100]
          );
          
          await query(
            `INSERT INTO notifications (user_id, type, content, related_id)
             VALUES ($1, 'system', $2, $3)`,
            [parseInt(user_id), 'Votre paiement a été confirmé. Vous avez maintenant accès au stream premium.', parseInt(stream_id)]
          );
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        logger.warn(`Payment failed: ${failedPayment.id}`);
        break;
        
      case 'checkout.session.completed':
        const session = event.data.object;
        logger.info(`Checkout completed: ${session.id}`);
        if (session.metadata?.userId && session.metadata?.streamId) {
          await handleSuccessfulSubscription(
            parseInt(session.metadata.userId),
            parseInt(session.metadata.streamId),
            session.amount_total ? session.amount_total / 100 : 0
          );
        }
        break;
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
}

export async function createCheckoutSession(
  userId: number,
  streamId: number,
  amount: number,
  successUrl: string,
  cancelUrl: string
): Promise<any> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { url: `${successUrl}?mock_session=true` };
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Accès au stream premium',
            description: 'Accès unique à un stream en direct'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        streamId: streamId.toString()
      }
    });
    
    return session;
  } catch (error) {
    logger.error('Create checkout session error:', error);
    throw error;
  }
}

async function handleSuccessfulSubscription(userId: number, streamId: number, amount: number): Promise<void> {
  await query(
    `INSERT INTO subscriptions (user_id, live_stream_id, amount, payment_status)
     VALUES ($1, $2, $3, 'completed')
     ON CONFLICT (user_id, live_stream_id) DO UPDATE
     SET payment_status = 'completed', amount = $3`,
    [userId, streamId, amount]
  );
  
  logger.info(`Subscription created: User ${userId} -> Stream ${streamId}`);
}