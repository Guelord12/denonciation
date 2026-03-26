import api from '../api/client';

export const reportsService = {
  async getAll(limit = 50, offset = 0) {
    const response = await api.get(`/reports?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  async getMyReports(limit = 50, offset = 0) {
    const response = await api.get(`/reports/me?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },
  async create(reportData) {
    const response = await api.post('/reports', reportData);
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`/reports/${id}`);
    return response.data;
  },
  async uploadEvidence(formData) {
    const response = await api.post('/reports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  async like(reportId, type) {
    const response = await api.post(`/likes/${reportId}`, { type });
    return response.data;
  },
  async unlike(reportId) {
    const response = await api.delete(`/likes/${reportId}`);
    return response.data;
  },
  async getLikeStatus(reportId) {
    const response = await api.get(`/likes/${reportId}/status`);
    return response.data;
  },
  async witness(reportId) {
    const response = await api.post(`/witnesses/${reportId}`);
    return response.data;
  },
  async hasWitnessed(reportId) {
    const response = await api.get(`/witnesses/${reportId}/status`);
    return response.data;
  },
  async addComment(reportId, contenu, parentId = null) {
    const response = await api.post(`/comments/${reportId}`, { contenu, parent_id: parentId });
    return response.data;
  },
  async getComments(reportId) {
    const response = await api.get(`/comments/${reportId}`);
    return response.data;
  },
};