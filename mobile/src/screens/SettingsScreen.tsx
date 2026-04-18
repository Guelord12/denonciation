import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Bell,
  Moon,
  Globe,
  Lock,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Mail,
  MessageCircle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Langues disponibles
const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
  { code: 'ln', name: 'Lingala', flag: '🇨🇩' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { logout } = useAuthStore();
  const { darkMode, toggleDarkMode, notificationsEnabled, toggleNotifications, language, setLanguage } = useAppStore();
  
  // États pour les modals
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Formulaire changement de mot de passe
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deletePassword, setDeletePassword] = useState('');

  // Mutation pour changer le mot de passe
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      Alert.alert('Succès', 'Mot de passe modifié avec succès');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors du changement de mot de passe');
    },
  });

  // Mutation pour supprimer le compte
  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) =>
      api.delete('/users/account', { data: { password } }),
    onSuccess: () => {
      Alert.alert('Compte supprimé', 'Votre compte a été supprimé avec succès');
      setShowDeleteModal(false);
      logout();
    },
    onError: (error: any) => {
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de la suppression');
    },
  });

  const handleChangePassword = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
      return;
    }
    deleteAccountMutation.mutate(deletePassword);
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@denonciation.com');
  };

  const handleFAQ = () => {
    navigation.navigate('Information' as never);
  };

  const handlePrivacy = () => {
    // Naviguer vers la page de confidentialité ou ouvrir un lien
    Alert.alert('Confidentialité', 'Consultez notre politique de confidentialité sur notre site web.');
  };

  const getLanguageName = (code: string) => {
    return LANGUAGES.find(l => l.code === code)?.name || 'Français';
  };

  const getLanguageFlag = (code: string) => {
    return LANGUAGES.find(l => l.code === code)?.flag || '🇫🇷';
  };

  return (
    <ScrollView style={[styles.container, darkMode && styles.containerDark]}>
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Paramètres</Text>
      </View>

      {/* Section Préférences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Préférences</Text>
        <View style={[styles.sectionContent, darkMode && styles.sectionContentDark]}>
          {/* Notifications */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Bell color={darkMode ? '#FFF' : '#666'} size={20} />
              <Text style={[styles.menuItemLabel, darkMode && styles.textDark]}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#DDD', true: '#EF4444' }}
              thumbColor="#FFF"
            />
          </View>

          {/* Mode sombre */}
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuItemLeft}>
              <Moon color={darkMode ? '#FFF' : '#666'} size={20} />
              <Text style={[styles.menuItemLabel, darkMode && styles.textDark]}>Mode sombre</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#DDD', true: '#EF4444' }}
              thumbColor="#FFF"
            />
          </View>
        </View>
      </View>

      {/* Section Langue */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Langue</Text>
        <TouchableOpacity 
          style={[styles.sectionContent, darkMode && styles.sectionContentDark]}
          onPress={() => setShowLanguageModal(true)}
        >
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Globe color={darkMode ? '#FFF' : '#666'} size={20} />
              <Text style={[styles.menuItemLabel, darkMode && styles.textDark]}>Langue de l'application</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Text style={[styles.menuItemValue, darkMode && styles.textDark]}>
                {getLanguageFlag(language)} {getLanguageName(language)}
              </Text>
              <ChevronRight color="#CCC" size={20} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Section Sécurité */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Sécurité</Text>
        <View style={[styles.sectionContent, darkMode && styles.sectionContentDark]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordModal(true)}>
            <View style={styles.menuItemLeft}>
              <Lock color={darkMode ? '#FFF' : '#666'} size={20} />
              <Text style={[styles.menuItemLabel, darkMode && styles.textDark]}>Changer le mot de passe</Text>
            </View>
            <ChevronRight color="#CCC" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handlePrivacy}>
            <View style={styles.menuItemLeft}>
              <Shield color={darkMode ? '#FFF' : '#666'} size={20} />
              <Text style={[styles.menuItemLabel, darkMode && styles.textDark]}>Confidentialité</Text>
            </View>
            <ChevronRight color="#CCC" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Support */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Support</Text>
        <View style={[styles.sectionContent, darkMode && styles.sectionContentDark]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleFAQ}>
            <View style={styles.menuItemLeft}>
              <HelpCircle color={darkMode ? '#FFF' : '#666'} size={20} />
              <Text style={[styles.menuItemLabel, darkMode && styles.textDark]}>Aide et FAQ</Text>
            </View>
            <ChevronRight color="#CCC" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleContactSupport}>
            <View style={styles.menuItemLeft}>
              <MessageCircle color={darkMode ? '#FFF' : '#666'} size={20} />
              <Text style={[styles.menuItemLabel, darkMode && styles.textDark]}>Contacter le support</Text>
            </View>
            <ChevronRight color="#CCC" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuItemLeft}>
              <Info color={darkMode ? '#FFF' : '#666'} size={20} />
              <Text style={[styles.menuItemLabel, darkMode && styles.textDark]}>À propos</Text>
            </View>
            <ChevronRight color="#CCC" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Déconnexion et Suppression */}
      <View style={styles.dangerSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#EF4444" size={20} />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)}>
          <Trash2 color="#EF4444" size={20} />
          <Text style={styles.deleteText}>Supprimer le compte</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, darkMode && styles.versionDark]}>Version 1.0.0</Text>

      {/* Modal Langue */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, darkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, darkMode && styles.textDark]}>Choisir une langue</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => {
                  setLanguage(lang.code);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[styles.languageFlag]}>{lang.flag}</Text>
                <Text style={[
                  styles.languageName,
                  darkMode && styles.textDark,
                  language === lang.code && styles.languageNameActive,
                ]}>
                  {lang.name}
                </Text>
                {language === lang.code && (
                  <View style={styles.languageCheck} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Changement de mot de passe */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, darkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, darkMode && styles.textDark]}>Changer le mot de passe</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, darkMode && styles.textDark]}>Mot de passe actuel</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark]}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={darkMode ? '#666' : '#999'}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff color="#999" size={20} /> : <Eye color="#999" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, darkMode && styles.textDark]}>Nouveau mot de passe</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark]}
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                  secureTextEntry={!showNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={darkMode ? '#666' : '#999'}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff color="#999" size={20} /> : <Eye color="#999" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, darkMode && styles.textDark]}>Confirmer le mot de passe</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark]}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={darkMode ? '#666' : '#999'}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff color="#999" size={20} /> : <Eye color="#999" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.passwordHint}>
              Minimum 8 caractères, une majuscule, une minuscule et un chiffre
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleChangePassword}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Suppression de compte */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, darkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Supprimer le compte</Text>
            <Text style={[styles.modalSubtitle, darkMode && styles.textDark]}>
              Cette action est irréversible. Toutes vos données seront définitivement supprimées.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, darkMode && styles.textDark]}>Mot de passe</Text>
              <TextInput
                style={[styles.input, darkMode && styles.inputDark]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                placeholder="Votre mot de passe"
                placeholderTextColor={darkMode ? '#666' : '#999'}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, styles.modalDeleteButton]}
                onPress={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending}
              >
                {deleteAccountMutation.isPending ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Supprimer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerDark: {
    backgroundColor: '#1F2937',
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  textDark: {
    color: '#F9FAFB',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  sectionContentDark: {
    backgroundColor: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemValue: {
    fontSize: 14,
    color: '#666',
  },
  dangerSection: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
    gap: 8,
  },
  deleteText: {
    fontSize: 16,
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 30,
    marginBottom: 40,
  },
  versionDark: {
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalContentDark: {
    backgroundColor: '#1F2937',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  languageOptionActive: {
    backgroundColor: '#FEE2E2',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  languageNameActive: {
    color: '#EF4444',
    fontWeight: '600',
  },
  languageCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    flex: 1,
  },
  inputDark: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
    color: '#FFF',
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  passwordHint: {
    fontSize: 12,
    color: '#999',
    marginTop: -8,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  modalDeleteButton: {
    backgroundColor: '#DC2626',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});