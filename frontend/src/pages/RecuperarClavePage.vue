<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="recuperar-clave flex flex-center q-pa-md">
        <q-card v-if="loading" flat bordered class="recuperar-clave__card">
          <q-card-section class="text-center q-pa-xl">
            <q-spinner color="primary" size="40px" />
            <div class="q-mt-md text-grey">Validando enlace...</div>
          </q-card-section>
        </q-card>

        <q-card v-else-if="error" flat bordered class="recuperar-clave__card">
          <q-card-section class="text-center">
            <q-icon name="link_off" color="negative" size="64px" />
            <div class="text-h6 q-mt-md">Enlace no válido</div>
            <p class="text-body2 q-mt-sm">{{ error }}</p>
            <q-btn
              flat
              color="primary"
              label="Ir al login"
              class="q-mt-md"
              to="/login"
            />
          </q-card-section>
        </q-card>

        <q-card v-else-if="done" flat bordered class="recuperar-clave__card">
          <q-card-section class="text-center">
            <q-icon name="check_circle" color="positive" size="64px" />
            <div class="text-h6 q-mt-md">Contraseña actualizada</div>
            <p class="text-body2 q-mt-sm">{{ doneMessage }}</p>
            <q-btn
              unelevated
              color="primary"
              label="Iniciar sesión"
              class="q-mt-lg"
              to="/login"
            />
          </q-card-section>
        </q-card>

        <q-card v-else flat bordered class="recuperar-clave__card">
          <q-card-section>
            <div class="text-h6 q-mb-xs">Nueva contraseña</div>
            <div class="text-caption text-grey q-mb-sm">
              Usuario <strong>{{ info.usuario }}</strong>
              <span v-if="info.nombre"> · {{ info.nombre }}</span>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-form ref="formRef" @submit="onSubmit" class="q-gutter-md">
              <q-input
                v-model="form.clave"
                label="Nueva contraseña"
                :type="showClave ? 'text' : 'password'"
                outlined
                dense
                autocomplete="new-password"
                :rules="claveRules"
              >
                <template #append>
                  <q-btn
                    flat
                    round
                    dense
                    :icon="showClave ? 'visibility_off' : 'visibility'"
                    @click="showClave = !showClave"
                  />
                </template>
              </q-input>

              <q-input
                v-model="form.clave2"
                label="Confirmar contraseña"
                :type="showClave2 ? 'text' : 'password'"
                outlined
                dense
                autocomplete="new-password"
                :rules="confirmRules"
              >
                <template #append>
                  <q-btn
                    flat
                    round
                    dense
                    :icon="showClave2 ? 'visibility_off' : 'visibility'"
                    @click="showClave2 = !showClave2"
                  />
                </template>
              </q-input>

              <q-btn
                type="submit"
                label="Guardar contraseña"
                color="primary"
                unelevated
                class="full-width"
                :loading="saving"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { authApi } from 'src/services/api';

const route = useRoute();
const $q = useQuasar();
const formRef = ref(null);
const token = route.params.token;

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const done = ref(false);
const doneMessage = ref('');
const info = ref({ usuario: '', nombre: '' });
const showClave = ref(false);
const showClave2 = ref(false);
const form = ref({ clave: '', clave2: '' });

const claveRules = [
  (v) => !!String(v || '').trim() || 'Requerido',
  (v) => String(v || '').length >= 6 || 'Mínimo 6 caracteres',
];

const confirmRules = [
  (v) => !!String(v || '').trim() || 'Requerido',
  (v) => v === form.value.clave || 'Las contraseñas no coinciden',
];

onMounted(async () => {
  try {
    info.value = await authApi.validarRecuperarClave(token);
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudo validar el enlace';
  } finally {
    loading.value = false;
  }
});

async function onSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;

  saving.value = true;
  try {
    const data = await authApi.restablecerClave(token, form.value.clave, form.value.clave2);
    doneMessage.value = data.message;
    done.value = true;
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo actualizar la contraseña',
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.recuperar-clave {
  min-height: 100vh;
  background: linear-gradient(135deg, #eef2f7 0%, #dbeafe 100%);
}

.recuperar-clave__card {
  width: 100%;
  max-width: 440px;
  border-radius: 16px;
}
</style>
