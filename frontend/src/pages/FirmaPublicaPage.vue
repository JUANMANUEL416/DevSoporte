<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="firma-publica flex flex-center q-pa-md">
        <q-card v-if="loading" flat bordered class="firma-publica__card">
          <q-card-section class="text-center q-pa-xl">
            <q-spinner color="primary" size="40px" />
            <div class="q-mt-md text-grey">Cargando...</div>
          </q-card-section>
        </q-card>

        <q-card v-else-if="error" flat bordered class="firma-publica__card">
          <q-card-section>
            <div class="text-h6 text-negative q-mb-sm">No se puede continuar</div>
            <p class="text-body2">{{ error }}</p>
          </q-card-section>
        </q-card>

        <q-card v-else-if="blocked" flat bordered class="firma-publica__card">
          <q-card-section class="text-center">
            <q-icon name="lock" color="orange" size="64px" />
            <div class="text-h6 q-mt-md">No se puede firmar</div>
            <p class="text-body2 q-mt-sm">{{ blockedMessage }}</p>
            <p v-if="info?.cnssoporte" class="text-caption text-grey q-mt-md">
              Soporte {{ info.cnssoporte }}
            </p>
          </q-card-section>
        </q-card>

        <q-card v-else-if="done" flat bordered class="firma-publica__card">
          <q-card-section class="text-center">
            <q-icon name="check_circle" color="positive" size="64px" />
            <div class="text-h6 q-mt-md">¡Gracias!</div>
            <p class="text-body2 q-mt-sm">
              {{ doneMessage }}
            </p>
            <p v-if="info?.cnssoporte || info?.tema" class="text-caption text-grey q-mt-md">
              {{ info.cnssoporte || info.tema }}
            </p>
          </q-card-section>
        </q-card>

        <q-card v-else flat bordered class="firma-publica__card">
          <q-card-section>
            <div class="text-h6 q-mb-xs">{{ pageTitle }}</div>
            <div class="text-caption text-grey q-mb-sm">
              No necesita usuario ni contraseña del sistema
            </div>
            <template v-if="isCapacitacionFirma">
              <div class="text-subtitle2">{{ info.nombres }}</div>
              <div class="text-caption text-grey">Doc. {{ info.documento }} · {{ info.cargo || '—' }}</div>
            </template>
            <template v-else-if="isBitacora">
              <div class="text-subtitle2">{{ info.funcionario || 'Funcionario' }}</div>
              <div class="text-caption text-grey">Soporte {{ info.cnssoporte }}</div>
            </template>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pt-sm">
            <div v-if="isBitacora" class="firma-publica__bitacora">
              <div class="text-body2 q-mb-sm">
                <div><strong>Cliente:</strong> {{ info.cliente }}</div>
                <div><strong>Fecha soporte:</strong> {{ fmtFecha(info.fecha) }}</div>
                <div><strong>Fecha cierre:</strong> {{ fmtFecha(info.fechar) }}</div>
              </div>
              <div class="firma-publica__blocks">
                <article class="firma-publica__block">
                  <h4>Solicitud</h4>
                  <p>{{ info.solicitud || '—' }}</p>
                </article>
                <article class="firma-publica__block">
                  <h4>Respuesta</h4>
                  <p>{{ info.respuesta || '—' }}</p>
                </article>
                <article class="firma-publica__block">
                  <h4>Observaciones</h4>
                  <p>{{ info.observaciones || '—' }}</p>
                </article>
              </div>
            </div>
            <div v-else class="text-body2 q-mb-md">
              <div><strong>Cliente:</strong> {{ info.cliente }}</div>
              <div><strong>Tema:</strong> {{ info.tema || '—' }}</div>
              <div><strong>Fecha:</strong> {{ fmtFecha(info.fecha) }}</div>
              <div><strong>Capacitador:</strong> {{ info.capacitador || '—' }}</div>
            </div>

            <q-form v-if="isInvite" ref="formRef" class="q-gutter-md q-mb-md">
              <q-input
                v-model="form.email"
                label="Correo"
                outlined
                dense
                readonly
                disable
              />
              <q-input
                v-model="form.documento"
                label="Documento *"
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
            </q-form>

            <q-banner v-if="info.firmado && isBitacora" dense rounded class="bg-orange-1 text-orange-10 q-mb-md">
              Este soporte ya fue firmado y no admite cambios.
            </q-banner>
            <q-banner v-else-if="info.firmado" dense rounded class="bg-blue-1 text-blue-10 q-mb-md">
              Ya existe una firma registrada. Puede actualizarla dibujando de nuevo o subiendo otra imagen.
            </q-banner>
          </q-card-section>

          <q-card-section v-if="!isBitacoraBlocked" class="q-pt-none">
            <SignaturePad
              :titulo="signatureTitle"
              height="200px"
              :show-cancel="false"
              :allow-upload="true"
              @save="onSave"
            />
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
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
const blocked = ref(false);
const blockedMessage = ref('');
const done = ref(false);
const info = ref(null);
const saving = ref(false);
const form = ref({ email: '', documento: '', nombres: '', cargo: '' });

