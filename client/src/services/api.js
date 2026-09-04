import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT to outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      console.warn('Session expired or unauthorized');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  guestLogin: () => api.post('/auth/guest'),
  getMe: () => api.get('/auth/me')
};

export const networkAPI = {
  getNetworks: () => api.get('/networks'),
  getNetworkById: (id) => api.get(`/networks/${id}`),
  createNetwork: (data) => api.post('/networks', data),
  updateNetwork: (id, data) => api.put(`/networks/${id}`, data),
  deleteNetwork: (id) => api.delete(`/networks/${id}`),
  simulate: (id, data) => api.post(`/networks/${id}/simulate`, data),
  ping: (id, data) => api.post(`/networks/${id}/ping`, data),
  debugTopology: (id, data) => api.post(`/networks/${id}/debug`, data)
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data)
};

export default api;
