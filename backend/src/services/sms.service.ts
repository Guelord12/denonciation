import twilio from 'twilio';
import AfricasTalking from 'africastalking';
import { logger } from '../utils/logger';

let smsProvider: any;
let providerType: string;
let isInitialized = false;

function initializeSMS(): void {
  if (isInitialized) return;
  
  providerType = process.env.SMS_PROVIDER || 'twilio';
  
  if (providerType === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      smsProvider = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      isInitialized = true;
      logger.info('✅ Twilio SMS provider initialized');
      logger.info(`   From: ${process.env.TWILIO_PHONE_NUMBER}`);
    } catch (error: any) {
      logger.error('❌ Failed to initialize Twilio:', error.message);
      smsProvider = null;
    }
  } else if (providerType === 'africastalking' && process.env.AT_API_KEY) {
    try {
      smsProvider = AfricasTalking({
        apiKey: process.env.AT_API_KEY,
        username: process.env.AT_USERNAME || 'sandbox'
      });
      isInitialized = true;
      logger.info('✅ Africa\'s Talking SMS provider initialized');
    } catch (error: any) {
      logger.error('❌ Failed to initialize Africa\'s Talking:', error.message);
      smsProvider = null;
    }
  } else {
    logger.warn('⚠️ No SMS provider configured - SMS will be logged only');
    smsProvider = null;
    isInitialized = true;
  }
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Initialiser si pas encore fait
    if (!isInitialized) {
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
      } else if (cleanNumber.length === 10) {
        cleanNumber = '+243' + cleanNumber.substring(1);
      }
    }
    
    logger.info(`📱 Sending SMS to ${cleanNumber}: ${message.substring(0, 50)}...`);
    
    // Mode développement ou pas de provider
    if (!smsProvider || process.env.NODE_ENV === 'development') {
      logger.info(`[SMS MOCK] To: ${cleanNumber} - Message: ${message}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }
    
    if (providerType === 'twilio') {
      try {
        const result = await smsProvider.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: cleanNumber
        });
        
        logger.info(`✅ SMS sent via Twilio: ${result.sid}`);
        logger.info(`   Status: ${result.status}`);
        return { success: true, messageId: result.sid };
      } catch (twilioError: any) {
        logger.error('❌ Twilio SMS error:', twilioError.message);
        logger.error('   Code:', twilioError.code);
        logger.error('   More info:', twilioError.moreInfo);
        
        // Vérifier les erreurs courantes
        if (twilioError.code === 21211) {
          return { success: false, error: 'Numéro de téléphone invalide' };
        } else if (twilioError.code === 21608) {
          return { success: false, error: 'Numéro non vérifié dans Twilio (mode trial)' };
        } else if (twilioError.code === 20003) {
          return { success: false, error: 'Authentification Twilio échouée' };
        }
        
        return { success: false, error: twilioError.message };
      }
      
    } else if (providerType === 'africastalking') {
      try {
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
      } catch (atError: any) {
        logger.error('❌ Africa\'s Talking SMS error:', atError.message);
        return { success: false, error: atError.message };
      }
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

export async function sendVerificationSMS(to: string, code: string): Promise<boolean> {
  const message = `[DENONCIATION] Votre code de vérification est: ${code}. Ce code expire dans 10 minutes.`;
  const result = await sendSMS(to, message);
  return result.success;
}