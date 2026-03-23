import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../services/api';

const Subscribe = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [plan, setPlan] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('airtel_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('airtel_money');
  const [paymentLink, setPaymentLink] = useState(null);
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCreateSubscription = async () => {
    setLoading(true);
    try {
      const response = await api.post('/subscriptions/create', {
        plan,
        paymentMethod,
        phoneNumber,
        provider
      });
      setPaymentLink(response.data.paymentLink);
      setSubscriptionId(response.data.subscriptionId);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!subscriptionId) return;
    setLoading(true);
    try {
      const response = await api.post('/subscriptions/verify-mobile', {
        transactionRef: subscriptionId
      });
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 3000);
      } else {
        alert('Paiement non confirmé. Veuillez réessayer.');
      }
    } catch (err) {
      alert('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="container">
          <h1>Abonnement réussi !</h1>
          <p>Vous êtes maintenant premium.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container">
        <h1>Devenir premium</h1>
        <div>
          <label>Plan :</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="monthly">Mensuel - 5$</option>
            <option value="yearly">Annuel - 50$</option>
          </select>
        </div>
        <div>
          <label>Méthode de paiement :</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="airtel_money">Airtel Money</option>
            <option value="mpesa">M-Pesa</option>
            <option value="orange_money">Orange Money</option>
            <option value="afrimoney">AfriMoney</option>
          </select>
        </div>
        <input
          type="tel"
          placeholder="Numéro de téléphone"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        {!paymentLink && (
          <button onClick={handleCreateSubscription} disabled={loading}>
            {loading ? 'Chargement...' : 'Souscrire'}
          </button>
        )}
        {paymentLink && (
          <div>
            <p>Vous allez être redirigé pour finaliser le paiement.</p>
            <a href={paymentLink} target="_blank" rel="noopener noreferrer">
              Payer avec {paymentMethod.replace('_', ' ')}
            </a>
            <p>Après paiement, revenez sur cette page et cliquez sur vérifier.</p>
            <button onClick={handleVerifyPayment} disabled={loading}>
              {loading ? 'Vérification...' : 'Vérifier le paiement'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Subscribe;