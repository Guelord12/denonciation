import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { WebView } from 'react-native-webview';

export default function SubscribeScreen() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('airtel_money');
  const [phoneNumber, setPhoneNumber] = useState('');
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
        provider: paymentMethod,
      });
      setPaymentLink(response.data.paymentLink);
      setSubscriptionId(response.data.subscriptionId);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!subscriptionId) return;
    setLoading(true);
    try {
      const response = await api.post('/subscriptions/verify-mobile', {
        transactionRef: subscriptionId,
      });
      if (response.data.success) {
        setSuccess(true);
        Alert.alert('Succès', 'Abonnement activé !');
      } else {
        Alert.alert('Erreur', 'Paiement non confirmé');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Erreur de vérification');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.successTitle}>Abonnement réussi !</Text>
        <Text>Vous êtes maintenant premium.</Text>
      </View>
    );
  }

  if (paymentLink) {
    return (
      <WebView
        source={{ uri: paymentLink }}
        onNavigationStateChange={(navState) => {
          if (navState.url.includes('/subscription/verify')) {
            handleVerifyPayment();
          }
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Devenir premium</Text>
      <View style={styles.planSelector}>
        <TouchableOpacity
          style={[styles.planBtn, plan === 'monthly' && styles.activePlan]}
          onPress={() => setPlan('monthly')}
        >
          <Text>Mensuel - 5$</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.planBtn, plan === 'yearly' && styles.activePlan]}
          onPress={() => setPlan('yearly')}
        >
          <Text>Annuel - 50$</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.methodSelector}>
        <Text>Méthode de paiement :</Text>
        {['airtel_money', 'mpesa', 'orange_money', 'afrimoney'].map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.methodBtn, paymentMethod === m && styles.activeMethod]}
            onPress={() => setPaymentMethod(m)}
          >
            <Text>{m.replace('_', ' ').toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Numéro de téléphone"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <TouchableOpacity style={styles.submitBtn} onPress={handleCreateSubscription} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Souscrire</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#e63946' },
  planSelector: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  planBtn: { padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8, width: '45%', alignItems: 'center' },
  activePlan: { backgroundColor: '#e63946' },
  methodSelector: { marginBottom: 24 },
  methodBtn: { padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8, marginVertical: 4 },
  activeMethod: { backgroundColor: '#e63946' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 24 },
  submitBtn: { backgroundColor: '#e63946', padding: 12, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold' },
  successTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#28a745' },
});