import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;

function initializeTransporter() {
  // Configuration SMTP (utiliser Gmail, SendGrid, ou autre)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    logger.info('✅ Email transporter initialized');
  } else {
    logger.warn('⚠️ Email service not configured - emails will be logged only');
  }
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  try {
    if (!transporter) {
      initializeTransporter();
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@denonciation.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };
    
    if (!transporter) {
      // Mode développement : logger l'email
      logger.info(`[EMAIL MOCK] To: ${options.to} - Subject: ${options.subject}`);
      logger.debug('Email content:', options.html?.substring(0, 200));
      return true;
    }
    
    await transporter.sendMail(mailOptions);
    logger.info(`✅ Email sent to ${options.to}`);
    return true;
    
  } catch (error) {
    logger.error('❌ Email sending failed:', error);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, data: { username: string; first_name?: string }): Promise<boolean> {
  const name = data.first_name || data.username;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenue sur Dénonciation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #EF4444; margin-bottom: 10px;">🛡️ Dénonciation</h1>
        <p style="font-size: 18px; color: #666;">Plateforme de signalement d'abus</p>
      </div>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 30px;">
        <h2 style="color: #1F2937; margin-top: 0;">Bienvenue ${name} !</h2>
        
        <p>Nous sommes ravis de vous compter parmi les membres de Dénonciation.</p>
        
        <p>Avec votre compte, vous pouvez :</p>
        <ul style="margin-bottom: 25px;">
          <li>📝 Signaler des abus et injustices</li>
          <li>📹 Diffuser en direct des situations</li>
          <li>💬 Commenter et soutenir d'autres signalements</li>
          <li>🤝 Témoigner sur des cas</li>
          <li>📊 Suivre l'évolution de vos signalements</li>
        </ul>
        
        <p>Votre identité est protégée : tous vos signalements, commentaires et témoignages sont anonymes pour les autres utilisateurs. Seuls les administrateurs ont accès à votre identité.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.WEB_URL || 'https://denonciation.com'}/dashboard" style="background: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Accéder à mon tableau de bord</a>
        </div>
        
        <p style="font-size: 14px; color: #666;">Votre nom d'utilisateur : <strong>${data.username}</strong></p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center;">
        <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        <p>© ${new Date().getFullYear()} Dénonciation. Tous droits réservés.</p>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to,
    subject: 'Bienvenue sur Dénonciation !',
    html
  });
}

export async function sendReportStatusEmail(
  to: string,
  data: {
    username: string;
    reportTitle: string;
    status: 'approved' | 'rejected';
    reason?: string;
  }
): Promise<boolean> {
  const statusText = data.status === 'approved' ? 'approuvé' : 'rejeté';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Mise à jour de votre signalement</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #EF4444;">🛡️ Dénonciation</h1>
      
      <div style="background: #f9f9f9; border-radius: 8px; padding: 30px;">
        <h2>Votre signalement a été ${statusText}</h2>
        
        <p>Bonjour ${data.username},</p>
        
        <p>Votre signalement <strong>"${data.reportTitle}"</strong> a été ${statusText} par notre équipe de modération.</p>
        
        ${data.reason ? `<p><strong>Raison :</strong> ${data.reason}</p>` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.WEB_URL || 'https://denonciation.com'}/dashboard" style="background: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px;">Voir mes signalements</a>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to,
    subject: `Votre signalement a été ${statusText}`,
    html
  });
}