import api from '../api/client';

export const liveService = {
  async getAllActive() {
    const response = await api.get('/lives/active');
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/lives/${id}`);
    return response.data;
  },
  async create(titre, description, isPremium = false) {
    const response = await api.post('/lives', { titre, description, is_premium: isPremium });
    return response.data;
  },
  async start(id) {
    const response = await api.post(`/lives/${id}/start`);
    return response.data;
  },
  async end(id) {
    const response = await api.post(`/lives/${id}/end`);
    return response.data;
  },
  async sendMessage(liveId, message) {
    const response = await api.post(`/lives/${liveId}/messages`, { message });
    return response.data;
  },
  async getMessages(liveId, limit = 100) {
    const response = await api.get(`/lives/${liveId}/messages?limit=${limit}`);
    return response.data;
  },
  async join(liveId) {
    const response = await api.post(`/lives/${liveId}/join`);
    return response.data;
  },
  async leave(liveId) {
    const response = await api.post(`/lives/${liveId}/leave`);
    return response.data;
  },
  async getParticipants(liveId, limit = 100, offset = 0) {
    const response = await api.get(`/lives/${liveId}/participants?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};