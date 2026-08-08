<template>
  <q-btn
    flat
    dense
    round
    icon="auto_fix_high"
    color="secondary"
    :disable="!configured || disabled || loading"
    :loading="loading"
    @click="onClick"
  >
    <q-tooltip>{{ tooltipText }}</q-tooltip>
  </q-btn>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { aiApi, extractApiError } from 'src/services/api';

const props = defineProps({
  texto: { type: String, default: '' },
  modo: { type: String, default: 'plain' },
  contexto: { type: String, default: 'desarrollo_acta' },
  disabled: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
});

const emit = defineEmits(['organizado']);

const $q = useQuasar();
const loading = ref(false);
const configured = ref(false);

const tooltipText = computed(() => {
  if (!configured.value) return 'IA no configurada (OPENAI_API_KEY en el servidor)';
  if (props.disabled) return 'Complete los datos requeridos antes de organizar';
  if (loading.value) return 'Organizando texto…';
  return 'Organizar con IA (envía el texto a OpenAI)';
});

onMounted(async () => {
  try {
    const status = await aiApi.status();
    configured.value = Boolean(status?.configured);
  } catch {
    configured.value = false;
  }
});

async function onClick() {
  if (!props.active || !configured.value || props.disabled || loading.value) return;

  const raw = String(props.texto || '').trim();
  if (!raw) {
    $q.notify({ type: 'warning', message: 'No hay texto para organizar' });
    return;
  }

  $q.dialog({
    title: 'Organizar con IA',
    message:
      'El texto actual se enviará a OpenAI para corregir ortografía y mejorar la redacción. ¿Desea continuar?',
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: 'Organizar', color: 'primary', unelevated: true, noCaps: true },
    persistent: true,
  }).onOk(async () => {
    loading.value = true;
    try {
      const { texto } = await aiApi.organizarTexto({
        texto: props.texto,
        modo: props.modo,
        contexto: props.contexto,
      });
      emit('organizado', texto);
      $q.notify({ type: 'positive', message: 'Texto organizado', timeout: 2500 });
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: extractApiError(err, 'No se pudo organizar el texto'),
        timeout: 5000,
      });
    } finally {
      loading.value = false;
    }
  });
}
</script>
