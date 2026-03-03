import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs et le refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ===================== AUTH =====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  registerOrganization: (data) => api.post('/auth/register-organization', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// ===================== USERS =====================
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  getPublicProfile: (id) => api.get(`/users/${id}/public`),
};

// ===================== ORGANIZATIONS =====================
export const organizationAPI = {
  getById: (id) => api.get(`/organizations/${id}`),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  list: (params) => api.get('/organizations', { params }),
};

// ===================== VERIFICATION =====================
export const verificationAPI = {
  submit: (data) => api.post('/verification/submit', data),
  getStatus: () => api.get('/verification/status'),
};

// ===================== PUBLICATIONS =====================
export const publicationAPI = {
  list: (params) => api.get('/publications', { params }),
  getById: (id) => api.get(`/publications/${id}`),
  create: (data) => api.post('/publications', data),
  update: (id, data) => api.put(`/publications/${id}`, data),
  resolve: (id) => api.put(`/publications/${id}/resolve`),
  delete: (id) => api.delete(`/publications/${id}`),
  myList: (params) => api.get('/publications/my/list', { params }),
};

// ===================== CHAT =====================
export const chatAPI = {
  sendRequest: (data) => api.post('/chat/requests', data),
  getReceivedRequests: (params) => api.get('/chat/requests/received', { params }),
  getSentRequests: (params) => api.get('/chat/requests/sent', { params }),
  acceptRequest: (id, data) => api.put(`/chat/requests/${id}/accept`, data),
  rejectRequest: (id, data) => api.put(`/chat/requests/${id}/reject`, data),
};

// ===================== CONVERSATIONS =====================
export const conversationAPI = {
  list: () => api.get('/conversations'),
  getById: (id) => api.get(`/conversations/${id}`),
  getMessages: (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  sendMessage: (id, data) => api.post(`/conversations/${id}/messages`, data),
};

// ===================== UPLOAD =====================
export const uploadAPI = {
  image: (file, purpose) => {
    const formData = new FormData();
    formData.append('file', file);
    if (purpose) formData.append('purpose', purpose);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  audio: (file, duration) => {
    const formData = new FormData();
    formData.append('file', file);
    if (duration) formData.append('duration', duration);
    return api.post('/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  video: (file, duration) => {
    const formData = new FormData();
    formData.append('file', file);
    if (duration) formData.append('duration', duration);
    return api.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  verification: (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return api.post('/upload/verification', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  multiple: (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ===================== ADMIN =====================
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  banUser: (id, data) => api.put(`/admin/users/${id}/ban`, data),
  resetPassword: (id) => api.put(`/admin/users/${id}/reset-password`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getOrganizations: (params) => api.get('/admin/organizations', { params }),
  verifyOrganization: (id, data) => api.put(`/admin/organizations/${id}/verify`, data),
  getVerifications: (params) => api.get('/admin/verifications', { params }),
  processVerification: (id, data) => api.put(`/admin/verifications/${id}`, data),
  getPendingPublications: (params) => api.get('/admin/moderation/pending', { params }),
  approvePublication: (id, data) => api.put(`/admin/moderation/${id}/approve`, data),
  rejectPublication: (id, data) => api.put(`/admin/moderation/${id}/reject`, data),
  resolvePublication: (id) => api.put(`/admin/moderation/${id}/resolve`),
  deletePublication: (id) => api.delete(`/admin/moderation/${id}`),
  getPublicationHistory: (params) => api.get('/admin/moderation/history', { params }),
  getConversations: (params) => api.get('/admin/conversations', { params }),
  getConversationMessages: (id, params) => api.get(`/admin/conversations/${id}/messages`, { params }),
  getSupportRequests: (params) => api.get('/support/requests', { params }),
  updateSupportRequest: (id, data) => api.put(`/support/requests/${id}`, data),
};

// ===================== SUPPORT =====================
export const supportAPI = {
  createRequest: (data) => api.post('/support/request', data),
  historyRequest: (data) => api.post('/support/history-request', data),
};

// ===================== NOTIFICATIONS =====================
export const notificationAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
};

export default api;
