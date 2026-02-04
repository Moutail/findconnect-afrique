// Configuration API pour Agoo Alert - Remplace Firebase
// Ce fichier contient toutes les fonctions pour communiquer avec le backend Node.js/Express

import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

// ============ CONFIGURATION ============

// URL du backend - À modifier selon l'environnement
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.0.15:3000' // IP locale pour le développement
  : 'https://api.agoo-alert.com'; // URL de production

const API_URL = `${API_BASE_URL}/api`;

// Clés de stockage
const TOKEN_KEY = '@agoo_token';
const REFRESH_TOKEN_KEY = '@agoo_refresh_token';
const USER_KEY = '@agoo_user';

// ============ GESTION DES TOKENS ============

let authToken: string | null = null;
let refreshToken: string | null = null;

let lastAuthCheckAt = 0;
let lastAuthCheckResult: boolean | null = null;

export const getToken = async (): Promise<string | null> => {
  if (authToken) return authToken;
  authToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (!refreshToken) {
    refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return authToken;
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (refreshToken) return refreshToken;
  refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  return refreshToken;
};

export const setTokens = async (token: string, refresh: string): Promise<void> => {
  authToken = token;
  refreshToken = refresh;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

export const clearTokens = async (): Promise<void> => {
  authToken = null;
  refreshToken = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
};

// ============ CLIENT HTTP ============

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  timeoutMs?: number;
}

const AUTH_PUBLIC_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const request = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { method = 'GET', body, headers = {}, requireAuth = true, timeoutMs = 8000 } = options;
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  if (requireAuth) {
    const token = await getToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    signal: controller.signal,
  };
  
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      // Si token expiré, essayer de rafraîchir
      if (
        response.status === 401 &&
        requireAuth &&
        !AUTH_PUBLIC_ENDPOINTS.has(endpoint) &&
        (await getRefreshToken())
      ) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          // Réessayer la requête
          return request(endpoint, options);
        }
      }
      
      throw new ApiError(data.error || 'Erreur serveur', response.status, data);
    }
    
    return data;
  } catch (error) {
    if ((error as any)?.name === 'AbortError') {
      throw new ApiError('Erreur de connexion au serveur', 0, error);
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError('Erreur de connexion au serveur', 0, error);
  } finally {
    clearTimeout(timeoutId);
  }
};

const refreshAuthToken = async (): Promise<boolean> => {
  try {
    const refresh = await getRefreshToken();
    if (!refresh) return false;
    
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    
    if (!response.ok) {
      await clearTokens();
      return false;
    }
    
    const data = await response.json();
    await setTokens(data.token, data.refreshToken);
    return true;
  } catch {
    await clearTokens();
    return false;
  }
};

// ============ SOCKET.IO ============

let socket: Socket | null = null;

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;
  
  const token = await getToken();
  
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  
  socket.on('connect', () => {
    console.log('✅ Socket connecté');
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Socket déconnecté');
  });
  
  socket.on('connect_error', (error: Error) => {
    console.error('Erreur de connexion socket:', error.message);
  });
  
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;

// ============ API AUTHENTIFICATION ============

