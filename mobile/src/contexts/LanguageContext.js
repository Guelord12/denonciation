import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { changeLanguage } from '../i18n';

export const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('language');
      if (stored) {
        setLanguage(stored);
        await changeLanguage(stored);
      }
    };
    load();
  }, []);

  const setLanguageAndStore = async (lang) => {
    await changeLanguage(lang);
    setLanguage(lang);
    await AsyncStorage.setItem('language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageAndStore }}>
      {children}
    </LanguageContext.Provider>
  );
};