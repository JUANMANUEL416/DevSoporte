<template>
  <q-btn
    flat
    dense
    round
    :icon="listening ? 'mic' : 'mic_off'"
    :color="listening ? 'negative' : 'primary'"
    :disable="!supported || disabled"
    :class="{ 'dictado-btn--listening': listening }"
    @click="onClick"
  >
    <q-tooltip>{{ tooltipText }}</q-tooltip>
  </q-btn>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useDictado } from 'src/composables/useDictado';

const props = defineProps({
  disabled: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  lang: { type: String, default: 'es-CO' },
});

const emit = defineEmits(['dictado']);

const $q = useQuasar();
const activeRef = computed(() => props.active);

const { supported, listening, error, toggle } = useDictado({
  lang: props.lang,
  active: activeRef,
  onResult: (text, { isFinal }) => {
    if (isFinal && text) {
      emit('dictado', text);
    }
  },
});

const tooltipText = computed(() => {
  if (!supported.value) return 'Dictado no disponible en este navegador (use Chrome o Edge)';
  if (props.disabled) return 'Complete los datos requeridos antes de dictar';
  if (listening.value) return 'Detener dictado';
  return 'Dictar';
});

function onClick() {
  toggle();
}

watch(error, (msg) => {
  if (msg) {
    $q.notify({ type: 'warning', message: msg, timeout: 3500 });
  }
});
</script>

<style scoped>
.dictado-btn--listening {
  animation: dictado-pulse 1.2s ease-in-out infinite;
}

@keyframes dictado-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
</style>
