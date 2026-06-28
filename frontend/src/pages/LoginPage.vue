<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="login-page">
        <div class="login-page__bg" aria-hidden="true">
          <span class="login-page__orb login-page__orb--1" />
          <span class="login-page__orb login-page__orb--2" />
          <span class="login-page__orb login-page__orb--3" />
        </div>

        <div class="login-page__content">
          <section class="login-page__hero">
            <div class="login-page__brand">
              <q-icon name="support_agent" size="42px" />
            </div>
            <h1 class="login-page__title">DevSoporte</h1>
            <p class="login-page__tagline">
              Gestión de soporte, bitácora y capacitaciones en un solo lugar.
            </p>
            <ul class="login-page__features">
              <li><q-icon name="check_circle" /> Bitácora y reportes al cliente</li>
              <li><q-icon name="check_circle" /> Capacitaciones y cronogramas</li>
              <li><q-icon name="check_circle" /> Firma digital y notificaciones</li>
            </ul>
          </section>

          <q-card flat bordered class="login-page__card">
            <transition name="login-fade" mode="out-in">
              <div v-if="view === 'login'" key="login">
                <q-card-section class="login-page__card-head">
                  <div class="text-h6">Bienvenido</div>
                  <div class="text-caption text-grey-7">Inicie sesión para continuar</div>
                </q-card-section>

                <q-card-section class="q-pt-none">
                  <q-form @submit="onSubmit" class="q-gutter-md">
                    <q-input
                      v-model="usuario"
                      label="Usuario"
                      outlined
                      dense
                      autofocus
                      autocomplete="username"
                      :rules="[(v) => !!String(v || '').trim() || 'Requerido']"
                    >
                      <template #prepend>
                        <q-icon name="person_outline" />
                      </template>
                    </q-input>

                    <q-input
                      v-model="clave"
                      label="Contraseña"
                      :type="showPassword ? 'text' : 'password'"
                      outlined
                      dense
                      autocomplete="current-password"
                      :rules="[(v) => !!String(v || '').trim() || 'Requerido']"
                    >
                      <template #prepend>
                        <q-icon name="lock_outline" />
                      </template>
                      <template #append>
                        <q-btn
                          flat
                          round
                          dense
                          :icon="showPassword ? 'visibility_off' : 'visibility'"
                          @click="showPassword = !showPassword"
                        />
                      </template>
                    </q-input>

                    <q-btn
                      type="submit"
                      label="Ingresar"
                      color="primary"
                      unelevated
                      class="full-width login-page__submit"
                      :loading="loading"
                    />
                  </q-form>
                </q-card-section>

                <q-card-section class="q-pt-none text-center">
                  <q-btn
                    flat
                    dense
                    no-caps
                    color="primary"
                    label="¿Olvidó su contraseña?"
                    class="login-page__link"
                    @click="view = 'recover'"
                  />
                  <div class="text-caption text-grey-6 q-mt-xs">
                    Disponible para técnicos de soporte con correo registrado
                  </div>
                </q-card-section>
              </div>

              <div v-else key="recover">
                <q-card-section class="login-page__card-head">
                  <div class="text-h6">Recuperar contraseña</div>
                  <div class="text-caption text-grey-7">
                    Le enviaremos un enlace seguro a su correo
                  </div>
                </q-card-section>

                <q-card-section class="q-pt-none">
                  <q-form @submit="onRecover" class="q-gutter-md">
                    <q-banner rounded class="bg-blue-1 text-blue-10 q-mb-sm">
                      <template #avatar>
                        <q-icon name="info" color="primary" />
                      </template>
                      Solo aplica a usuarios de soporte. Debe tener un correo registrado por el administrador.
                    </q-banner>

                    <q-input
                      v-model="recoverUsuario"
                      label="Usuario de acceso"
                      outlined
                      dense
                      autofocus
                      autocomplete="username"
                      :rules="[(v) => !!String(v || '').trim() || 'Requerido']"
                    >
                      <template #prepend>
                        <q-icon name="badge" />
                      </template>
                    </q-input>

                    <q-btn
                      type="submit"
                      label="Enviar enlace"
                      color="primary"
                      unelevated
                      class="full-width login-page__submit"
                      :loading="recoverLoading"
                    />
                  </q-form>
                </q-card-section>

                <q-card-section class="q-pt-none text-center">
                  <q-btn
                    flat
                    dense
                    no-caps
                    color="grey-8"
                    icon="arrow_back"
                    label="Volver al login"
                    @click="view = 'login'"
                  />
                </q-card-section>
              </div>
            </transition>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { authApi } from 'src/services/api';

const usuario = ref('');
const clave = ref('');
const recoverUsuario = ref('');
const showPassword = ref(false);
const loading = ref(false);
const recoverLoading = ref(false);
const view = ref('login');

const auth = useAuthStore();
const router = useRouter();
const $q = useQuasar();

async function onSubmit() {
  loading.value = true;
  try {
    await auth.login(usuario.value, clave.value);
    router.push('/');
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error de autenticación' });
  } finally {
    loading.value = false;
  }
}

async function onRecover() {
  recoverLoading.value = true;
  try {
    const data = await authApi.solicitarRecuperarClave(recoverUsuario.value);
    $q.notify({
      type: 'positive',
      message: data.message,
      timeout: 6000,
    });
    view.value = 'login';
    usuario.value = recoverUsuario.value;
    recoverUsuario.value = '';
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo procesar la solicitud',
    });
  } finally {
    recoverLoading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 45%, #0d9488 100%);
}

.login-page__bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.login-page__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.45;
  animation: login-float 14s ease-in-out infinite;
}

.login-page__orb--1 {
  width: 320px;
  height: 320px;
  background: #38bdf8;
  top: -80px;
  right: 10%;
}

.login-page__orb--2 {
  width: 260px;
  height: 260px;
  background: #2dd4bf;
  bottom: 10%;
  left: -60px;
  animation-delay: -4s;
}

.login-page__orb--3 {
  width: 180px;
  height: 180px;
  background: #818cf8;
  top: 40%;
  left: 35%;
  animation-delay: -8s;
}

@keyframes login-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-18px) scale(1.05);
  }
}

.login-page__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  align-items: center;
  min-height: 100vh;
  padding: 32px 20px;
  max-width: 980px;
  margin: 0 auto;
}

@media (min-width: 900px) {
  .login-page__content {
    grid-template-columns: 1.05fr 0.95fr;
    padding: 48px 32px;
  }
}

.login-page__hero {
  color: #f8fafc;
  text-align: center;
}

@media (min-width: 900px) {
  .login-page__hero {
    text-align: left;
  }
}

.login-page__brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  margin-bottom: 16px;
}

.login-page__title {
  margin: 0 0 8px;
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.login-page__tagline {
  margin: 0 0 24px;
  font-size: 1.05rem;
  line-height: 1.6;
  color: rgba(248, 250, 252, 0.88);
}

.login-page__features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.login-page__features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: rgba(248, 250, 252, 0.92);
}

.login-page__features .q-icon {
  color: #5eead4;
}

.login-page__card {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(12px);
}

.login-page__card-head {
  padding-bottom: 8px;
}

.login-page__submit {
  border-radius: 10px;
  padding: 10px 0;
  font-weight: 600;
}

.login-page__link {
  font-weight: 500;
}

.login-fade-enter-active,
.login-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.login-fade-enter-from,
.login-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
