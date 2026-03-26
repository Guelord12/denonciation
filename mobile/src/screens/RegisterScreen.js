import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { getCurrentCity } from '../utils/geolocation';

// ==================== LISTES COMPLÈTES ====================
const countries = [
  "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola",
  "Antigua-et-Barbuda", "Arabie saoudite", "Argentine", "Arménie", "Australie", "Autriche",
  "Azerbaïdjan", "Bahamas", "Bahreïn", "Bangladesh", "Barbade", "Belgique", "Bélize", "Bénin",
  "Bhoutan", "Biélorussie", "Birmanie", "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil",
  "Brunéi", "Bulgarie", "Burkina Faso", "Burundi", "Cambodge", "Cameroun", "Canada",
  "Cap-Vert", "Chili", "Chine", "Chypre", "Colombie", "Comores", "Congo", "Corée du Nord",
  "Corée du Sud", "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", "Danemark", "Djibouti",
  "Dominique", "Égypte", "Émirats arabes unis", "Équateur", "Érythrée", "Espagne", "Estonie",
  "Eswatini", "États-Unis", "Éthiopie", "Fidji", "Finlande", "France", "Gabon", "Gambie",
  "Géorgie", "Ghana", "Grèce", "Grenade", "Guatemala", "Guinée", "Guinée-Bissau", "Guinée équatoriale",
  "Guyana", "Haïti", "Honduras", "Hongrie", "Inde", "Indonésie", "Irak", "Iran", "Irlande",
  "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Jordanie", "Kazakhstan", "Kenya",
  "Kirghizistan", "Kiribati", "Koweït", "Laos", "Lesotho", "Lettonie", "Liban", "Liberia",
  "Libye", "Liechtenstein", "Lituanie", "Luxembourg", "Macédoine du Nord", "Madagascar",
  "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Marshall", "Maurice",
  "Mauritanie", "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie", "Monténégro",
  "Mozambique", "Namibie", "Nauru", "Népal", "Nicaragua", "Niger", "Nigeria", "Norvège",
  "Nouvelle-Zélande", "Oman", "Ouganda", "Ouzbékistan", "Pakistan", "Palaos", "Panama",
  "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", "Pérou", "Philippines", "Pologne",
  "Portugal", "Qatar", "République centrafricaine", "République démocratique du Congo",
  "République dominicaine", "République tchèque", "Roumanie", "Royaume-Uni", "Russie",
  "Rwanda", "Saint-Christophe-et-Niévès", "Sainte-Lucie", "Saint-Marin", "Saint-Vincent-et-les-Grenadines",
  "Salomon", "Salvador", "Samoa", "Sao Tomé-et-Principe", "Sénégal", "Serbie", "Seychelles",
  "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie", "Soudan", "Soudan du Sud",
  "Sri Lanka", "Suède", "Suisse", "Suriname", "Syrie", "Tadjikistan", "Tanzanie", "Tchad",
  "Thaïlande", "Timor oriental", "Togo", "Tonga", "Trinité-et-Tobago", "Tunisie",
  "Turkménistan", "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu", "Vatican",
  "Venezuela", "Vietnam", "Yémen", "Zambie", "Zimbabwe"
];

