<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="registro-publico flex flex-center q-pa-md">
        <q-card v-if="loading" flat bordered class="registro-publico__card">
          <q-card-section class="text-center q-pa-xl">
            <q-spinner color="primary" size="40px" />
            <div class="q-mt-md text-grey">Cargando...</div>
          </q-card-section>
        </q-card>

        <q-card v-else-if="error" flat bordered class="registro-publico__card">
          <q-card-section>
            <div class="text-h6 text-negative q-mb-sm">No se puede continuar</div>
            <p class="text-body2">{{ error }}</p>
          </q-card-section>
        </q-card>

        <q-card v-else-if="done" flat bordered class="registro-publico__card">
          <q-card-section class="text-center">
            <q-icon name="check_circle" color="positive" size="64px" />
            <div class="text-h6 q-mt-md">¡Gracias!</div>
            <p class="text-body2 q-mt-sm">{{ doneMessage }}</p>
            <p v-if="info?.tema" class="text-caption text-grey q-mt-md">{{ info.tema }}</p>
          </q-card-section>
        </q-card>

        <q-card v-else flat bordered class="registro-publico__card">
          <q-card-section>
            <div class="text-h6 q-mb-xs">Registro y firma de asistencia</div>
            <div class="text-caption text-grey q-mb-sm">
              Ingrese sus datos y firme. No necesita usuario del sistema.
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pt-sm">
            <div class="text-body2 q-mb-md">
              <div><strong>Cliente:</strong> {{ info.cliente }}</div>
              <div><strong>Tema:</strong> {{ info.tema || '—' }}</div>
              <div><strong>Fecha:</strong> {{ fmtFecha(info.fecha) }}</div>
              <div><strong>Capacitador:</strong> {{ info.capacitador || '—' }}</div>
            </div>

            <q-form ref="formRef" class="q-gutter-md q-mb-md">
              <q-input
                v-model="form.documento"
                label="Número de documento *"
                outlined
                dense
                :rules="[(v) => !!String(v || '').trim() || 'Requerido']"
              />
              <q-input
                v-model="form.nombres"
                label="Nombres y apellidos *"
                outlined
                dense
                :rules="[(v) => !!String(v || '').trim() || 'Requerido']"
              />
              <q-input v-model="form.cargo" label="Cargo" outlined dense />
              <q-input
                v-model="form.email"
                label="Correo *"
                type="email"
                outlined
                dense
                :rules="emailRules"
              />
            </q-form>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <SignaturePad
              titulo="Diligencie su firma en el recuadro"
              height="200px"
              :show-cancel="false"
              @save="onSave"
            />
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
import { api } from 'src/boot/axios';
import SignaturePad from 'components/SignaturePad.vue';

const $q = useQuasar();
const route = useRoute();
const formRef = ref(null);

const token = route.params.token;

const loading = ref(true);
const error = ref('');
const done = ref(false);
const doneMessage = ref('');
const info = ref(null);
const saving = ref(false);
const form = ref({ documento: '', nombres: '', cargo: '', email: '' });

const emailRules = [
  (v) => !!String(v || '').trim() || 'Requerido',
  (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()) || 'Correo inválido',
];

function fmtFecha(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('es-CO');
}

async function loadInfo() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get(`/public/registro/${encodeURIComponent(token)}`);
    info.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || 'Enlace inválido o expirado';
  } finally {
    loading.value = false;
  }
}

async function onSave(dataUrl) {
  if (saving.value) return;

  const valid = await formRef.value?.validate();
  if (!valid) {
    $q.notify({ type: 'warning', message: 'Complete documento, nombres y correo' });
    return;
  }

  saving.value = true;
  try {
    const { data } = await api.post(`/public/registro/${encodeURIComponent(token)}`, {
      ...form.value,
      firma: dataUrl,
    });
    doneMessage.value = data.message || 'Registro y firma guardados correctamente';
    done.value = true;
    $q.notify({ type: 'positive', message: 'Registro guardado' });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Error al guardar',
    });
  } finally {
    saving.value = false;
  }
}

onMounted(loadInfo);
</script>

<style scoped>
.registro-publico {
  min-height: 100vh;
  background: #f5f5f5;
}

.registro-publico__card {
  width: 100%;
  max-width: 520px;
}
</style>
