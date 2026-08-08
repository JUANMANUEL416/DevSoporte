<template>
  <q-btn-dropdown
    flat
    dense
    round
    icon="psychology"
    color="secondary"
    :disable="!configured || disabled"
    dropdown-icon=""
  >
    <q-tooltip>Asistente IA para el acta (OpenAI — solo al usar)</q-tooltip>
    <q-list dense style="min-width: 220px">
      <q-item v-close-popup clickable @click="emitAccion('organizar')">
        <q-item-section avatar><q-icon name="auto_fix_high" color="secondary" /></q-item-section>
        <q-item-section>Organizar texto</q-item-section>
      </q-item>
      <q-item v-close-popup clickable @click="emitAccion('resumen_ejecutivo')">
        <q-item-section avatar><q-icon name="summarize" color="info" /></q-item-section>
        <q-item-section>Resumen ejecutivo</q-item-section>
      </q-item>
      <q-item v-close-popup clickable @click="emitAccion('minuta_estructurada')">
        <q-item-section avatar><q-icon name="article" color="primary" /></q-item-section>
        <q-item-section>Minuta estructurada</q-item-section>
      </q-item>
      <q-item v-close-popup clickable @click="emitAccion('extraer_compromisos')">
        <q-item-section avatar><q-icon name="checklist" color="teal" /></q-item-section>
        <q-item-section>Extraer compromisos</q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { aiApi } from 'src/services/api';

defineProps({
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['accion']);

const configured = ref(false);

onMounted(async () => {
  try {
    const status = await aiApi.status();
    configured.value = Boolean(status?.configured);
  } catch {
    configured.value = false;
  }
});

function emitAccion(accion) {
  if (!configured.value) return;
  emit('accion', accion);
}
</script>
