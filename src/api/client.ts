import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('dee_token');
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

// Handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and it's not a retry (avoid infinite loops)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('dee_refresh_token');

      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
          const { session } = response.data;
          
          if (session) {
            localStorage.setItem('dee_token', session.access_token);
            if (session.refresh_token) {
              localStorage.setItem('dee_refresh_token', session.refresh_token);
            }
            
            // Retry the original request with the new token
            originalRequest.headers['Authorization'] = `Bearer ${session.access_token}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // If refresh fails, clear tokens and redirect to login
          console.error('Session refresh failed:', refreshError);
          localStorage.removeItem('dee_token');
          localStorage.removeItem('dee_refresh_token');
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            window.location.href = '/login?expired=true';
          }
        }
      } else {
        // No refresh token available, logout
        localStorage.removeItem('dee_token');
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login?expired=true';
        }
      }
    }

    // For 403 or other non-refreshable 401s, just reject
    if (error.response?.status === 403) {
      // Potentially permissions issue, but we still trigger re-login for 403 as safety
      // unless we want to handle permissions separately
    }

    return Promise.reject(error);
  }
);

export default apiClient;
