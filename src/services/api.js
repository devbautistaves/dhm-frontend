import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dhm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dhm_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  verify: () => api.get('/auth/verify'),
};

export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
};

export const backupApi = {
  download: () => api.get('/backup', { responseType: 'blob' }),
  restore: (products) => api.post('/backup/restore', { products }),
};

export const uploadApi = {
  image: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/upload', form);
  },
};

export default api;
