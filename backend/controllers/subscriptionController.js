const Subscription = require('../models/Subscription');
const User = require('../models/User');
const paymentService = require('../services/paymentService');

class SubscriptionController {
    async createSubscription(req, res) {
        try {
            const { plan, paymentMethod, phoneNumber, provider } = req.body;
            const userId = req.user.id;
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

            // Définir le montant et la durée
            const plans = {
                monthly: { amount: 5, duration: 30 },
                yearly: { amount: 50, duration: 365 }
            };
            if (!plans[plan]) return res.status(400).json({ error: 'Plan invalide' });
            const amount = plans[plan].amount;
            const duration = plans[plan].duration;
            const expiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

            // Seules les méthodes mobile money sont supportées ici
            if (!['airtel_money', 'mpesa', 'orange_money', 'afrimoney'].includes(paymentMethod)) {
                return res.status(400).json({ error: 'Méthode de paiement non supportée' });
            }
            if (!phoneNumber) return res.status(400).json({ error: 'Numéro de téléphone requis' });

            const metadata = { userId, plan, amount, phoneNumber, email: user.email, fullname: `${user.prenom} ${user.nom}` };
            const { paymentLink, transactionRef } = await paymentService.createMobileMoneyPayment(amount, 'USD', phoneNumber, paymentMethod, metadata);

            const subscription = await Subscription.create({
                user_id: userId,
                plan,
                amount,
                currency: 'USD',
                payment_method: paymentMethod,
                transaction_id: transactionRef,
                expires_at: expiresAt
            });
            res.json({ paymentLink, subscriptionId: subscription.id });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erreur lors de la création de l\'abonnement' });
        }
    }

    async verifyMobilePayment(req, res) {
        try {
            const { transactionRef } = req.body;
            const verification = await paymentService.verifyMobileMoneyPayment(transactionRef);
            if (verification.success) {
                const subscription = await Subscription.findByTransactionId(transactionRef);
                if (subscription && subscription.status === 'pending') {
                    await Subscription.updateStatus(subscription.id, 'completed');
                    await User.update(subscription.user_id, { premium_expires_at: subscription.expires_at, is_premium: true });
                }
                res.json({ success: true });
            } else {
                res.json({ success: false, status: verification.status });
            }
        } catch (err) {
            res.status(500).json({ error: 'Erreur de vérification' });
        }
    }

    async getPremiumStatus(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId);
            const isPremium = user.is_premium && new Date(user.premium_expires_at) > new Date();
            res.json({ isPremium, expiresAt: user.premium_expires_at });
        } catch (err) {
            res.status(500).json({ error: 'Erreur' });
        }
    }
}

module.exports = new SubscriptionController();