export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
  }) => {
    const response = await request('/auth/register', {
      method: 'POST',
      body: data,
      requireAuth: false,
    });
    await setTokens(response.token, response.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    return response;
  },
  
  login: async (email: string, password: string) => {
    const response = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
      requireAuth: false,
    });
    await setTokens(response.token, response.refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    return response;
  },
  
  logout: async (pushToken?: string) => {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: { pushToken },
      });
    } finally {
      await clearTokens();
      disconnectSocket();
    }
  },
  
  getMe: async () => {
    return request('/auth/me');
  },
  
  forgotPassword: async (email: string) => {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      requireAuth: false,
    });
  },
  
  resetPassword: async (token: string, password: string) => {
    return request('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
      requireAuth: false,
    });
  },
  
  changePassword: async (currentPassword: string, newPassword: string) => {
    return request('/auth/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  },
  
  // Vérifier si l'utilisateur est connecté
  isAuthenticated: async (): Promise<boolean> => {
    const token = await getToken();
    if (!token) return false;

    const now = Date.now();
    // Cache 20s pour éviter de spammer /auth/me et déclencher le rate limit
    if (lastAuthCheckResult !== null && now - lastAuthCheckAt < 20000) {
      return lastAuthCheckResult;
    }

    lastAuthCheckAt = now;
    try {
      await authAPI.getMe();
      lastAuthCheckResult = true;
      return true;
    } catch {
      lastAuthCheckResult = false;
      return false;
    }
  },
  
  // Récupérer l'utilisateur stocké localement
  getStoredUser: async () => {
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
};

// ============ API UTILISATEURS ============

export const usersAPI = {
  getProfile: async () => {
    return request('/users/profile');
  },
  
  updateProfile: async (data: {
    displayName?: string;
    phone?: string;
    photoURL?: string;
    preferredLocation?: any;
    notificationPreferences?: any;
  }) => {
    const response = await request('/users/profile', {
      method: 'PUT',
      body: data,
    });
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
    return response;
  },
  
  completeOnboarding: async (preferredLocation?: any) => {
    return request('/users/complete-onboarding', {
      method: 'POST',
      body: { preferredLocation },
    });
  },
  
  registerPushToken: async (pushToken: string) => {
    return request('/users/push-token', {
      method: 'POST',
      body: { pushToken },
    });
  },
  
  getUser: async (userId: string) => {
    return request(`/users/${userId}`);
  },
  
  submitVerificationRequest: async (data: {
    documents: any;
    personalInfo: any;
  }) => {
    return request('/users/verification-request', {
      method: 'POST',
      body: data,
    });
  },
  
  getVerificationStatus: async () => {
    return request('/users/verification-request/status');
  },
  
  deleteAccount: async (password: string) => {
    return request('/users/account', {
      method: 'DELETE',
      body: { password },
    });
  },
};

// ============ API SIGNALEMENTS ============

export const reportsAPI = {
  getReports: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    city?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const query = queryParams.toString();
    return request(`/reports${query ? `?${query}` : ''}`, { requireAuth: false });
  },
  
  getMyReports: async () => {
    return request('/reports/my');
  },
  
  searchReports: async (query: string, page = 1) => {
    return request(`/reports/search?q=${encodeURIComponent(query)}&page=${page}`, {
      requireAuth: false,
    });
  },
  
  getReport: async (id: string) => {
    return request(`/reports/${id}`, { requireAuth: false });
  },
  
  createReport: async (data: {
    title: string;
    description: string;
    mainCategory: string;
    categoryMetadata?: any;
    location?: any;
    images?: any[];
    contactPreference?: string;
    contactPhone?: string;
    reward?: any;
    incidentDate?: Date;
  }) => {
    return request('/reports', {
      method: 'POST',
      body: data,
    });
  },
  
  updateReport: async (id: string, data: any) => {
    return request(`/reports/${id}`, {
      method: 'PUT',
      body: data,
    });
  },
  
  updateReportStatus: async (id: string, status: 'active' | 'resolved' | 'closed') => {
    return request(`/reports/${id}/status`, {
      method: 'PUT',
      body: { status },
    });
  },
  
  deleteReport: async (id: string) => {
    return request(`/reports/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Demandes de chat
  sendChatRequest: async (reportId: string, message?: string) => {
    return request(`/reports/${reportId}/chat-request`, {
      method: 'POST',
      body: { message },
    });
  },
  
  getChatRequests: async (reportId: string) => {
    return request(`/reports/${reportId}/chat-requests`);
  },
  
  respondToChatRequest: async (
    reportId: string,
    requestId: string,
    status: 'accepted' | 'rejected',
    responseMessage?: string
  ) => {
    return request(`/reports/${reportId}/chat-requests/${requestId}`, {
      method: 'PUT',
      body: { status, responseMessage },
    });
  },
};

// ============ API ORGANISATIONS ============

export const organizationsAPI = {
  getOrganizations: async (params?: {
    type?: string;
    city?: string;
    verified?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const query = queryParams.toString();
    return request(`/organizations${query ? `?${query}` : ''}`, { requireAuth: false });
  },
  
  getMyOrganizations: async () => {
    return request('/organizations/my');
  },
  
  getOrganization: async (id: string) => {
    return request(`/organizations/${id}`, { requireAuth: false });
  },
  
  createOrganization: async (data: any) => {
    return request('/organizations', {
      method: 'POST',
      body: data,
    });
  },
  
  updateOrganization: async (id: string, data: any) => {
    return request(`/organizations/${id}`, {
      method: 'PUT',
      body: data,
    });
  },
  
  // Membres
  getMembers: async (orgId: string) => {
    return request(`/organizations/${orgId}/members`);
  },
  
  addMember: async (orgId: string, userId: string, role: string) => {
    return request(`/organizations/${orgId}/members`, {
      method: 'POST',
      body: { userId, role },
    });
  },
  
  updateMember: async (orgId: string, memberId: string, data: any) => {
    return request(`/organizations/${orgId}/members/${memberId}`, {
      method: 'PUT',
      body: data,
    });
  },
  
  removeMember: async (orgId: string, memberId: string) => {
    return request(`/organizations/${orgId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },
  
  // Publications
  publishReport: async (orgId: string, data: any) => {
    return request(`/organizations/${orgId}/reports`, {
      method: 'POST',
      body: data,
    });
  },
  
  getOrgReports: async (orgId: string, page = 1) => {
    return request(`/organizations/${orgId}/reports?page=${page}`, { requireAuth: false });
  },
};

// ============ API CONVERSATIONS ============

export const conversationsAPI = {
  getConversations: async () => {
    return request('/conversations');
  },
  
  getConversation: async (id: string) => {
    return request(`/conversations/${id}`);
  },
  
  getMessages: async (conversationId: string, page = 1) => {
    return request(`/conversations/${conversationId}/messages?page=${page}`);
  },
  
  sendMessage: async (conversationId: string, content: string, type = 'text', attachment?: any) => {
    return request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { content, type, attachment },
    });
  },
  
  deleteMessage: async (conversationId: string, messageId: string) => {
    return request(`/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
  
  blockConversation: async (id: string) => {
    return request(`/conversations/${id}/block`, {
      method: 'PUT',
    });
  },
  
  startConversation: async (userId: string, reportId?: string) => {
    return request('/conversations/start', {
      method: 'POST',
      body: { userId, reportId },
    });
  },
};

// ============ API UPLOAD ============

export const uploadAPI = {
  uploadImage: async (uri: string): Promise<{ url: string; thumbnail: string }> => {
    const token = await getToken();
    
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const rawExt = match ? match[1].toLowerCase() : '';
    const normalizedExt = rawExt === 'jpg' ? 'jpeg' : rawExt;
    const type = normalizedExt ? `image/${normalizedExt}` : 'image/jpeg';
    
    formData.append('image', {
      uri,
      name: filename,
      type,
    } as any);
    
    const response = await fetch(`${API_URL}/upload/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Erreur upload', response.status);
    }
    
    return response.json();
  },
  
  uploadImages: async (uris: string[]): Promise<{ images: Array<{ url: string; thumbnail: string }> }> => {
    const token = await getToken();
    
    const formData = new FormData();
    uris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const rawExt = match ? match[1].toLowerCase() : '';
      const normalizedExt = rawExt === 'jpg' ? 'jpeg' : rawExt;
      const type = normalizedExt ? `image/${normalizedExt}` : 'image/jpeg';
      
      formData.append('images', {
        uri,
        name: filename,
        type,
      } as any);
    });
    
    const response = await fetch(`${API_URL}/upload/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Erreur upload', response.status);
    }
    
    return response.json();
  },
  
  uploadDocument: async (uri: string, name: string): Promise<{ url: string; filename: string }> => {
    const token = await getToken();
    
    const formData = new FormData();
    formData.append('document', {
      uri,
      name,
      type: 'application/pdf',
    } as any);
    
    const response = await fetch(`${API_URL}/upload/document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error || 'Erreur upload', response.status);
    }
    
    return response.json();
  },
  
  deleteFile: async (type: 'images' | 'documents', filename: string) => {
    return request(`/upload/${type}/${filename}`, {
      method: 'DELETE',
    });
  },
};

// ============ EXPORT PAR DÉFAUT ============

export default {
  auth: authAPI,
  users: usersAPI,
  reports: reportsAPI,
  organizations: organizationsAPI,
  conversations: conversationsAPI,
  upload: uploadAPI,
  connectSocket,
  disconnectSocket,
  getSocket,
  getToken,
  clearTokens,
  API_URL,
  API_BASE_URL,
};
