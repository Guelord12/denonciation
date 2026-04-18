import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { Shield, Eye, EyeOff, User, Mail, Lock, Phone, MapPin, Calendar, Users, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register } = useAuthStore();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    city: '',
    nationality: '',
    birth_date: '',
    gender: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const handleRegister = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.username.length < 3) {
      Alert.alert('Erreur', 'Le nom d\'utilisateur doit contenir au moins 3 caractères');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    
    try {
      const { confirmPassword, ...dataToSend } = formData;
      
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key as keyof typeof dataToSend] === '') {
          delete dataToSend[key as keyof typeof dataToSend];
        }
      });
      
      await register(dataToSend);
      Alert.alert('Succès', 'Inscription réussie !');
      
      // ✅ Navigation correcte vers Login
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth', params: { screen: 'Login' } }],
        })
      );
    } catch (error: any) {
      console.error('Register error:', error);
      Alert.alert('Erreur', error.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData({ ...formData, birth_date: formattedDate });
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Shield color="#EF4444" size={48} />
          <Text style={styles.title}>Inscription</Text>
          <Text style={styles.subtitle}>Créez votre compte gratuitement</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom d'utilisateur <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <User color="#999" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                autoCapitalize="none"
                placeholder="johndoe"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                style={styles.input}
                value={formData.first_name}
                onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                placeholder="John"
                placeholderTextColor="#999"
              />
            </View>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                value={formData.last_name}
                onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                placeholder="Doe"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Mail color="#999" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="john@exemple.com"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputWrapper}>
              <Phone color="#999" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                placeholder="+243 XXX XXX XXX"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pays</Text>
            <View style={styles.inputWrapper}>
              <MapPin color="#999" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.country}
                onChangeText={(text) => setFormData({ ...formData, country: text })}
                placeholder="République Démocratique du Congo"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ville</Text>
            <View style={styles.inputWrapper}>
              <MapPin color="#999" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Kinshasa"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nationalité</Text>
            <View style={styles.inputWrapper}>
              <Users color="#999" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.nationality}
                onChangeText={(text) => setFormData({ ...formData, nationality: text })}
                placeholder="Congolais"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Date de naissance</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <View style={styles.inputWrapper}>
                  <Calendar color="#999" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: formData.birth_date ? '#1F2937' : '#999' }]}
                    value={formData.birth_date ? formatDateForDisplay(formData.birth_date) : ''}
                    placeholder="JJ/MM/AAAA"
                    placeholderTextColor="#999"
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Genre</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(true)}>
                <View style={styles.pickerButton}>
                  <Text style={[styles.pickerButtonText, !formData.gender && styles.pickerPlaceholderText]}>
                    {formData.gender || 'Sélectionner'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Lock color="#999" size={20} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff color="#999" size={20} /> : <Eye color="#999" size={20} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmer le mot de passe <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWrapper}>
              <Lock color="#999" size={20} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry={!showConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff color="#999" size={20} /> : <Eye color="#999" size={20} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerButtonText}>S'inscrire</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ?</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={formData.birth_date ? new Date(formData.birth_date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      <Modal transparent animationType="slide" visible={showGenderPicker} onRequestClose={() => setShowGenderPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir le genre</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={formData.gender}
              onValueChange={(itemValue) => {
                setFormData({ ...formData, gender: itemValue });
                setShowGenderPicker(false);
              }}
            >
              <Picker.Item label="Non spécifié" value="" />
              <Picker.Item label="Homme" value="Homme" />
              <Picker.Item label="Femme" value="Femme" />
              <Picker.Item label="Autre" value="Autre" />
            </Picker>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#EF4444', marginTop: 12 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 },
  form: { marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  required: { color: '#EF4444' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingLeft: 40, paddingVertical: 12, fontSize: 16, backgroundColor: '#FFF' },
  passwordInput: { paddingRight: 45 },
  eyeButton: { position: 'absolute', right: 12, top: 12 },
  row: { flexDirection: 'row', gap: 12 },
  halfWidth: { flex: 1 },
  pickerButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF' },
  pickerButtonText: { fontSize: 16, color: '#1F2937' },
  pickerPlaceholderText: { color: '#999' },
  registerButton: { backgroundColor: '#EF4444', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  registerButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#EF4444', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
});