export const API_BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://192.168.0.15:3000';
const API_URL = `${API_BASE_URL}/api`;

const TOKEN_KEY = 'agoo_admin_token';
const REFRESH_TOKEN_KEY = 'agoo_admin_refresh_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setTokens = (token: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  timeoutMs?: number;
};

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, requireAuth = true, timeoutMs = 8000 } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (requireAuth) {
    const token = getToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
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
    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new ApiError((data as any)?.error || 'Erreur serveur', res.status, data);
    }

    return data as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Erreur de connexion au serveur', 0, err);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError('Erreur de connexion au serveur', 0, err);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const authAPI = {
  login: (email: string, password: string) =>
    request<{ user: any; token: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      requireAuth: false,
    }),
  me: () => request<{ user: any }>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

export const reportsModerationAPI = {
  list: (params: { status: 'pending' | 'approved' | 'rejected'; limit?: number; page?: number }) => {
    const qs = new URLSearchParams();
    qs.set('status', params.status);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.page) qs.set('page', String(params.page));
    return request<{ reports: any[] }>(`/reports/moderation?${qs.toString()}`);
  },
  setModeration: (id: string, moderationStatus: 'pending' | 'approved' | 'rejected', rejectionReason?: string) =>
    request(`/reports/${id}/moderation`, {
      method: 'PUT',
      body: { moderationStatus, rejectionReason },
    }),
  remove: (id: string) => request(`/reports/${id}`, { method: 'DELETE' }),
};
