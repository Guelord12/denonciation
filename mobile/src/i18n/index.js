import 'intl-pluralrules'; // Polyfill pour les règles de pluriel
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fr from './fr.json';
import en from './en.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export const changeLanguage = async (lang) => {
  await AsyncStorage.setItem('language', lang);
  i18n.changeLanguage(lang);
};

export const getStoredLanguage = async () => {
  const lang = await AsyncStorage.getItem('language');
  if (lang) i18n.changeLanguage(lang);
};

export default i18n;