const isInvite = computed(() => info.value?.mode === 'invite');
const isBitacora = computed(() => info.value?.mode === 'bitacora');
const isCapacitacionFirma = computed(() => info.value?.mode === 'firma' || isInvite.value);
const isBitacoraBlocked = computed(() => isBitacora.value && info.value?.puedeFirmar === false);

const pageTitle = computed(() => {
  if (isBitacora.value) return 'Firma aceptación de la solución';
  if (isInvite.value) return 'Registro y firma de asistencia';
  return 'Firma de asistencia';
});

const signatureTitle = computed(() => (
  isBitacora.value
    ? 'Diligencie su firma o suba una imagen (PNG/JPG)'
    : 'Diligencie su firma en el recuadro'
));

const doneMessage = computed(() => {
  if (isBitacora.value) return 'Su firma de aceptación fue registrada correctamente.';
  if (isInvite.value) return 'Sus datos y firma fueron registrados.';
  return 'Su firma fue registrada correctamente.';
});

function fmtFecha(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('es-CO');
}

async function loadInfo() {
  loading.value = true;
  error.value = '';
  blocked.value = false;
  blockedMessage.value = '';
  try {
    const { data } = await api.get(`/public/firma/${encodeURIComponent(token)}`);
    info.value = data;
    if (data.mode === 'bitacora' && data.puedeFirmar === false) {
      blocked.value = true;
      blockedMessage.value = data.bloqueoMotivo || 'No se puede firmar este soporte.';
      return;
    }
    if (data.mode === 'invite') {
      form.value = {
        email: data.email || '',
        documento: data.documento || '',
        nombres: data.nombres || '',
        cargo: data.cargo || '',
      };
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Enlace inválido o expirado';
  } finally {
    loading.value = false;
  }
}

async function onSave(dataUrl) {
  if (saving.value) return;

  if (isInvite.value) {
    const valid = await formRef.value?.validate();
    if (!valid) {
      $q.notify({ type: 'warning', message: 'Complete documento y nombres' });
      return;
    }
  }

  saving.value = true;
  try {
    const body = isInvite.value
      ? { ...form.value, firma: dataUrl }
      : { firma: dataUrl };
    await api.post(`/public/firma/${encodeURIComponent(token)}`, body);
    done.value = true;
    $q.notify({ type: 'positive', message: isBitacora.value ? 'Aceptación firmada' : 'Firma guardada' });
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
.firma-publica {
  min-height: 100vh;
  background: #f5f5f5;
}

.firma-publica__card {
  width: 100%;
  max-width: 560px;
}

.firma-publica__blocks {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.firma-publica__block {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.firma-publica__block h4 {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.firma-publica__block p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