const nationalities = [
  "Afghane", "Sud-africaine", "Albanaise", "Algérienne", "Allemande", "Andorrane", "Angolaise",
  "Antiguaise", "Saoudienne", "Argentine", "Arménienne", "Australienne", "Autrichienne",
  "Azerbaïdjanaise", "Bahaméenne", "Bahreïnie", "Bangladaise", "Barbadienne", "Belge",
  "Bélizienne", "Béninoise", "Bhoutanaise", "Biélorusse", "Birmane", "Bolivienne",
  "Bosnienne", "Botswanaise", "Brésilienne", "Brunéienne", "Bulgare", "Burkinabé",
  "Burundaise", "Cambodgienne", "Camerounaise", "Canadienne", "Cap-verdienne", "Chilienne",
  "Chinoise", "Chypriote", "Colombienne", "Comorienne", "Congolaise", "Nord-coréenne",
  "Sud-coréenne", "Costaricienne", "Ivoirienne", "Croate", "Cubaine", "Danoise", "Djiboutienne",
  "Dominiquaise", "Égyptienne", "Émirienne", "Équatorienne", "Érythréenne", "Espagnole",
  "Estonienne", "Eswatinienne", "Américaine", "Éthiopienne", "Fidjienne", "Finlandaise",
  "Française", "Gabonaise", "Gambienne", "Géorgienne", "Ghanéenne", "Grecque", "Grenadienne",
  "Guatémaltèque", "Guinéenne", "Bissau-guinéenne", "Équatoguinéenne", "Guyanienne",
  "Haïtienne", "Hondurienne", "Hongroise", "Indienne", "Indonésienne", "Irakienne",
  "Iranienne", "Irlandaise", "Islandaise", "Israélienne", "Italienne", "Jamaïcaine",
  "Japonaise", "Jordanienne", "Kazakhstanaise", "Kényane", "Kirghize", "Kiribatienne",
  "Koweïtienne", "Laotienne", "Lesothane", "Lettonne", "Libanaise", "Libérienne",
  "Libyenne", "Liechtensteinoise", "Lituanienne", "Luxembourgeoise", "Macédonienne",
  "Malgache", "Malaisienne", "Malawite", "Maldivienne", "Malienne", "Maltaise", "Marocaine",
  "Marshallaise", "Mauricienne", "Mauritanienne", "Mexicaine", "Micronésienne", "Moldave",
  "Monégasque", "Mongole", "Monténégrine", "Mozambicaine", "Namibienne", "Nauruane",
  "Népalaise", "Nicaraguayenne", "Nigerienne", "Nigériane", "Norvégienne", "Néo-zélandaise",
  "Omanaise", "Ougandaise", "Ouzbèke", "Pakistanaise", "Palauane", "Panaméenne",
  "Papouasienne", "Paraguayenne", "Néerlandaise", "Péruvienne", "Philippine", "Polonaise",
  "Portugaise", "Qatarienne", "Centrafricaine", "R.D.Congolaise", "Dominicaine", "Tchèque",
  "Roumaine", "Britannique", "Russe", "Rwandaise", "Christophienne", "Lucilienne",
  "Saint-marinaise", "Vincentaise", "Salomonaise", "Salvadorienne", "Samoane",
  "Santoméenne", "Sénégalaise", "Serbe", "Seychelloise", "Sierra-léonaise", "Singapourienne",
  "Slovaque", "Slovène", "Somalienne", "Soudanaise", "Sud-soudanaise", "Sri-lankaise",
  "Suédoise", "Suisse", "Surinamaise", "Syrienne", "Tadjike", "Tanzanienne", "Tchadienne",
  "Thaïlandaise", "Timoraise", "Togolaise", "Tonguienne", "Trinidadienne", "Tunisienne",
  "Turkmène", "Turque", "Tuvaluane", "Ukrainienne", "Uruguayenne", "Vanuatuane", "Vaticane",
  "Vénézuélienne", "Vietnamienne", "Yéménite", "Zambienne", "Zimbabwéenne"
];

const phoneCodes = [
  "+1", "+7", "+20", "+27", "+30", "+31", "+32", "+33", "+34", "+36", "+39", "+40",
  "+41", "+44", "+45", "+46", "+47", "+48", "+49", "+51", "+52", "+53", "+54", "+55",
  "+56", "+57", "+58", "+60", "+61", "+62", "+63", "+64", "+65", "+66", "+81", "+82",
  "+84", "+86", "+90", "+91", "+92", "+93", "+94", "+95", "+98", "+211", "+212", "+213",
  "+214", "+216", "+218", "+220", "+221", "+222", "+223", "+224", "+225", "+226", "+227",
  "+228", "+229", "+230", "+231", "+232", "+233", "+234", "+235", "+236", "+237", "+238",
  "+239", "+240", "+241", "+242", "+243", "+244", "+245", "+246", "+247", "+248", "+249",
  "+250", "+251", "+252", "+253", "+254", "+255", "+256", "+257", "+258", "+260", "+261",
  "+262", "+263", "+264", "+265", "+266", "+267", "+268", "+269", "+290", "+291", "+297",
  "+298", "+299", "+350", "+351", "+352", "+353", "+354", "+355", "+356", "+357", "+358",
  "+359", "+370", "+371", "+372", "+373", "+374", "+375", "+376", "+377", "+378", "+379",
  "+380", "+381", "+382", "+383", "+385", "+386", "+387", "+389", "+420", "+421", "+423",
  "+500", "+501", "+502", "+503", "+504", "+505", "+506", "+507", "+508", "+509", "+590",
  "+591", "+592", "+593", "+594", "+595", "+596", "+597", "+598", "+599", "+670", "+672",
  "+673", "+674", "+675", "+676", "+677", "+678", "+679", "+680", "+681", "+682", "+683",
  "+685", "+686", "+687", "+688", "+689", "+690", "+691", "+692", "+850", "+852", "+853",
  "+855", "+856", "+880", "+886", "+960", "+961", "+962", "+963", "+964", "+965", "+966",
  "+967", "+968", "+970", "+971", "+972", "+973", "+974", "+975", "+976", "+977", "+992",
  "+993", "+994", "+995", "+996", "+998"
];

