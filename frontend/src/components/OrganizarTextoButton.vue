<template>
  <q-btn
    flat
    dense
    round
    :icon="iconName"
    :color="colorName"
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

const ACCIONES = {
  organizar: {
    icon: 'auto_fix_high',
    color: 'secondary',
    title: 'Organizar con IA',
    confirm: 'El texto se enviará a OpenAI para corregir ortografía y mejorar la redacción.',
    ok: 'Organizar',
    success: 'Texto organizado',
  },
  resumen_ejecutivo: {
    icon: 'summarize',
    color: 'info',
    title: 'Resumen ejecutivo',
    confirm: 'Se generará un resumen breve del texto con OpenAI.',
    ok: 'Generar resumen',
    success: 'Resumen generado',
  },
  minuta_estructurada: {
    icon: 'article',
    color: 'primary',
    title: 'Minuta estructurada',
    confirm: 'Se estructurará el texto como minuta de reunión con OpenAI.',
    ok: 'Estructurar',
    success: 'Minuta generada',
  },
  extraer_compromisos: {
    icon: 'checklist',
    color: 'teal',
    title: 'Extraer compromisos',
    confirm: 'Se analizará el texto para sugerir compromisos con OpenAI.',
    ok: 'Extraer',
    success: 'Compromisos sugeridos',
  },
  redactar_correo: {
    icon: 'mail',
    color: 'deep-orange',
    title: 'Redactar correo',
    confirm: 'Se redactará un borrador de correo profesional con OpenAI.',
    ok: 'Redactar',
    success: 'Correo redactado',
  },
  mejorar_changelog: {
    icon: 'history_edu',
    color: 'purple',
    title: 'Mejorar changelog',
    confirm: 'Se mejorará el changelog con OpenAI.',
    ok: 'Mejorar',
    success: 'Changelog mejorado',
  },
};

const props = defineProps({
  texto: { type: String, default: '' },
  asunto: { type: String, default: '' },
  modo: { type: String, default: 'plain' },
  contexto: { type: String, default: 'generico' },
  accion: { type: String, default: 'organizar' },
  disabled: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
});

const emit = defineEmits(['organizado', 'resultado']);

const $q = useQuasar();
const loading = ref(false);
const configured = ref(false);

const meta = computed(() => ACCIONES[props.accion] || ACCIONES.organizar);
const iconName = computed(() => meta.value.icon);
const colorName = computed(() => meta.value.color);

const tooltipText = computed(() => {
  if (!configured.value) return 'IA no configurada (OPENAI_API_KEY en el servidor)';
  if (props.disabled) return 'Complete los datos requeridos';
  if (loading.value) return 'Procesando…';
  return `${meta.value.title} (OpenAI — solo al usar)`;
});

onMounted(async () => {
  try {
    const status = await aiApi.status();
    configured.value = Boolean(status?.configured);
  } catch {
    configured.value = false;
  }
});

async function ejecutar() {
  loading.value = true;
  try {
    const payload = {
      accion: props.accion,
      texto: props.texto,
      modo: props.modo,
      contexto: props.contexto,
      asunto: props.asunto,
    };
    const result = props.accion === 'organizar'
      ? await aiApi.organizarTexto({ texto: props.texto, modo: props.modo, contexto: props.contexto })
      : await aiApi.procesar(payload);

    emit('resultado', result);
    if (result.texto !== undefined) {
      emit('organizado', result.texto);
    }
    $q.notify({ type: 'positive', message: meta.value.success, timeout: 2500 });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: extractApiError(err, 'No se pudo procesar con IA'),
      timeout: 5000,
    });
  } finally {
    loading.value = false;
  }
}

function onClick() {
  if (!props.active || !configured.value || props.disabled || loading.value) return;

  const raw = String(props.texto || '').trim();
  if (!raw && props.accion !== 'redactar_correo') {
    $q.notify({ type: 'warning', message: 'No hay texto para procesar' });
    return;
  }

  $q.dialog({
    title: meta.value.title,
    message: `${meta.value.confirm} ¿Desea continuar?`,
    cancel: { label: 'Cancelar', flat: true, noCaps: true },
    ok: { label: meta.value.ok, color: 'primary', unelevated: true, noCaps: true },
    persistent: true,
  }).onOk(ejecutar);
}
</script>
