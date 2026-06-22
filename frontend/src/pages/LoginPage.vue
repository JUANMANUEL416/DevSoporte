<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-3">
        <q-card style="width: 360px" class="q-pa-md">
          <q-card-section class="text-center">
            <q-icon name="support_agent" size="48px" color="primary" />
            <div class="text-h5 q-mt-sm">DevSoporte</div>
            <div class="text-caption text-grey">Inicie sesión para continuar</div>
          </q-card-section>

          <q-card-section>
            <q-form @submit="onSubmit" class="q-gutter-md">
              <q-input
                v-model="usuario"
                label="Usuario"
                outlined
                autofocus
                :rules="[(v) => !!v || 'Requerido']"
              />
              <q-input
                v-model="clave"
                label="Clave"
                type="password"
                outlined
                :rules="[(v) => !!v || 'Requerido']"
              />
              <q-btn
                type="submit"
                label="Ingresar"
                color="primary"
                class="full-width"
                :loading="loading"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth';

const usuario = ref('');
const clave = ref('');
const loading = ref(false);
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
</script>
