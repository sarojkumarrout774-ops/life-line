import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

// Attach JWT on every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login:    (data) => API.post('/auth/login', data),
  refresh:  ()     => API.post('/auth/refresh', { token: localStorage.getItem('token') }),
};

// ── Users ─────────────────────────────────────────────────
export const userAPI = {
  getMe:       ()     => API.get('/users/me'),
  updateMe:    (data) => API.patch('/users/me', data),
  getBadges:   (id)   => API.get(`/users/${id}/badges`),
};

// ── Donors ────────────────────────────────────────────────
export const donorAPI = {
  getNearby:       (params) => API.get('/donors/nearby', { params }),
  setAvailability: (id, data) => API.put(`/donors/${id}/availability`, data),
  getProfile:      (id)    => API.get(`/donors/${id}/profile`),
};

// ── Blood Requests ────────────────────────────────────────
export const requestAPI = {
  create:  (data)       => API.post('/requests', data),
  list:    (params)     => API.get('/requests', { params }),
  get:     (id)         => API.get(`/requests/${id}`),
  respond: (id, data)   => API.post(`/requests/${id}/respond`, data),
  update:  (id, data)   => API.patch(`/requests/${id}`, data),
};

// ── SOS ───────────────────────────────────────────────────
export const sosAPI = {
  broadcast: (data) => API.post('/sos', data),
  getActive: (params) => API.get('/sos/active', { params }),
  resolve:   (id)   => API.post(`/sos/${id}/resolve`),
};

// ── Donations ─────────────────────────────────────────────
export const donationAPI = {
  confirm:     (data) => API.post('/donations/confirm', data),
  myHistory:   ()     => API.get('/donations/my'),
  eligibility: ()     => API.get('/donations/eligibility'),
};

// ── Notifications ─────────────────────────────────────────
export const notificationAPI = {
  list:       ()   => API.get('/notifications'),
  readAll:    ()   => API.patch('/notifications/read-all'),
  read:       (id) => API.patch(`/notifications/${id}/read`),
  saveFCM:    (token) => API.put('/notifications/fcm-token', { fcm_token: token }),
};

// ── Chat ──────────────────────────────────────────────────
export const chatAPI = {
  conversations: ()        => API.get('/chat/conversations'),
  thread:        (userId)  => API.get(`/chat/${userId}`),
  send:          (userId, data) => API.post(`/chat/${userId}`, data),
};

// ── Blood Banks ───────────────────────────────────────────
export const bloodBankAPI = {
  nearby: (params) => API.get('/blood-banks/nearby', { params }),
};

// ── AI ────────────────────────────────────────────────────
export const aiAPI = {
  match:   (data) => API.post('/ai/match', data),
  predict: (data) => API.post('/ai/predict', data),
};

export default API;
