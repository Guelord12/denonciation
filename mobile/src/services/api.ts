import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ✅ IP de la machine
const YOUR_PC_IP = '192.168.131.90';

const getBaseUrl = () => {
  if (__DEV__) {
    console.log('📱 Platform:', Platform.OS);
    
    const url = Platform.select({
      ios: `http://${YOUR_PC_IP}:5000/api`,
      android: `http://${YOUR_PC_IP}:5000/api`,
      default: `http://${YOUR_PC_IP}:5000/api`,
    });
    
    console.log('🌐 API Base URL:', url);
    return url;
  }
  return 'https://api.denonciation.com/api';
};

const BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Intercepteur de requête
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
  } catch (error) {
    console.error('Error getting token from AsyncStorage:', error);
  }
  return config;
});

// Intercepteur de réponse
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.error('❌ Network Error - Backend inaccessible');
      console.error('   URL:', originalRequest?.baseURL + originalRequest?.url);
      console.error('   Vérifie que:');
      console.error('   1. Le backend est lancé (npm run dev dans backend)');
      console.error(`   2. L'IP est correcte (actuelle: ${YOUR_PC_IP})`);
      console.error('   3. Le pare-feu ne bloque pas le port 5000');
      console.error('   4. Le téléphone est sur le même réseau WiFi');
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('🔄 Attempting to refresh token...');
          
          const response = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { access } = response.data;
          await AsyncStorage.setItem('accessToken', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          
          console.log('✅ Token refreshed successfully');
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.setItem('auth_logout', Date.now().toString());
      }
    }
    
    if (error.response) {
      console.error(`❌ ${error.response.status} ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}:`, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export async function checkApiHealth(): Promise<boolean> {
  try {
    const serverUrl = `http://${YOUR_PC_IP}:5000`;
    console.log(`🔍 Checking API health at ${serverUrl}/health...`);
    
    const response = await axios.get(`${serverUrl}/health`, { timeout: 5000 });
    console.log('✅ API health check passed');
    return response.data.status === 'OK';
  } catch (error: any) {
    try {
      const serverUrl = `http://${YOUR_PC_IP}:5000`;
      const response = await axios.get(serverUrl, { timeout: 5000 });
      console.log('✅ API health check passed (root endpoint)');
      return true;
    } catch (fallbackError) {
      console.error('❌ API health check failed:', error.message);
      return false;
    }
  }
}

export default api;