// Utilisez Twilio ou un autre service. Exemple avec simulation.
async function sendSms(phoneNumber, message) {
    console.log(`[SMS] Envoi à ${phoneNumber} : ${message}`);
    // Intégration Twilio :
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: phoneNumber });
    return true;
}

module.exports = { sendSms };