import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Helper to get token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // --- Auth ---
  async signup(username, password) {
    const res = await axios.post(`${API_URL}/auth/signup`, { username, password });
    return res.data;
  },

  async login(username, password) {
    const res = await axios.post(`${API_URL}/auth/login`, { username, password });
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // --- Notes ---
  async getNotes() {
    const res = await axios.get(`${API_URL}/notes`, { headers: getAuthHeaders() });
    return res.data;
  },

  async createNote(title, content, tags = '') {
    const res = await axios.post(`${API_URL}/notes`, { title, content, tags }, { headers: getAuthHeaders() });
    return res.data;
  },

  async updateNote(id, title, content, tags = '') {
    const res = await axios.put(`${API_URL}/notes/${id}`, { title, content, tags }, { headers: getAuthHeaders() });
    return res.data;
  },

  async deleteNote(id) {
    await axios.delete(`${API_URL}/notes/${id}`, { headers: getAuthHeaders() });
    return true;
  },

  async getHistory(id) {
    const res = await axios.get(`${API_URL}/notes/${id}/history`, { headers: getAuthHeaders() });
    return res.data;
  }
};
