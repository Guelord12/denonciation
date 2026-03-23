import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth';
import { getCurrentCity } from '../utils/geolocation';

const countries = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola',
  'Arabie Saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan',
  'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Bénin', 'Bhoutan',
  'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana', 'Brésil',
  'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge', 'Cameroun', 'Canada',
  'Cap-Vert', 'Centrafrique', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
  'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', 'Côte d\'Ivoire', 'Croatie',
  'Cuba', 'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats Arabes Unis',
  'Équateur', 'Érythrée', 'Espagne', 'Estonie', 'Eswatini', 'États-Unis', 'Éthiopie',
  'Fidji', 'Finlande', 'France', 'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce',
  'Grenade', 'Guatemala', 'Guinée', 'Guinée-Bissau', 'Guinée équatoriale', 'Guyana',
  'Haïti', 'Honduras', 'Hongrie', 'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande',
  'Islande', 'Israël', 'Italie', 'Jamaïque', 'Japon', 'Jordanie', 'Kazakhstan',
  'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït', 'Laos', 'Lesotho', 'Lettonie',
  'Liban', 'Liberia', 'Libye', 'Liechtenstein', 'Lituanie', 'Luxembourg', 'Macédoine',
  'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte', 'Maroc',
  'Maurice', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie', 'Monaco', 'Mongolie',
  'Monténégro', 'Mozambique', 'Namibie', 'Nauru', 'Népal', 'Nicaragua', 'Niger',
  'Nigéria', 'Norvège', 'Nouvelle-Zélande', 'Oman', 'Ouganda', 'Ouzbékistan',
  'Pakistan', 'Palaos', 'Panama', 'Papouasie-Nouvelle-Guinée', 'Paraguay', 'Pays-Bas',
  'Pérou', 'Philippines', 'Pologne', 'Portugal', 'Qatar', 'RDC', 'République dominicaine',
  'République tchèque', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda', 'Saint-Christophe',
  'Sainte-Lucie', 'Salomon', 'Salvador', 'Samoa', 'Saint-Marin', 'Sao Tomé', 'Sénégal',
  'Serbie', 'Seychelles', 'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie',
  'Somalie', 'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède', 'Suisse', 'Suriname',
  'Syrie', 'Tadjikistan', 'Tanzanie', 'Tchad', 'Thaïlande', 'Timor oriental', 'Togo',
  'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turkménistan', 'Turquie', 'Tuvalu',
  'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela', 'Vietnam', 'Yémen',
  'Zambie', 'Zimbabwe'
];

