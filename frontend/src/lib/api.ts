import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
	if (config.data instanceof FormData) {
		if (config.headers && typeof config.headers.delete === 'function') {
			config.headers.delete('Content-Type');
		} else if (config.headers) {
			delete config.headers['Content-Type'];
			delete config.headers['content-type'];
		}
	}
	return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  verifyLoginOtp: (pendingLoginId: string, otp: string) =>
    api.post('/auth/login/verify-otp', { pendingLoginId, otp }),
  resendLoginOtp: (pendingLoginId: string) =>
    api.post('/auth/login/resend-otp', { pendingLoginId }),
  me: () => api.get('/admin/me'),
  requestAccountOTP: (data: Record<string, string>) =>
    api.post('/admin/account/request-otp', data),
  verifyAccountOTP: (pendingId: string, otp: string) =>
    api.post('/admin/account/verify-otp', { pendingId, otp }),
};

// Projects
export const projectsAPI = {
  getPublic: () => api.get('/projects'),
  getBySlug: (slug: string) => api.get(`/projects/${slug}`),
  getById: (id: string) => api.get(`/admin/projects/${id}`),
  getAll: (params?: Record<string, string>) =>
    api.get('/admin/projects', { params }),
  create: (data: FormData) =>
    api.post('/admin/projects', data),
  update: (id: string, data: FormData) =>
    api.put(`/admin/projects/${id}`, data),
  delete: (id: string) => api.delete(`/admin/projects/${id}`),
  addMedia: (id: string, data: FormData) =>
    api.post(`/admin/projects/${id}/media`, data),
  deleteMedia: (projectId: string, mediaId: string) =>
    api.delete(`/admin/projects/${projectId}/media/${mediaId}`),
};

// Skills
export const skillsAPI = {
  getPublic: () => api.get('/skills'),
  getById: (id: string) => api.get(`/admin/skills/${id}`),
  getAll: (params?: Record<string, string>) =>
    api.get('/admin/skills', { params }),
  create: (data: Record<string, unknown>) => api.post('/admin/skills', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/skills/${id}`, data),
  delete: (id: string) => api.delete(`/admin/skills/${id}`),
};

// Certificates
export const certificatesAPI = {
  getPublic: () => api.get('/certificates'),
  getById: (id: string) => api.get(`/admin/certificates/${id}`),
  getAll: (params?: Record<string, string>) =>
    api.get('/admin/certificates', { params }),
  create: (data: FormData) =>
    api.post('/admin/certificates', data),
  update: (id: string, data: FormData) =>
    api.put(`/admin/certificates/${id}`, data),
  delete: (id: string) => api.delete(`/admin/certificates/${id}`),
};

// Experiences
export const experiencesAPI = {
  getPublic: () => api.get('/experiences'),
  getById: (id: string) => api.get(`/admin/experiences/${id}`),
  getAll: (params?: Record<string, string>) =>
    api.get('/admin/experiences', { params }),
  create: (data: FormData) =>
    api.post('/admin/experiences', data),
  update: (id: string, data: FormData) =>
    api.put(`/admin/experiences/${id}`, data),
  delete: (id: string) => api.delete(`/admin/experiences/${id}`),
};

// Messages
export const messagesAPI = {
  send: (data: Record<string, string>) => api.post('/messages', data),
  getAll: (params?: Record<string, string>) =>
    api.get('/admin/messages', { params }),
  markAsRead: (id: string) => api.put(`/admin/messages/${id}/read`),
  delete: (id: string) => api.delete(`/admin/messages/${id}`),
  countUnread: () => api.get('/admin/messages/unread'),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/admin/dashboard/stats'),
};

// Visitors
export const visitorsAPI = {
  track: (page: string) =>
    api.post('/analytics/track', { page, session_id: getSessionId() }),
  getStats: () => api.get('/analytics/visitors'),
};

// Settings
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (data: Record<string, string>) => api.put('/admin/settings', data),
  uploadProfileImage: (data: FormData) =>
    api.post('/admin/settings/upload', data),
};

// Translations
export const translationsAPI = {
  getByLang: (lang: string) => api.get(`/translations/${lang}`),
  update: (lang: string, translations: Record<string, string>) =>
    api.put('/admin/translations', { lang, translations }),
};

// Security
export const securityAPI = {
  getPublicSettings: () => api.get('/public/security-settings'),
  getAdminSettings: () => api.get('/admin/security-settings'),
  updateSetting: (settingKey: string, newValue: boolean) =>
    api.post('/admin/security-settings/update', { settingKey, newValue }),
  requestOTP: (settingKey: string, newValue: boolean) =>
    api.post('/admin/security-settings/request-otp', { settingKey, newValue }),
  verifyOTP: (settingKey: string, newValue: boolean, otp: string) =>
    api.post('/admin/security-settings/verify-otp', { settingKey, newValue, otp }),
};

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('visitor_sid');
  if (!sid) {
    sid = Math.random().toString(36).substring(2);
    sessionStorage.setItem('visitor_sid', sid);
  }
  return sid;
}

export default api;
