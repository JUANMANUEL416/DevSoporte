import { defineStore } from 'pinia';
import { authApi } from 'src/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('devsoporte_token') || null,
    user: JSON.parse(localStorage.getItem('devsoporte_user') || 'null'),
    adminGranted: false,
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
      this.adminGranted = false;
      localStorage.removeItem('devsoporte_token');
      localStorage.removeItem('devsoporte_user');
    },
    grantAdmin() {
      this.adminGranted = true;
    },
    revokeAdmin() {
      this.adminGranted = false;
    },
  },
});
