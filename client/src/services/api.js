import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
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
  traceroute: (id, data) => api.post(`/networks/${id}/traceroute`, data),
  replay: (id, data) => api.post(`/networks/${id}/replay`, data),
  debugTopology: (id, data) => api.post(`/networks/${id}/debug`, data),
  assist: (id, data) => api.post(`/networks/${id}/assist`, data),
  assistDiagnostics: (id, data) => api.post(`/networks/${id}/assist/diagnostics`, data),
  getSnapshots: (id) => api.get(`/networks/${id}/snapshots`),
  createSnapshot: (id, data) => api.post(`/networks/${id}/snapshots`, data),
  compareSnapshots: (id, data) => api.post(`/networks/${id}/snapshots/compare`, data),
  restoreSnapshot: (id, snapshotId) => api.post(`/networks/${id}/snapshots/${snapshotId}/restore`),
  getLabReport: (id, data) => api.post(`/networks/${id}/report`, data),
  getInstructorAssignments: () => api.get('/networks/instructor/assignments'),
  getInstructorSubmissions: () => api.get('/networks/instructor/submissions'),
  gradeSubmission: (submissionId, data) => api.put(`/networks/instructor/submissions/${submissionId}`, data)
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data)
};

export const modulationAPI = {
  modulateFsk: (data) => api.post('/modulation/fsk/modulate', data),
  demodulateFsk: (data) => api.post('/modulation/fsk/demodulate', data),
  analyzeFsk: (data) => api.post('/modulation/fsk/analyze', data),
  sweepNoise: (data) => api.post('/modulation/fsk/sweep-noise', data),
  compareModulation: (data) => api.post('/modulation/compare', data)
};

export const labAPI = {
  getLabs: () => api.get('/labs'),
  getActiveLab: () => api.get('/labs/active'),
  getMyActiveLab: () => api.get('/labs/my-active'),
  getInstructorLabs: () => api.get('/labs/instructor/labs'),
  createLab: (data) => api.post('/labs', data),
  joinLab: (data) => api.post('/labs/join', data),
  getLabById: (id) => api.get(`/labs/${id}`),
  updateLab: (id, data) => api.put(`/labs/${id}`, data),
  updateProgress: (id, data) => api.post(`/labs/${id}/progress`, data),
  closeLab: (id) => api.put(`/labs/${id}/close`)
};

export const experimentAPI = {
  getExperiments: () => api.get('/experiments'),
  getExperimentById: (id) => api.get(`/experiments/${id}`),
  submitExperiment: (id, data) => api.post(`/experiments/${id}/submit`, data),
  getResults: () => api.get('/experiments/results/all'),
  getStudentSubmissions: (studentId) => api.get(`/experiments/submissions/student/${studentId}`),
  evaluateSubmission: (id, data) => api.put(`/experiments/submissions/${id}/evaluate`, data),
  getReports: () => api.get('/experiments/reports/all')
};

export default api;