const nationalities = [
  'Afghane', 'Sud-africaine', 'Albanaise', 'Algérienne', 'Allemande', 'Andorrane',
  'Angolaise', 'Saoudienne', 'Argentine', 'Arménienne', 'Australienne', 'Autrichienne',
  'Azerbaïdjanaise', 'Bahaméenne', 'Bahreïnie', 'Bangladaise', 'Barbadienne', 'Belge',
  'Béninoise', 'Bhoutanaise', 'Biélorusse', 'Birmane', 'Bolivienne', 'Bosnienne',
  'Botswanaise', 'Brésilienne', 'Brunéienne', 'Bulgare', 'Burkinabé', 'Burundaise',
  'Cambodgienne', 'Camerounaise', 'Canadienne', 'Cap-verdienne', 'Centrafricaine',
  'Chilienne', 'Chinoise', 'Chypriote', 'Colombienne', 'Comorienne', 'Congolaise',
  'Nord-coréenne', 'Sud-coréenne', 'Costaricienne', 'Ivoirienne', 'Croate', 'Cubaine',
  'Danoise', 'Djiboutienne', 'Dominiquaise', 'Égyptienne', 'Émirienne', 'Équatorienne',
  'Érythréenne', 'Espagnole', 'Estonienne', 'Eswatinienne', 'Américaine', 'Éthiopienne',
  'Fidjienne', 'Finlandaise', 'Française', 'Gabonaise', 'Gambienne', 'Géorgienne',
  'Ghanéenne', 'Grecque', 'Grenadienne', 'Guatémaltèque', 'Guinéenne', 'Bissau-guinéenne',
  'Équatoguinéenne', 'Guyanienne', 'Haïtienne', 'Hondurienne', 'Hongroise', 'Indienne',
  'Indonésienne', 'Irakienne', 'Iranienne', 'Irlandaise', 'Islandaise', 'Israélienne',
  'Italienne', 'Jamaïcaine', 'Japonaise', 'Jordanienne', 'Kazakhstanaise', 'Kényane',
  'Kirghize', 'Kiribatienne', 'Koweïtienne', 'Laotienne', 'Lesothane', 'Lettonne',
  'Libanaise', 'Libérienne', 'Libyenne', 'Liechtensteinoise', 'Lituanienne', 'Luxembourgeoise',
  'Macédonienne', 'Malgache', 'Malaisienne', 'Malawite', 'Maldivienne', 'Malienne',
  'Maltaise', 'Marocaine', 'Mauricienne', 'Mauritanienne', 'Mexicaine', 'Micronésienne',
  'Moldave', 'Monégasque', 'Mongole', 'Monténégrine', 'Mozambicaine', 'Namibienne',
  'Nauruane', 'Népalaise', 'Nicaraguayenne', 'Nigerienne', 'Nigériane', 'Norvégienne',
  'Néo-zélandaise', 'Omanaise', 'Ougandaise', 'Ouzbèke', 'Pakistanaise', 'Palauane',
  'Panaméenne', 'Papouasienne', 'Paraguayenne', 'Néerlandaise', 'Péruvienne', 'Philippine',
  'Polonaise', 'Portugaise', 'Qatarienne', 'RDC', 'Dominicaine', 'Tchèque', 'Roumaine',
  'Britannique', 'Russe', 'Rwandaise', 'Christophienne', 'Lucilienne', 'Salomonaise',
  'Salvadorienne', 'Samoane', 'Saint-marinaise', 'Santoméenne', 'Sénégalaise', 'Serbe',
  'Seychelloise', 'Sierra-léonaise', 'Singapourienne', 'Slovaque', 'Slovène',
  'Somalienne', 'Soudanaise', 'Sud-soudanaise', 'Sri-lankaise', 'Suédoise', 'Suisse',
  'Surinamaise', 'Syrienne', 'Tadjike', 'Tanzanienne', 'Tchadienne', 'Thaïlandaise',
  'Timoraise', 'Togolaise', 'Tonguienne', 'Trinidadienne', 'Tunisienne', 'Turkmène',
  'Turque', 'Tuvaluane', 'Ukrainienne', 'Uruguayenne', 'Vanuatuane', 'Vaticane',
  'Vénézuélienne', 'Vietnamienne', 'Yéménite', 'Zambienne', 'Zimbabwéenne'
];

