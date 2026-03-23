const axios = require('axios');

class PaymentService {
    async createMobileMoneyPayment(amount, currency, phoneNumber, provider, metadata) {
        const flutterwaveUrl = 'https://api.flutterwave.com/v3/charges?type=mobile_money';
        const payload = {
            tx_ref: `sub-${Date.now()}`,
            amount,
            currency,
            network: provider.toUpperCase(),
            email: metadata.email,
            phone_number: phoneNumber,
            fullname: metadata.fullname,
            redirect_url: `${process.env.FRONTEND_URL}/subscription/verify`,
            meta: metadata
        };
        try {
            const response = await axios.post(flutterwaveUrl, payload, {
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            return { paymentLink: response.data.data.link, transactionRef: payload.tx_ref };
        } catch (err) {
            console.error('Flutterwave error:', err.response?.data || err.message);
            throw new Error('Erreur de création du paiement mobile money');
        }
    }

    async verifyMobileMoneyPayment(transactionRef) {
        const url = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${transactionRef}`;
        try {
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
            });
            if (response.data.status === 'success') {
                return { success: true, transactionId: response.data.data.id, status: response.data.data.status };
            }
            return { success: false, status: response.data.data.status };
        } catch (err) {
            console.error('Flutterwave verification error:', err.message);
            throw new Error('Erreur de vérification du paiement');
        }
    }
}

module.exports = new PaymentService();