// frontend/src/pages/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth';
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

// Composant de champ avec label flottant (inchangé)
const FloatingLabelInput = ({ label, name, type = "text", value, onChange, required, error, ...props }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.trim() !== "";
  const isActive = focused || hasValue;
  return (
    <div className="floating-label-group">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className={`floating-input ${error ? "input-error" : ""}`}
        {...props}
      />
      <label className={`floating-label ${isActive ? "active" : ""}`}>
        {label}
      </label>
      {error && <div className="field-error">⚠️ {error}</div>}
    </div>
  );
};

// Composant Select avec recherche (datalist)
const SearchableSelect = ({ label, name, value, onChange, options, required, error }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value !== "";
  const isActive = focused || hasValue;

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange({ target: { name, value: val } });
  };

  return (
    <div className="floating-label-group">
      <input
        type="text"
        name={name}
        list={`${name}-list`}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        className={`floating-input ${error ? "input-error" : ""}`}
        autoComplete="off"
      />
      <datalist id={`${name}-list`}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} />
        ))}
      </datalist>
      <label className={`floating-label ${isActive ? "active" : ""}`}>
        {label}
      </label>
      {error && <div className="field-error">⚠️ {error}</div>}
    </div>
  );
};

const Register = () => {
  // ... état et fonctions inchangés jusqu'à validateForm
  // Même code que précédemment pour formData, errors, etc.

  const countryOptions = countries.map(c => ({ value: c, label: c }));
  const nationalityOptions = nationalities.map(n => ({ value: n, label: n }));
  const phoneCodeOptions = phoneCodes.map(code => ({ value: code, label: code }));

  return (
    <div className="container">
      <form onSubmit={handleSubmit} className="register-form">
        <h1>{t('register.title')}</h1>
        {apiError && <div className="error-message">⚠️ {apiError}</div>}

        {/* Prénom */}
        <FloatingLabelInput
          label="Prénom *"
          name="prenom"
          value={formData.prenom}
          onChange={handleChange}
          error={errors.prenom}
        />

        {/* Nom */}
        <FloatingLabelInput
          label="Nom *"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          error={errors.nom}
        />

        {/* Nom d'utilisateur */}
        <FloatingLabelInput
          label="Nom d'utilisateur *"
          name="username"
          value={formData.username}
          onChange={handleChange}
          error={errors.username}
        />

        {/* Date de naissance */}
        <FloatingLabelInput
          label="Date de naissance *"
          type="date"
          name="date_naissance"
          value={formData.date_naissance}
          onChange={handleChange}
          error={errors.date_naissance}
        />
        <small style={{ fontSize: '0.7rem', color: '#666' }}>{t('register.ageWarning')}</small>

        {/* Pays de résidence avec recherche */}
        <SearchableSelect
          label="Pays de résidence *"
          name="pays_residence"
          value={formData.pays_residence}
          onChange={handleChange}
          options={countryOptions}
          error={errors.pays_residence}
        />

        {/* Ville de résidence */}
        <FloatingLabelInput
          label="Ville de résidence *"
          name="ville_residence"
          value={formData.ville_residence}
          onChange={handleChange}
          error={errors.ville_residence}
        />

        {/* Nationalité avec recherche */}
        <SearchableSelect
          label="Nationalité *"
          name="nationalite"
          value={formData.nationalite}
          onChange={handleChange}
          options={nationalityOptions}
          error={errors.nationalite}
        />

        {/* Téléphone (indicateur + numéro) */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <SearchableSelect
              label="Indicatif"
              name="indicatif_telephone"
              value={formData.indicatif_telephone}
              onChange={handleChange}
              options={phoneCodeOptions}
            />
          </div>
          <div style={{ flex: 2 }}>
            <FloatingLabelInput
              label="Numéro de téléphone *"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              error={errors.telephone}
            />
          </div>
        </div>

        {/* Email */}
        <FloatingLabelInput
          label="Email *"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />

        {/* Mot de passe et confirmation (inchangés) */}
        <div className="floating-label-group password-group">
          <input
            type={showPassword ? 'text' : 'password'}
            name="mot_de_passe"
            value={formData.mot_de_passe}
            onChange={handleChange}
            onFocus={(e) => e.target.parentElement.classList.add('focused')}
            onBlur={(e) => e.target.parentElement.classList.remove('focused')}
            className={`floating-input ${errors.mot_de_passe ? 'input-error' : ''}`}
          />
          <label className="floating-label">Mot de passe *</label>
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
            {showPassword ? '🙈' : '👁️'}
          </button>
          {errors.mot_de_passe && <div className="field-error">⚠️ {errors.mot_de_passe}</div>}
        </div>

        <div className="floating-label-group password-group">
          <input
            type={showConfirm ? 'text' : 'password'}
            name="confirmation_mdp"
            value={formData.confirmation_mdp}
            onChange={handleChange}
            onFocus={(e) => e.target.parentElement.classList.add('focused')}
            onBlur={(e) => e.target.parentElement.classList.remove('focused')}
            className={`floating-input ${errors.confirmation_mdp ? 'input-error' : ''}`}
          />
          <label className="floating-label">Confirmer le mot de passe *</label>
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="password-toggle">
            {showConfirm ? '🙈' : '👁️'}
          </button>
          {errors.confirmation_mdp && <div className="field-error">⚠️ {errors.confirmation_mdp}</div>}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <input
            type="checkbox"
            name="acceptRules"
            checked={formData.acceptRules}
            onChange={handleChange}
          />
          {t('auth.acceptRules')} <Link to="/terms" target="_blank">{t('auth.readTerms')}</Link>
        </label>
        {errors.acceptRules && <div className="field-error">⚠️ {errors.acceptRules}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? t('common.loading') : t('register.registerBtn')}
        </button>

        <p className="text-center mt-2">
          {t('auth.haveAccount')} <Link to="/login">{t('nav.login')}</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;