import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!identifier) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await authService.forgotPassword(identifier);
      setMessage(t('auth.resetCodeSent'));
    } catch (err) {
      setError(err.response?.data?.error || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
      <Text style={styles.instructions}>{t('auth.forgotPasswordInstructions')}</Text>
      {message && <Text style={styles.success}>{message}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder={t('auth.emailOrUsername')}
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('auth.sendResetCode')}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>{t('auth.backToLogin')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#e63946' },
  instructions: { textAlign: 'center', marginBottom: 24, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { backgroundColor: '#e63946', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  success: { color: '#28a745', textAlign: 'center', marginBottom: 16 },
  error: { color: '#dc3545', textAlign: 'center', marginBottom: 16 },
  link: { textAlign: 'center', marginTop: 16, color: '#e63946' },
});