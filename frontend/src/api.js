import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Intercept responses for auth errors and normalize error detail payloads
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    // Normalize error.response.data.detail into a safe human-readable string
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (Array.isArray(detail)) {
        // Handle FastAPI validation error list: [{loc, msg, type}, ...]
        error.response.data.detail = detail
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
              return field ? `${field}: ${item.msg || JSON.stringify(item)}` : (item.msg || JSON.stringify(item));
            }
            return String(item);
          })
          .join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        error.response.data.detail = detail.msg || detail.message || JSON.stringify(detail);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
