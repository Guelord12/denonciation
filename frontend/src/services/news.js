import api from './api';

export const newsService = {
  async getAll(region = 'RDC', limit = 20) {
    const response = await api.get(`/news?region=${region}&limit=${limit}`);
    return response.data;
  },
  async getByCategory(category, region, limit = 20) {
    const response = await api.get(`/news/category?category=${category}&region=${region}&limit=${limit}`);
    return response.data;
  }
};