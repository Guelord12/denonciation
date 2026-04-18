import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { query } from '../database/connection';
import crypto from 'crypto';

export async function handleTwilioWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { MessageSid, MessageStatus, To, From, Body } = req.body;
    
    logger.info(`Twilio webhook: ${MessageStatus} - ${MessageSid}`);
    
    await query(
      `INSERT INTO activity_logs (action, entity_type, details)
       VALUES ($1, $2, $3)`,
      ['TWILIO_WEBHOOK', 'sms', JSON.stringify({ MessageSid, MessageStatus, To, From })]
    );
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Twilio webhook error:', error);
    res.status(500).send('Error');
  }
}

export async function handleCloudinaryWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { notification_type, public_id, secure_url } = req.body;
    
    logger.info(`Cloudinary webhook: ${notification_type} - ${public_id}`);
    
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Cloudinary webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export async function handleNewsAPIWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { articles } = req.body;
    
    if (articles && Array.isArray(articles)) {
      for (const article of articles) {
        await query(
          `INSERT INTO actualites (title, description, content, url, image_url, source, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (url) DO NOTHING`,
          [
            article.title,
            article.description,
            article.content,
            article.url,
            article.urlToImage,
            article.source?.name,
            article.publishedAt,
          ]
        );
      }
    }
    
    res.status(200).json({ received: true, count: articles?.length || 0 });
  } catch (error) {
    logger.error('NewsAPI webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}