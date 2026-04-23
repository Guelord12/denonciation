import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// ✅ CORRECTION : URL absolue pour la production
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'http://16.171.39.76:5000/api' : '/api');

console.log('🔧 Auth API Base URL:', API_BASE_URL);

// Instance Axios séparée pour l'authentification (sans intercepteur pour éviter les boucles)
const authAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  city?: string;
  nationality?: string;
  birth_date?: string;
  gender?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    avatar: string | null;
    first_name: string | null;
    last_name: string | null;
    is_admin: boolean;
    is_banned: boolean;
  };
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirm_password: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

class AuthService {
  /**
   * Connexion utilisateur
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔐 Login attempt:', { username: credentials.username });
      const response = await authAxios.post<AuthResponse>('/auth/login', credentials);
      
      // Stocker les tokens dans le store
      const { accessToken, refreshToken, user } = response.data;
      useAuthStore.getState().setTokens(accessToken, refreshToken);
      useAuthStore.getState().setUser(user);
      
      // Stocker dans localStorage pour persistance
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('✅ Login successful:', user.username);
      return response.data;
    } catch (error: any) {
      console.error('❌ Login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Erreur de connexion');
    }
  }

  /**
   * Inscription utilisateur
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('📝 Register attempt:', { username: data.username, email: data.email });
      const response = await authAxios.post<AuthResponse>('/auth/register', data);
      
      const { accessToken, refreshToken, user } = response.data;
      useAuthStore.getState().setTokens(accessToken, refreshToken);
      useAuthStore.getState().setUser(user);
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('✅ Register successful:', user.username);
      return response.data;
    } catch (error: any) {
      console.error('❌ Register error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Erreur d\'inscription');
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await authAxios.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Nettoyer le store et le localStorage
      useAuthStore.getState().clearAuth();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  /**
   * Récupérer le profil utilisateur connecté
   */
  async me(): Promise<AuthResponse['user']> {
    try {
      const response = await authAxios.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de récupération du profil');
    }
  }

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const response = await authAxios.post('/auth/refresh', { refreshToken });
      const { accessToken } = response.data;
      
      useAuthStore.getState().setAccessToken(accessToken);
      localStorage.setItem('accessToken', accessToken);
      
      return response.data;
    } catch (error: any) {
      // En cas d'échec du refresh, déconnecter l'utilisateur
      useAuthStore.getState().clearAuth();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      throw new Error(error.response?.data?.error || 'Session expirée');
    }
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    try {
      const response = await authAxios.post('/auth/change-password', data, {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de changement de mot de passe');
    }
  }

  /**
   * Demander la réinitialisation du mot de passe
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await authAxios.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de demande de réinitialisation');
    }
  }

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    try {
      const response = await authAxios.post('/auth/reset-password', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de réinitialisation');
    }
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return !!useAuthStore.getState().accessToken;
  }

  /**
   * Initialiser l'authentification depuis le localStorage
   */
  initializeFromStorage(): void {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');
    
    if (accessToken && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        useAuthStore.getState().setTokens(accessToken, refreshToken);
        useAuthStore.getState().setUser(user);
        console.log('✅ Auth initialized from storage:', user.username);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        this.clearStorage();
      }
    }
  }

  /**
   * Nettoyer le stockage
   */
  clearStorage(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    useAuthStore.getState().clearAuth();
  }
}

export const authService = new AuthService();
export default authService;