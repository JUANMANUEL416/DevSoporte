import { defineStore } from 'pinia';
import { authApi } from 'src/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('devsoporte_token') || null,
    user: JSON.parse(localStorage.getItem('devsoporte_user') || 'null'),
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async login(usuario, clave) {
      const { token, user } = await authApi.login(usuario, clave);
      this.token = token;
      this.user = user;
      localStorage.setItem('devsoporte_token', token);
      localStorage.setItem('devsoporte_user', JSON.stringify(user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('devsoporte_token');
      localStorage.removeItem('devsoporte_user');
    },
  },
});
