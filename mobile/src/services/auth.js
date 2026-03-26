import api from '../api/client';

export const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  async login(username, password) {
    const response = await api.post('/auth/login', { username, mot_de_passe: password });
    return response.data;
  },
  async forgotPassword(identifier) {
    const response = await api.post('/auth/forgot-password', { identifier });
    return response.data;
  },
  async resetPassword(code, newPassword) {
    const response = await api.post('/auth/reset-password', { code, newPassword });
    return response.data;
  },
};