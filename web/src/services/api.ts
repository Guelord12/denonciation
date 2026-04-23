import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// ✅ CORRECTION : URL absolue pour la production
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'http://16.171.39.76:5000/api' : '/api');

console.log('🔧 API Base URL:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await useAuthStore.getState().refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        useAuthStore.getState().clearAuth();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string) => 
    api.post('/auth/login', { username, password }),
  register: (data: any) => 
    api.post('/auth/register', data),
  logout: () => 
    api.post('/auth/logout'),
  me: () => 
    api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

// User API
export const userAPI = {
  getProfile: (id: number) => 
    api.get(`/users/profile/${id}`),
  updateProfile: (data: any) => 
    api.put('/users/profile', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getUserReports: (id?: number, page = 1) =>
    api.get(`/users/reports/${id || ''}`, { params: { page } }),
  getUserStats: (id: number) =>
    api.get(`/users/stats/${id}`),
  deleteAccount: (password: string) =>
    api.delete('/users/account', { data: { password } }),
};

// Report API
export const reportAPI = {
  getReports: (params?: any) => 
    api.get('/reports', { params }),
  getReport: (id: number) => 
    api.get(`/reports/${id}`),
  createReport: (data: FormData) => 
    api.post('/reports', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateReport: (id: number, data: any) => 
    api.put(`/reports/${id}`, data),
  deleteReport: (id: number) => 
    api.delete(`/reports/${id}`),
  likeReport: (id: number) => 
    api.post(`/reports/${id}/like`),
  addWitness: (id: number, testimony: string) =>
    api.post(`/reports/${id}/witness`, { testimony }),
  shareReport: (id: number, platform: string) =>
    api.post(`/reports/${id}/share`, { platform }),
  reportContent: (id: number, type: string, reason: string) =>
    api.post(`/reports/${id}/report`, { type, reason }),
};

// Comment API
export const commentAPI = {
  getComments: (reportId: number, page = 1) =>
    api.get(`/reports/${reportId}/comments`, { params: { page } }),
  createComment: (reportId: number, content: string, parentId?: number) =>
    api.post('/comments', { report_id: reportId, content, parent_id: parentId }),
  updateComment: (id: number, content: string) =>
    api.put(`/comments/${id}`, { content }),
  deleteComment: (id: number) =>
    api.delete(`/comments/${id}`),
};

// Live API
export const liveAPI = {
  getStreams: (params?: any) =>
    api.get('/live', { params }),
  getStream: (id: number) =>
    api.get(`/live/${id}`),
  createStream: (data: any) =>
    api.post('/live', data),
  endStream: (id: number) =>
    api.post(`/live/${id}/end`),
  subscribe: (id: number, paymentMethodId?: string) =>
    api.post(`/live/${id}/subscribe`, { payment_method_id: paymentMethodId }),
  likeStream: (id: number) =>
    api.post(`/live/${id}/like`),
  getMessages: (id: number, limit = 100, before?: string) =>
    api.get(`/live/${id}/messages`, { params: { limit, before } }),
  sendSuperChat: (id: number, amount: number, message: string, color?: string) =>
    api.post(`/live/${id}/super-chat`, { amount, message, color }),
};

// Notification API
export const notificationAPI = {
  getNotifications: (page = 1, unreadOnly = false) =>
    api.get('/notifications', { params: { page, unread_only: unreadOnly } }),
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
  markAsRead: (id?: number) =>
    api.patch(`/notifications/${id || ''}/read`),
  markAllAsRead: () =>
    api.patch('/notifications/read'),
  deleteNotification: (id: number) =>
    api.delete(`/notifications/${id}`),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () =>
    api.get('/admin/dashboard'),
  getRealtimeStats: () =>
    api.get('/admin/realtime-stats'),
  getUsers: (params?: any) =>
    api.get('/admin/users', { params }),
  banUser: (userId: number, reason: string) =>
    api.post(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId: number) =>
    api.post(`/admin/users/${userId}/unban`),
  sendWarning: (userId: number, message: string) =>
    api.post(`/admin/users/${userId}/warn`, { message, violationType: 'warning' }),
  getReports: (params?: any) =>
    api.get('/admin/reports', { params }),
  updateReportStatus: (reportId: number, status: string, reason?: string) =>
    api.patch(`/admin/reports/${reportId}/status`, { status, reason }),
  getModerationReports: (params?: { page: number; limit: number; status?: string }) =>
    api.get('/admin/moderation', { params }),
  resolveModerationReport: (reportId: number, resolution: string, action?: string) =>
    api.patch(`/admin/moderation/${reportId}/resolve`, { resolution, action }),
  getActivityLogs: (params?: any) =>
    api.get('/admin/logs', { params }),
  exportData: (type: string, startDate?: string, endDate?: string) =>
    api.get(`/admin/export/${type}`, { params: { startDate, endDate }, responseType: 'blob' }),
  updateSettings: (data: any) =>
    api.put('/admin/settings', data),
  clearCache: () =>
    api.post('/admin/clear-cache'),
};

// Category API
export const categoryAPI = {
  getCategories: () =>
    api.get('/categories'),
  getCategory: (id: number) =>
    api.get(`/categories/${id}`),
  getCategoriesWithStats: () =>
    api.get('/categories/stats'),
};

// City API
export const cityAPI = {
  getCities: (params?: any) =>
    api.get('/cities', { params }),
  getCity: (id: number) =>
    api.get(`/cities/${id}`),
  getCitiesWithStats: () =>
    api.get('/cities/stats'),
  getNearbyCities: (lat: number, lng: number, radius?: number) =>
    api.get('/cities/nearby', { params: { lat, lng, radius } }),
};

// Country API
export const countryAPI = {
  getCountries: (search?: string) =>
    api.get('/countries', { params: { search } }),
  getPhoneCodes: (search?: string) =>
    api.get('/countries/phone-codes', { params: { search } }),
  getNationalities: (search?: string) =>
    api.get('/countries/nationalities', { params: { search } }),
  getCountryByCode: (code: string) =>
    api.get(`/countries/${code}`),
};

// Actualite API
export const actualiteAPI = {
  getActualites: (params?: any) =>
    api.get('/actualites', { params }),
  getActualite: (id: number) =>
    api.get(`/actualites/${id}`),
  getCategories: () =>
    api.get('/actualites/categories'),
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: (message: string, language: string = 'fr') =>
    api.post('/chatbot/message', { message, language }),
  getSuggestions: (language: string = 'fr') =>
    api.get('/chatbot/suggestions', { params: { language } }),
  translate: (text: string, to: string, from?: string) =>
    api.post('/chatbot/translate', { text, to, from }),
  getSupportedLanguages: () =>
    api.get('/chatbot/languages'),
};

// Payment API
export const paymentAPI = {
  createPaymentIntent: (amount: number, currency: string = 'usd', streamId?: number) =>
    api.post('/payment/create-intent', { amount, currency, stream_id: streamId }),
  confirmPayment: (paymentIntentId: string) =>
    api.post('/payment/confirm', { payment_intent_id: paymentIntentId }),
};

export default api;