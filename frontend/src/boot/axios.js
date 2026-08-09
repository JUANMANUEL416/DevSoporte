import { boot } from 'quasar/wrappers';
import axios from 'axios';
import { useAuthStore } from 'src/stores/auth';

const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3300/api',
});

function applyRefreshedToken(token) {
  if (!token) return;
  localStorage.setItem('devsoporte_token', token);
  try {
    useAuthStore().refreshToken(token);
  } catch {
    // Pinia aún no inicializada en el primer arranque
  }
}

function forceLogout() {
  localStorage.removeItem('devsoporte_token');
  localStorage.removeItem('devsoporte_user');
  try {
    useAuthStore().logout();
  } catch {
    // Pinia aún no inicializada
  }
  const onLogin = window.location.hash.includes('/login') || window.location.pathname === '/login';
  if (!onLogin) {
    window.location.href = '/#/login?expired=1';
  }
}

// Adjunta el token JWT (si existe) a cada petición.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devsoporte_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Renueva sesión (sliding) y redirige al login si expiró.
api.interceptors.response.use(
  (response) => {
    applyRefreshedToken(response.headers['x-refresh-token']);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      forceLogout();
    }
    return Promise.reject(error);
  },
);

export default boot(({ app }) => {
  app.config.globalProperties.$api = api;
});

export { api };
