import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from 'react-query';
import { api } from '../services/api';
import { Lock, Eye, EyeOff, Save, X } from 'lucide-react-native';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const changePasswordMutation = useMutation(
    (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    {
      onSuccess: () => {
        Alert.alert('Succès', 'Mot de passe modifié avec succès', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      },
      onError: (error: any) => {
        Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors du changement');
      },
    }
  );

  const handleSubmit = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }

    if (formData.newPassword.length < 8) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="#1F2937" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Changer le mot de passe</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={changePasswordMutation.isLoading}
        >
          {changePasswordMutation.isLoading ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Save color="#EF4444" size={24} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mot de passe actuel</Text>
          <View style={styles.inputWrapper}>
            <Lock color="#999" size={20} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={formData.currentPassword}
              onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
              secureTextEntry={!showPasswords.current}
              placeholder="••••••••"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => togglePasswordVisibility('current')}
            >
              {showPasswords.current ? (
                <EyeOff color="#999" size={20} />
              ) : (
                <Eye color="#999" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nouveau mot de passe</Text>
          <View style={styles.inputWrapper}>
            <Lock color="#999" size={20} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={formData.newPassword}
              onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
              secureTextEntry={!showPasswords.new}
              placeholder="••••••••"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => togglePasswordVisibility('new')}
            >
              {showPasswords.new ? (
                <EyeOff color="#999" size={20} />
              ) : (
                <Eye color="#999" size={20} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.passwordHint}>
            Minimum 8 caractères, une majuscule, une minuscule et un chiffre
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <View style={styles.inputWrapper}>
            <Lock color="#999" size={20} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry={!showPasswords.confirm}
              placeholder="••••••••"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => togglePasswordVisibility('confirm')}
            >
              {showPasswords.confirm ? (
                <EyeOff color="#999" size={20} />
              ) : (
                <Eye color="#999" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingLeft: 40,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  passwordHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
});