import { boot } from 'quasar/wrappers';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3300/api',
});

// Adjunta el token JWT (si existe) a cada petición.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devsoporte_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default boot(({ app }) => {
  app.config.globalProperties.$api = api;
});

export { api };