// Composant Input avec label flottant
const FloatingLabelInput = ({ label, value, onChangeText, secureTextEntry, keyboardType, error, ...props }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.trim() !== '';
  const isActive = focused || hasValue;

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        {...props}
      />
      <Text style={[styles.floatingLabel, isActive && styles.floatingLabelActive]}>
        {label}
      </Text>
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
};

// Composant Select avec label flottant
const FloatingSelect = ({ label, selectedValue, onValueChange, items, error }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = selectedValue && selectedValue !== '';
  const isActive = focused || hasValue;

  return (
    <View style={styles.inputContainer}>
      <View style={[styles.pickerWrapper, error && styles.inputError]}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.picker}
        >
          <Picker.Item label="" value="" />
          {items.map(item => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>
      <Text style={[styles.floatingLabel, isActive && styles.floatingLabelActive]}>
        {label}
      </Text>
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
};

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    avatar: '',
    prenom: '',
    nom: '',
    username: '',
    date_naissance: '',
    pays_residence: '',
    ville_residence: '',
    nationalite: '',
    indicatif_telephone: '+243',
    telephone: '',
    email: '',
    mot_de_passe: '',
    confirmation_mdp: '',
    acceptRules: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    getCurrentCity().then(city => {
      if (city !== 'Inconnu') {
        setFormData(prev => ({ ...prev, ville_residence: city }));
      }
    }).catch(() => {});
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est requis';
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
    if (!formData.username.trim()) newErrors.username = t('auth.usernameRequired');
    if (!formData.date_naissance) newErrors.date_naissance = t('register.birthDate');
    if (!formData.pays_residence) newErrors.pays_residence = t('register.country');
    if (!formData.ville_residence.trim()) newErrors.ville_residence = t('register.city');
    if (!formData.nationalite) newErrors.nationalite = t('register.nationality');
    if (!formData.telephone.trim()) newErrors.telephone = t('register.phone');
    if (!formData.email.trim()) newErrors.email = t('register.email');
    if (!formData.email.includes('@')) newErrors.email = 'Email invalide';
    if (!formData.mot_de_passe) newErrors.mot_de_passe = t('auth.passwordRequired');
    if (formData.mot_de_passe.length < 6) newErrors.mot_de_passe = t('auth.passwordMinLength');
    if (!formData.confirmation_mdp) newErrors.confirmation_mdp = t('auth.confirmPassword');
    if (formData.mot_de_passe !== formData.confirmation_mdp) newErrors.confirmation_mdp = t('auth.passwordsDoNotMatch');
    if (!formData.acceptRules) newErrors.acceptRules = t('auth.acceptRulesRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    setErrors({});
    setApiError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      await api.post('/auth/register', formData);
      Alert.alert('Succès', 'Inscription réussie. Connectez-vous maintenant.');
      // Redirection vers l'écran de connexion
      navigation.navigate('Login');
    } catch (err) {
      console.log('Erreur inscription:', err);
      if (err.response) {
        const data = err.response.data;
        if (typeof data === 'string') {
          setApiError(data);
        } else if (data.error) {
          setApiError(data.error);
        } else {
          setApiError(`Erreur ${err.response.status}: ${JSON.stringify(data)}`);
        }
      } else if (err.request) {
        setApiError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      } else {
        setApiError(t('errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const countryItems = countries.map(c => ({ value: c, label: c }));
  const nationalityItems = nationalities.map(n => ({ value: n, label: n }));
  const phoneCodeItems = phoneCodes.map(code => ({ value: code, label: code }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          <Text style={styles.title}>{t('register.title')}</Text>

          {apiError && <Text style={styles.apiError}>{apiError}</Text>}

          <FloatingLabelInput
            label="Prénom *"
            value={formData.prenom}
            onChangeText={text => handleChange('prenom', text)}
            error={errors.prenom}
          />

          <FloatingLabelInput
            label="Nom *"
            value={formData.nom}
            onChangeText={text => handleChange('nom', text)}
            error={errors.nom}
          />

          <FloatingLabelInput
            label="Nom d'utilisateur *"
            value={formData.username}
            onChangeText={text => handleChange('username', text)}
            error={errors.username}
          />

          <FloatingLabelInput
            label="Date de naissance *"
            placeholder="YYYY-MM-DD"
            value={formData.date_naissance}
            onChangeText={text => handleChange('date_naissance', text)}
            error={errors.date_naissance}
          />
          <Text style={styles.ageWarning}>{t('register.ageWarning')}</Text>

          <FloatingSelect
            label="Pays de résidence *"
            selectedValue={formData.pays_residence}
            onValueChange={value => handleChange('pays_residence', value)}
            items={countryItems}
            error={errors.pays_residence}
          />

          <FloatingLabelInput
            label="Ville de résidence *"
            value={formData.ville_residence}
            onChangeText={text => handleChange('ville_residence', text)}
            error={errors.ville_residence}
          />

          <FloatingSelect
            label="Nationalité *"
            selectedValue={formData.nationalite}
            onValueChange={value => handleChange('nationalite', value)}
            items={nationalityItems}
            error={errors.nationalite}
          />

          <View style={styles.phoneRow}>
            <View style={styles.codePicker}>
              <Picker
                selectedValue={formData.indicatif_telephone}
                onValueChange={value => handleChange('indicatif_telephone', value)}
                style={styles.pickerSmall}
              >
                {phoneCodeItems.map(item => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>
            <View style={styles.phoneInput}>
              <FloatingLabelInput
                label="Numéro *"
                value={formData.telephone}
                onChangeText={text => handleChange('telephone', text)}
                keyboardType="phone-pad"
                error={errors.telephone}
              />
            </View>
          </View>

          <FloatingLabelInput
            label="Email *"
            value={formData.email}
            onChangeText={text => handleChange('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <View style={styles.passwordContainer}>
            <FloatingLabelInput
              label="Mot de passe *"
              value={formData.mot_de_passe}
              onChangeText={text => handleChange('mot_de_passe', text)}
              secureTextEntry={!showPassword}
              error={errors.mot_de_passe}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eye}>
              <Text>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <FloatingLabelInput
              label="Confirmer le mot de passe *"
              value={formData.confirmation_mdp}
              onChangeText={text => handleChange('confirmation_mdp', text)}
              secureTextEntry={!showConfirm}
              error={errors.confirmation_mdp}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eye}>
              <Text>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => handleChange('acceptRules', !formData.acceptRules)}
          >
            <View style={[styles.checkbox, formData.acceptRules && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>
              {t('auth.acceptRules')}{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Terms')}>
                {t('auth.readTerms')}
              </Text>
            </Text>
          </TouchableOpacity>
          {errors.acceptRules && <Text style={styles.fieldError}>{errors.acceptRules}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('register.registerBtn')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>{t('auth.haveAccount')} {t('nav.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  form: { marginHorizontal: 20, padding: 20, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#e63946' },
  inputContainer: { marginBottom: 16, position: 'relative' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 12, fontSize: 16, backgroundColor: '#fff' },
  inputError: { borderColor: '#dc3545' },
  floatingLabel: { position: 'absolute', left: 12, top: 12, fontSize: 16, color: '#666', backgroundColor: '#fff', paddingHorizontal: 4 },
  floatingLabelActive: { top: -8, fontSize: 12, color: '#e63946' },
  fieldError: { color: '#dc3545', fontSize: 12, marginTop: 4, marginLeft: 4 },
  apiError: { color: '#dc3545', marginBottom: 12, textAlign: 'center' },
  ageWarning: { fontSize: 12, color: '#666', marginBottom: 8, marginTop: -8 },
  pickerWrapper: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', height: 48, justifyContent: 'center' },
  picker: { height: 48 },
  pickerSmall: { height: 48, width: 100 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  codePicker: { width: 100, marginRight: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
  phoneInput: { flex: 1 },
  passwordContainer: { position: 'relative', marginBottom: 16 },
  eye: { position: 'absolute', right: 12, top: 12, zIndex: 1 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#ddd', borderRadius: 4, marginRight: 8 },
  checkboxChecked: { backgroundColor: '#e63946', borderColor: '#e63946' },
  checkboxLabel: { fontSize: 14, color: '#333', flex: 1 },
  link: { color: '#e63946', textDecorationLine: 'underline' },
  button: { backgroundColor: '#e63946', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});