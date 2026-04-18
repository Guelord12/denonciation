export interface Country {
  code: string;
  name: string;
  nativeName?: string;
  phoneCode: string;
  flag: string;
  continent: string;
  nationality: string;
}

export const COUNTRIES: Country[] = [
  { code: 'CD', name: 'République Démocratique du Congo', phoneCode: '243', flag: '🇨🇩', continent: 'Afrique', nationality: 'Congolais' },
  { code: 'CG', name: 'Congo', phoneCode: '242', flag: '🇨🇬', continent: 'Afrique', nationality: 'Congolais' },
  { code: 'FR', name: 'France', phoneCode: '33', flag: '🇫🇷', continent: 'Europe', nationality: 'Français' },
  { code: 'BE', name: 'Belgique', phoneCode: '32', flag: '🇧🇪', continent: 'Europe', nationality: 'Belge' },
  { code: 'CH', name: 'Suisse', phoneCode: '41', flag: '🇨🇭', continent: 'Europe', nationality: 'Suisse' },
  { code: 'CA', name: 'Canada', phoneCode: '1', flag: '🇨🇦', continent: 'Amérique', nationality: 'Canadien' },
  { code: 'US', name: 'États-Unis', phoneCode: '1', flag: '🇺🇸', continent: 'Amérique', nationality: 'Américain' },
  { code: 'GB', name: 'Royaume-Uni', phoneCode: '44', flag: '🇬🇧', continent: 'Europe', nationality: 'Britannique' },
  { code: 'DE', name: 'Allemagne', phoneCode: '49', flag: '🇩🇪', continent: 'Europe', nationality: 'Allemand' },
  { code: 'IT', name: 'Italie', phoneCode: '39', flag: '🇮🇹', continent: 'Europe', nationality: 'Italien' },
  { code: 'ES', name: 'Espagne', phoneCode: '34', flag: '🇪🇸', continent: 'Europe', nationality: 'Espagnol' },
  { code: 'PT', name: 'Portugal', phoneCode: '351', flag: '🇵🇹', continent: 'Europe', nationality: 'Portugais' },
  { code: 'NL', name: 'Pays-Bas', phoneCode: '31', flag: '🇳🇱', continent: 'Europe', nationality: 'Néerlandais' },
  { code: 'LU', name: 'Luxembourg', phoneCode: '352', flag: '🇱🇺', continent: 'Europe', nationality: 'Luxembourgeois' },
  { code: 'SN', name: 'Sénégal', phoneCode: '221', flag: '🇸🇳', continent: 'Afrique', nationality: 'Sénégalais' },
  { code: 'CI', name: 'Côte d\'Ivoire', phoneCode: '225', flag: '🇨🇮', continent: 'Afrique', nationality: 'Ivoirien' },
  { code: 'CM', name: 'Cameroun', phoneCode: '237', flag: '🇨🇲', continent: 'Afrique', nationality: 'Camerounais' },
  { code: 'GA', name: 'Gabon', phoneCode: '241', flag: '🇬🇦', continent: 'Afrique', nationality: 'Gabonais' },
  { code: 'BJ', name: 'Bénin', phoneCode: '229', flag: '🇧🇯', continent: 'Afrique', nationality: 'Béninois' },
  { code: 'TG', name: 'Togo', phoneCode: '228', flag: '🇹🇬', continent: 'Afrique', nationality: 'Togolais' },
  { code: 'ML', name: 'Mali', phoneCode: '223', flag: '🇲🇱', continent: 'Afrique', nationality: 'Malien' },
  { code: 'BF', name: 'Burkina Faso', phoneCode: '226', flag: '🇧🇫', continent: 'Afrique', nationality: 'Burkinabé' },
  { code: 'NE', name: 'Niger', phoneCode: '227', flag: '🇳🇪', continent: 'Afrique', nationality: 'Nigérien' },
  { code: 'TD', name: 'Tchad', phoneCode: '235', flag: '🇹🇩', continent: 'Afrique', nationality: 'Tchadien' },
  { code: 'CF', name: 'République Centrafricaine', phoneCode: '236', flag: '🇨🇫', continent: 'Afrique', nationality: 'Centrafricain' },
  { code: 'GQ', name: 'Guinée Équatoriale', phoneCode: '240', flag: '🇬🇶', continent: 'Afrique', nationality: 'Équato-Guinéen' },
  { code: 'MA', name: 'Maroc', phoneCode: '212', flag: '🇲🇦', continent: 'Afrique', nationality: 'Marocain' },
  { code: 'DZ', name: 'Algérie', phoneCode: '213', flag: '🇩🇿', continent: 'Afrique', nationality: 'Algérien' },
  { code: 'TN', name: 'Tunisie', phoneCode: '216', flag: '🇹🇳', continent: 'Afrique', nationality: 'Tunisien' },
  { code: 'EG', name: 'Égypte', phoneCode: '20', flag: '🇪🇬', continent: 'Afrique', nationality: 'Égyptien' },
  { code: 'ZA', name: 'Afrique du Sud', phoneCode: '27', flag: '🇿🇦', continent: 'Afrique', nationality: 'Sud-Africain' },
  { code: 'NG', name: 'Nigéria', phoneCode: '234', flag: '🇳🇬', continent: 'Afrique', nationality: 'Nigérian' },
  { code: 'GH', name: 'Ghana', phoneCode: '233', flag: '🇬🇭', continent: 'Afrique', nationality: 'Ghanéen' },
  { code: 'KE', name: 'Kenya', phoneCode: '254', flag: '🇰🇪', continent: 'Afrique', nationality: 'Kényan' },
  { code: 'TZ', name: 'Tanzanie', phoneCode: '255', flag: '🇹🇿', continent: 'Afrique', nationality: 'Tanzanien' },
  { code: 'UG', name: 'Ouganda', phoneCode: '256', flag: '🇺🇬', continent: 'Afrique', nationality: 'Ougandais' },
  { code: 'RW', name: 'Rwanda', phoneCode: '250', flag: '🇷🇼', continent: 'Afrique', nationality: 'Rwandais' },
  { code: 'BI', name: 'Burundi', phoneCode: '257', flag: '🇧🇮', continent: 'Afrique', nationality: 'Burundais' },
  { code: 'AO', name: 'Angola', phoneCode: '244', flag: '🇦🇴', continent: 'Afrique', nationality: 'Angolais' },
  { code: 'MZ', name: 'Mozambique', phoneCode: '258', flag: '🇲🇿', continent: 'Afrique', nationality: 'Mozambicain' },
  { code: 'ZW', name: 'Zimbabwe', phoneCode: '263', flag: '🇿🇼', continent: 'Afrique', nationality: 'Zimbabwéen' },
  { code: 'ZM', name: 'Zambie', phoneCode: '260', flag: '🇿🇲', continent: 'Afrique', nationality: 'Zambien' },
  { code: 'MW', name: 'Malawi', phoneCode: '265', flag: '🇲🇼', continent: 'Afrique', nationality: 'Malawite' },
  { code: 'MG', name: 'Madagascar', phoneCode: '261', flag: '🇲🇬', continent: 'Afrique', nationality: 'Malgache' },
  { code: 'MU', name: 'Maurice', phoneCode: '230', flag: '🇲🇺', continent: 'Afrique', nationality: 'Mauricien' },
  { code: 'SC', name: 'Seychelles', phoneCode: '248', flag: '🇸🇨', continent: 'Afrique', nationality: 'Seychellois' },
  { code: 'KM', name: 'Comores', phoneCode: '269', flag: '🇰🇲', continent: 'Afrique', nationality: 'Comorien' },
  { code: 'DJ', name: 'Djibouti', phoneCode: '253', flag: '🇩🇯', continent: 'Afrique', nationality: 'Djiboutien' },
  { code: 'ET', name: 'Éthiopie', phoneCode: '251', flag: '🇪🇹', continent: 'Afrique', nationality: 'Éthiopien' },
  { code: 'ER', name: 'Érythrée', phoneCode: '291', flag: '🇪🇷', continent: 'Afrique', nationality: 'Érythréen' },
  { code: 'SO', name: 'Somalie', phoneCode: '252', flag: '🇸🇴', continent: 'Afrique', nationality: 'Somalien' },
  { code: 'SD', name: 'Soudan', phoneCode: '249', flag: '🇸🇩', continent: 'Afrique', nationality: 'Soudanais' },
  { code: 'SS', name: 'Soudan du Sud', phoneCode: '211', flag: '🇸🇸', continent: 'Afrique', nationality: 'Sud-Soudanais' },
  { code: 'LY', name: 'Libye', phoneCode: '218', flag: '🇱🇾', continent: 'Afrique', nationality: 'Libyen' },
  { code: 'MR', name: 'Mauritanie', phoneCode: '222', flag: '🇲🇷', continent: 'Afrique', nationality: 'Mauritanien' },
  { code: 'GN', name: 'Guinée', phoneCode: '224', flag: '🇬🇳', continent: 'Afrique', nationality: 'Guinéen' },
  { code: 'GW', name: 'Guinée-Bissau', phoneCode: '245', flag: '🇬🇼', continent: 'Afrique', nationality: 'Bissau-Guinéen' },
  { code: 'SL', name: 'Sierra Leone', phoneCode: '232', flag: '🇸🇱', continent: 'Afrique', nationality: 'Sierra-Léonais' },
  { code: 'LR', name: 'Libéria', phoneCode: '231', flag: '🇱🇷', continent: 'Afrique', nationality: 'Libérien' },
  { code: 'GM', name: 'Gambie', phoneCode: '220', flag: '🇬🇲', continent: 'Afrique', nationality: 'Gambien' },
  { code: 'SN', name: 'Sénégal', phoneCode: '221', flag: '🇸🇳', continent: 'Afrique', nationality: 'Sénégalais' },
  { code: 'CV', name: 'Cap-Vert', phoneCode: '238', flag: '🇨🇻', continent: 'Afrique', nationality: 'Cap-Verdien' },
  { code: 'ST', name: 'Sao Tomé-et-Principe', phoneCode: '239', flag: '🇸🇹', continent: 'Afrique', nationality: 'Santoméen' },
  { code: 'CN', name: 'Chine', phoneCode: '86', flag: '🇨🇳', continent: 'Asie', nationality: 'Chinois' },
  { code: 'JP', name: 'Japon', phoneCode: '81', flag: '🇯🇵', continent: 'Asie', nationality: 'Japonais' },
  { code: 'KR', name: 'Corée du Sud', phoneCode: '82', flag: '🇰🇷', continent: 'Asie', nationality: 'Sud-Coréen' },
  { code: 'IN', name: 'Inde', phoneCode: '91', flag: '🇮🇳', continent: 'Asie', nationality: 'Indien' },
  { code: 'AE', name: 'Émirats Arabes Unis', phoneCode: '971', flag: '🇦🇪', continent: 'Asie', nationality: 'Émirati' },
  { code: 'SA', name: 'Arabie Saoudite', phoneCode: '966', flag: '🇸🇦', continent: 'Asie', nationality: 'Saoudien' },
  { code: 'QA', name: 'Qatar', phoneCode: '974', flag: '🇶🇦', continent: 'Asie', nationality: 'Qatari' },
  { code: 'KW', name: 'Koweït', phoneCode: '965', flag: '🇰🇼', continent: 'Asie', nationality: 'Koweïtien' },
  { code: 'LB', name: 'Liban', phoneCode: '961', flag: '🇱🇧', continent: 'Asie', nationality: 'Libanais' },
  { code: 'IL', name: 'Israël', phoneCode: '972', flag: '🇮🇱', continent: 'Asie', nationality: 'Israélien' },
  { code: 'TR', name: 'Turquie', phoneCode: '90', flag: '🇹🇷', continent: 'Asie', nationality: 'Turc' },
  { code: 'RU', name: 'Russie', phoneCode: '7', flag: '🇷🇺', continent: 'Europe', nationality: 'Russe' },
  { code: 'UA', name: 'Ukraine', phoneCode: '380', flag: '🇺🇦', continent: 'Europe', nationality: 'Ukrainien' },
  { code: 'BR', name: 'Brésil', phoneCode: '55', flag: '🇧🇷', continent: 'Amérique', nationality: 'Brésilien' },
  { code: 'AR', name: 'Argentine', phoneCode: '54', flag: '🇦🇷', continent: 'Amérique', nationality: 'Argentin' },
  { code: 'MX', name: 'Mexique', phoneCode: '52', flag: '🇲🇽', continent: 'Amérique', nationality: 'Mexicain' },
  { code: 'CO', name: 'Colombie', phoneCode: '57', flag: '🇨🇴', continent: 'Amérique', nationality: 'Colombien' },
  { code: 'CL', name: 'Chili', phoneCode: '56', flag: '🇨🇱', continent: 'Amérique', nationality: 'Chilien' },
  { code: 'PE', name: 'Pérou', phoneCode: '51', flag: '🇵🇪', continent: 'Amérique', nationality: 'Péruvien' },
  { code: 'VE', name: 'Venezuela', phoneCode: '58', flag: '🇻🇪', continent: 'Amérique', nationality: 'Vénézuélien' },
  { code: 'AU', name: 'Australie', phoneCode: '61', flag: '🇦🇺', continent: 'Océanie', nationality: 'Australien' },
  { code: 'NZ', name: 'Nouvelle-Zélande', phoneCode: '64', flag: '🇳🇿', continent: 'Océanie', nationality: 'Néo-Zélandais' },
];

export const COUNTRIES_SORTED = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

export const NATIONALITIES = [...new Set(COUNTRIES.map(c => c.nationality))].sort();

export const PHONE_CODES = COUNTRIES.map(c => ({
  code: c.phoneCode,
  country: c.name,
  flag: c.flag,
  display: `${c.flag} +${c.phoneCode} (${c.name})`
})).sort((a, b) => a.country.localeCompare(b.country));

export default COUNTRIES;