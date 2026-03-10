import axios from 'axios';

// Use environment variable for API base URL, fallback to local dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const WIREFRAME_API_URL = import.meta.env.VITE_WIREFRAME_API_URL || 'http://localhost:5000';

// Create axios instances with shared config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const wireframeApi = axios.create({
  baseURL: WIREFRAME_API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch {
        // Invalid storage, skip
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on unauthorized
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== Auth API =====
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};

// ===== Projects API =====
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// ===== Onboarding API =====
export const onboardingAPI = {
  save: (payload) => api.post('/onboarding', payload),
  get: (userId) => api.get(`/onboarding/${userId}`),
  getStatus: (userId) => api.get(`/onboarding/${userId}/status`),
};

// ===== Wireframe API =====
export const wireframeAPI = {
  generate: (prompt, sessionId, existingWireframe) =>
    wireframeApi.post('/api/wireframe/generate', { prompt, sessionId, existingWireframe }),
  generateFromChatbot: (prompt) =>
    wireframeApi.post('/generate-wireframe', { prompt }),
};

// ===== Questionnaire API =====
export const questionnaireAPI = {
  start: (prompt) => api.post('/questionnaire/start', { prompt }),
  answer: (sessionId, answer, currentQuestion) =>
    api.post('/questionnaire/answer', { sessionId, answer, currentQuestion }),
};

export { API_BASE_URL, WIREFRAME_API_URL };
export default api;
