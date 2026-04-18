import twilio from 'twilio';
import AfricasTalking from 'africastalking';
import { logger } from '../utils/logger';

let smsProvider: any;
let providerType: string;

function initializeSMS() {
  providerType = process.env.SMS_PROVIDER || 'twilio';
  
  if (providerType === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
    smsProvider = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    logger.info('✅ Twilio SMS provider initialized');
  } else if (providerType === 'africastalking' && process.env.AT_API_KEY) {
    smsProvider = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME || 'sandbox'
    });
    logger.info('✅ Africa\'s Talking SMS provider initialized');
  } else {
    logger.warn('⚠️ No SMS provider configured - SMS will be logged only');
  }
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!smsProvider) {
      initializeSMS();
    }
    
    // Nettoyer le numéro de téléphone
    let cleanNumber = to.replace(/\s+/g, '').replace(/[()-]/g, '');
    
    // Ajouter le préfixe international si nécessaire
    if (!cleanNumber.startsWith('+')) {
      if (cleanNumber.startsWith('0')) {
        cleanNumber = '+243' + cleanNumber.substring(1);
      } else if (cleanNumber.length === 9) {
        cleanNumber = '+243' + cleanNumber;
      }
    }
    
    logger.info(`📱 Sending SMS to ${cleanNumber}: ${message.substring(0, 50)}...`);
    
    // Mode développement ou pas de provider
    if (!smsProvider || process.env.NODE_ENV === 'development') {
      logger.info(`[SMS MOCK] To: ${cleanNumber} - Message: ${message}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }
    
    if (providerType === 'twilio') {
      const result = await smsProvider.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: cleanNumber
      });
      
      logger.info(`✅ SMS sent via Twilio: ${result.sid}`);
      return { success: true, messageId: result.sid };
      
    } else if (providerType === 'africastalking') {
      const sms = smsProvider.SMS;
      const result = await sms.send({
        to: [cleanNumber],
        message,
        from: process.env.AT_SENDER_ID || 'DENONCIATION'
      });
      
      logger.info(`✅ SMS sent via Africa's Talking: ${JSON.stringify(result)}`);
      return { 
        success: true, 
        messageId: result.SMSMessageData?.Recipients?.[0]?.messageId 
      };
    }
    
    return { success: false, error: 'No SMS provider configured' };
    
  } catch (error: any) {
    logger.error('❌ SMS sending failed:', error);
    return { success: false, error: error.message };
  }
}

export async function sendWelcomeSMS(to: string, firstName?: string): Promise<boolean> {
  const name = firstName || 'Utilisateur';
  const message = `[Dénonciation] Bienvenue ${name} ! Votre compte a été créé avec succès. Merci de contribuer à une société plus juste.`;
  const result = await sendSMS(to, message);
  return result.success;
}

export async function sendWarningSMS(to: string, violationCount: number, violationType: string): Promise<boolean> {
  let message = `[DENONCIATION] Avertissement #${violationCount}: Violation des règles - ${violationType}. `;
  
  if (violationCount === 1) {
    message += 'Ceci est votre premier avertissement. Veuillez respecter nos conditions d\'utilisation.';
  } else if (violationCount === 2) {
    message += 'Ceci est votre deuxième avertissement. Prochaine infraction entraînera un bannissement.';
  } else if (violationCount >= 3) {
    message += 'DERNIER AVERTISSEMENT. Votre compte sera banni en cas de récidive.';
  }
  
  const result = await sendSMS(to, message);
  return result.success;
}

export async function sendBanNotificationSMS(to: string, reason: string): Promise<boolean> {
  const message = `[DENONCIATION] Votre compte a été banni. Raison: ${reason}. Contactez l'administration pour plus d'informations.`;
  const result = await sendSMS(to, message);
  return result.success;
}