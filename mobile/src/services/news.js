import api from '../api/client';

export const newsService = {
  async getAll(region = 'RDC', limit = 20) {
    const response = await api.get(`/news?region=${region}&limit=${limit}`);
    return response.data;
  },
};