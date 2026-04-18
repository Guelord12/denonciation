import Stripe from 'stripe';
import { logger } from '../utils/logger';

let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia'
  });
  logger.info('✅ Stripe payment service initialized');
} else {
  logger.warn('⚠️ Stripe not configured - payments will be simulated');
}

export async function createPaymentIntent(amount: number, currency: string = 'usd', metadata?: any) {
  try {
    if (!stripe) {
      // Simuler pour le développement
      return {
        clientSecret: `mock_secret_${Date.now()}`,
        id: `mock_pi_${Date.now()}`
      };
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe utilise les centimes
      currency,
      metadata
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    };
  } catch (error) {
    logger.error('Create payment intent error:', error);
    throw error;
  }
}

export async function confirmPayment(paymentIntentId: string) {
  try {
    if (!stripe) {
      return { status: 'succeeded', id: paymentIntentId };
    }
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    logger.error('Confirm payment error:', error);
    throw error;
  }
}

export async function createCheckoutSession(
  userId: number,
  streamId: number,
  amount: number,
  successUrl: string,
  cancelUrl: string
) {
  try {
    if (!stripe) {
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

export async function handleWebhook(payload: string, signature: string) {
  try {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      logger.info('[Mock Webhook] Received payment webhook');
      return { received: true, mock: true };
    }
    
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        logger.info(`Payment succeeded: ${paymentIntent.id}`);
        // Traiter le paiement réussi
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        logger.warn(`Payment failed: ${failedPayment.id}`);
        break;
        
      case 'checkout.session.completed':
        const session = event.data.object;
        logger.info(`Checkout completed: ${session.id}`);
        // Activer l'accès au stream
        if (session.metadata?.userId && session.metadata?.streamId) {
          await handleSuccessfulSubscription(
            parseInt(session.metadata.userId),
            parseInt(session.metadata.streamId),
            session.amount_total ? session.amount_total / 100 : 0
          );
        }
        break;
    }
    
    return event;
  } catch (error) {
    logger.error('Webhook error:', error);
    throw error;
  }
}

async function handleSuccessfulSubscription(userId: number, streamId: number, amount: number) {
  const { query } = await import('../database/connection.js');
  
  await query(
    `INSERT INTO subscriptions (user_id, live_stream_id, amount, payment_status)
     VALUES ($1, $2, $3, 'completed')
     ON CONFLICT (user_id, live_stream_id) DO UPDATE
     SET payment_status = 'completed', amount = $3`,
    [userId, streamId, amount]
  );
  
  logger.info(`Subscription created: User ${userId} -> Stream ${streamId}`);
}