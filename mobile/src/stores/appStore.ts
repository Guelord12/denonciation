import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { loadSavedLanguage } from '../i18n';

interface AppState {
  isFirstLaunch: boolean;
  darkMode: boolean;
  notificationsEnabled: boolean;
  language: string;
  
  setFirstLaunch: (value: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  toggleNotifications: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
  initialize: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isFirstLaunch: true,
  darkMode: false,
  notificationsEnabled: true,
  language: 'fr',

  setFirstLaunch: async (value: boolean) => {
    set({ isFirstLaunch: value });
    await AsyncStorage.setItem('isFirstLaunch', JSON.stringify(value));
  },

  toggleDarkMode: async () => {
    const newValue = !get().darkMode;
    set({ darkMode: newValue });
    await AsyncStorage.setItem('darkMode', JSON.stringify(newValue));
  },

  setDarkMode: async (enabled: boolean) => {
    set({ darkMode: enabled });
    await AsyncStorage.setItem('darkMode', JSON.stringify(enabled));
  },

  toggleNotifications: async () => {
    const newValue = !get().notificationsEnabled;
    set({ notificationsEnabled: newValue });
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(newValue));
  },

  setNotificationsEnabled: async (enabled: boolean) => {
    set({ notificationsEnabled: enabled });
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(enabled));
  },

  setLanguage: async (lang: string) => {
    set({ language: lang });
    await AsyncStorage.setItem('language', lang);
    await i18n.changeLanguage(lang);
  },

  initialize: async () => {
    try {
      const isFirstLaunch = await AsyncStorage.getItem('isFirstLaunch');
      const darkMode = await AsyncStorage.getItem('darkMode');
      const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
      const language = await AsyncStorage.getItem('language');

      await loadSavedLanguage();
      const currentLanguage = i18n.language || 'fr';

      set({
        isFirstLaunch: isFirstLaunch ? JSON.parse(isFirstLaunch) : true,
        darkMode: darkMode ? JSON.parse(darkMode) : false,
        notificationsEnabled: notificationsEnabled ? JSON.parse(notificationsEnabled) : true,
        language: language || currentLanguage,
      });
      
      console.log('✅ App store initialized:', { 
        darkMode: darkMode ? JSON.parse(darkMode) : false, 
        language: language || currentLanguage 
      });
    } catch (error) {
      console.error('❌ Initialize app store error:', error);
    }
  },
}));