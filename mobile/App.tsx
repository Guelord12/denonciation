import { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { LogBox, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/i18n';

import { useAuthStore } from './src/stores/authStore';
import { useAppStore } from './src/stores/appStore';
import { lightTheme, darkTheme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { SocketProvider } from './src/contexts/SocketContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { checkApiHealth } from './src/services/api';

// Adapter les thèmes de navigation avec React Native Paper
const { LightTheme: NavigationLightTheme, DarkTheme: NavigationDarkTheme } = adaptNavigationTheme({
  reactNavigationLight: DefaultTheme,
  reactNavigationDark: DarkTheme,
});

// Combiner les thèmes Paper et Navigation
const CombinedLightTheme = {
  ...MD3LightTheme,
  ...lightTheme,
  ...NavigationLightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightTheme.colors,
    ...NavigationLightTheme.colors,
  },
};

const CombinedDarkTheme = {
  ...MD3DarkTheme,
  ...darkTheme,
  ...NavigationDarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkTheme.colors,
    ...NavigationDarkTheme.colors,
  },
};

// Ignorer certains warnings non critiques
LogBox.ignoreLogs([
  'Require cycle:',
  'expo-notifications',
  'Non-serializable values were found in the navigation state',
]);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function Navigation() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const { initialize: initializeApp } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const [apiStatus, setApiStatus] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('🚀 Initializing app...');
        console.log('📡 Server IP: 192.168.176.90');
        
        await initializeApp();
        
        const health = await checkApiHealth();
        setApiStatus(health);
        
        if (!health) {
          console.warn('⚠️ API is not accessible.');
        } else {
          console.log('✅ API connection successful');
        }
        
        await initialize();
        
        const logoutFlag = await AsyncStorage.getItem('auth_logout');
        if (logoutFlag) {
          await AsyncStorage.removeItem('auth_logout');
        }
        
        console.log('✅ App initialized');
      } catch (error) {
        console.error('❌ Initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };
    
    init();
  }, []);

  useEffect(() => {
    const hideSplash = async () => {
      if (!isLoading && isReady) {
        await SplashScreen.hideAsync();
      }
    };
    hideSplash();
  }, [isLoading, isReady]);

  if (isLoading || !isReady) {
    return null;
  }

  return (
    <NavigationContainer theme={useAppStore.getState().darkMode ? CombinedDarkTheme : CombinedLightTheme}>
      <StatusBar style={useAppStore.getState().darkMode ? 'light' : 'dark'} />
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  const systemColorScheme = useColorScheme();
  const { darkMode, language } = useAppStore();
  
  const theme = darkMode ? CombinedDarkTheme : CombinedLightTheme;
  
  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PaperProvider theme={theme}>
              <SafeAreaProvider>
                <SocketProvider>
                  <NotificationProvider>
                    <Navigation />
                    <Toast />
                  </NotificationProvider>
                </SocketProvider>
              </SafeAreaProvider>
            </PaperProvider>
          </AuthProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}