const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendResetCode(email, code) {
    const mailOptions = {
        from: `"Dénonciation" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
            <h1>Réinitialisation de mot de passe</h1>
            <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
            <p>Voici votre code de vérification : <strong>${code}</strong></p>
            <p>Ce code est valable 15 minutes.</p>
            <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        `,
    };
    await transporter.sendMail(mailOptions);
}

module.exports = { sendResetCode };