const phoneCodes = [
  '+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36', '+39', '+40',
  '+41', '+44', '+45', '+46', '+47', '+48', '+49', '+51', '+52', '+53', '+54', '+55',
  '+56', '+57', '+58', '+60', '+61', '+62', '+63', '+64', '+65', '+66', '+81', '+82',
  '+84', '+86', '+90', '+91', '+92', '+93', '+94', '+95', '+98', '+211', '+212', '+213',
  '+214', '+216', '+218', '+220', '+221', '+222', '+223', '+224', '+225', '+226', '+227',
  '+228', '+229', '+230', '+231', '+232', '+233', '+234', '+235', '+236', '+237', '+238',
  '+239', '+240', '+241', '+242', '+243', '+244', '+245', '+246', '+247', '+248', '+249',
  '+250', '+251', '+252', '+253', '+254', '+255', '+256', '+257', '+258', '+260', '+261',
  '+262', '+263', '+264', '+265', '+266', '+267', '+268', '+269', '+290', '+291', '+297',
  '+298', '+299', '+350', '+351', '+352', '+353', '+354', '+355', '+356', '+357', '+358',
  '+359', '+370', '+371', '+372', '+373', '+374', '+375', '+376', '+377', '+378', '+379',
  '+380', '+381', '+382', '+383', '+385', '+386', '+387', '+389', '+420', '+421', '+423',
  '+500', '+501', '+502', '+503', '+504', '+505', '+506', '+507', '+508', '+509', '+590',
  '+591', '+592', '+593', '+594', '+595', '+596', '+597', '+598', '+599', '+670', '+672',
  '+673', '+674', '+675', '+676', '+677', '+678', '+679', '+680', '+681', '+682', '+683',
  '+685', '+686', '+687', '+688', '+689', '+690', '+691', '+692', '+850', '+852', '+853',
  '+855', '+856', '+880', '+886', '+960', '+961', '+962', '+963', '+964', '+965', '+966',
  '+967', '+968', '+970', '+971', '+972', '+973', '+974', '+975', '+976', '+977', '+992',
  '+993', '+994', '+995', '+996', '+998'
];

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    avatar: '', nom: '', prenom: '', username: '', date_naissance: '',
    pays_residence: '', ville_residence: '', nationalite: '',
    indicatif_telephone: '+243', telephone: '', email: '',
    mot_de_passe: '', confirmation_mdp: '', acceptRules: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    getCurrentCity().then(city => {
      if (city !== 'Inconnu') setFormData(prev => ({ ...prev, ville_residence: city }));
    }).catch(() => {});
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est requis';
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setApiError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      await authService.register(formData);
      navigate('/login');
    } catch (err) {
      setApiError(err.response?.data?.error || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit} className="register-form">
        <h1>{t('register.title')}</h1>
        {apiError && <div className="error-message">⚠️ {apiError}</div>}
        <input type="text" name="nom" placeholder={t('register.lastName')} value={formData.nom} onChange={handleChange} className={errors.nom ? 'input-error' : ''} />
        {errors.nom && <div className="field-error">⚠️ {errors.nom}</div>}
        <input type="text" name="prenom" placeholder={t('register.firstName')} value={formData.prenom} onChange={handleChange} className={errors.prenom ? 'input-error' : ''} />
        {errors.prenom && <div className="field-error">⚠️ {errors.prenom}</div>}
        <input type="text" name="username" placeholder={t('register.username')} value={formData.username} onChange={handleChange} className={errors.username ? 'input-error' : ''} />
        {errors.username && <div className="field-error">⚠️ {errors.username}</div>}
        <input type="date" name="date_naissance" value={formData.date_naissance} onChange={handleChange} className={errors.date_naissance ? 'input-error' : ''} />
        {errors.date_naissance && <div className="field-error">⚠️ {errors.date_naissance}</div>}
        <small>{t('register.ageWarning')}</small>
        <select name="pays_residence" value={formData.pays_residence} onChange={handleChange} className={errors.pays_residence ? 'input-error' : ''}>
          <option value="">{t('register.country')}</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors.pays_residence && <div className="field-error">⚠️ {errors.pays_residence}</div>}
        <input type="text" name="ville_residence" placeholder={t('register.city')} value={formData.ville_residence} onChange={handleChange} className={errors.ville_residence ? 'input-error' : ''} />
        {errors.ville_residence && <div className="field-error">⚠️ {errors.ville_residence}</div>}
        <select name="nationalite" value={formData.nationalite} onChange={handleChange} className={errors.nationalite ? 'input-error' : ''}>
          <option value="">{t('register.nationality')}</option>
          {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {errors.nationalite && <div className="field-error">⚠️ {errors.nationalite}</div>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select name="indicatif_telephone" value={formData.indicatif_telephone} onChange={handleChange} style={{ width: '100px' }}>
            {phoneCodes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="tel" name="telephone" placeholder={t('register.phone')} value={formData.telephone} onChange={handleChange} style={{ flex: 1 }} className={errors.telephone ? 'input-error' : ''} />
        </div>
        {errors.telephone && <div className="field-error">⚠️ {errors.telephone}</div>}
        <input type="email" name="email" placeholder={t('register.email')} value={formData.email} onChange={handleChange} className={errors.email ? 'input-error' : ''} />
        {errors.email && <div className="field-error">⚠️ {errors.email}</div>}
        <div style={{ position: 'relative' }}>
          <input type={showPassword ? 'text' : 'password'} name="mot_de_passe" placeholder={t('register.password')} value={formData.mot_de_passe} onChange={handleChange} className={errors.mot_de_passe ? 'input-error' : ''} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.mot_de_passe && <div className="field-error">⚠️ {errors.mot_de_passe}</div>}
        <div style={{ position: 'relative' }}>
          <input type={showConfirm ? 'text' : 'password'} name="confirmation_mdp" placeholder={t('register.confirmPassword')} value={formData.confirmation_mdp} onChange={handleChange} className={errors.confirmation_mdp ? 'input-error' : ''} />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="password-toggle" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {showConfirm ? '🙈' : '👁️'}
          </button>
        </div>
        {errors.confirmation_mdp && <div className="field-error">⚠️ {errors.confirmation_mdp}</div>}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" name="acceptRules" checked={formData.acceptRules} onChange={handleChange} />
          {t('auth.acceptRules')} <Link to="/terms" target="_blank">{t('auth.readTerms')}</Link>
        </label>
        {errors.acceptRules && <div className="field-error">⚠️ {errors.acceptRules}</div>}
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? t('common.loading') : t('register.registerBtn')}
        </button>
        <p className="text-center mt-2">{t('auth.haveAccount')} <Link to="/login">{t('nav.login')}</Link></p>
      </form>
    </div>
  );
};

export default Register;