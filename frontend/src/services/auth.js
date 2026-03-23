import api from './api';

export const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  async login(username, password) {
    const response = await api.post('/auth/login', { username, mot_de_passe: password });
    return response.data;
  },
  async verifyToken() {
    const response = await api.get('/auth/verify');
    return response.data;
  },
  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};