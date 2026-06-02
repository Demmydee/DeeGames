import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const adminClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject the specific admin token
adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('dee_admin_token');
  if (token) {
    if (config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      config.headers = {
        'Authorization': `Bearer ${token}`
      } as any;
    }
  }
  return config;
});

// Interceptor to auto-logout admin on token expiration (401)
adminClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('Administrative session unauthorized or expired.');
      localStorage.removeItem('dee_admin_token');
      localStorage.removeItem('dee_admin_user');
      
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default adminClient;
