<template>
  <q-chip :color="color" text-color="white" dense :label="label" />
</template>

<script setup>
import { computed } from 'vue';

// Componente reutilizable para mostrar el estado de un registro con color.
const props = defineProps({
  value: { type: [String, Number], default: '' },
});

const map = {
  A: { label: 'Abierto', color: 'orange' },
  C: { label: 'Cerrado', color: 'green' },
  P: { label: 'Pendiente', color: 'blue' },
  D: { label: 'Desarrollo', color: 'purple' },
  E: { label: 'Entregado', color: 'teal' },
  R: { label: 'Rechazado', color: 'red' },
};

const entry = computed(() => map[String(props.value).toUpperCase()] || null);
const label = computed(() => entry.value?.label || props.value || '—');
const color = computed(() => entry.value?.color || 'grey');
</script>
