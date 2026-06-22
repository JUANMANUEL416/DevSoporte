<template>
  <q-select
    :model-value="modelValue"
    :label="label"
    :options="options"
    option-value="value"
    option-label="label"
    emit-value
    map-options
    use-input
    input-debounce="400"
    outlined
    dense
    clearable
    :loading="loading"
    :disable="disable"
    :rules="required ? [(v) => !!v || 'Requerido'] : []"
    @update:model-value="onPick"
    @filter="onFilter"
    @focus="onFocus"
  >
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey">Sin resultados</q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useResource } from 'src/services/api';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  resource: { type: String, required: true },
  valueField: { type: String, default: 'codigo' },
  labelField: { type: String, default: 'nombrecliente' },
  label: { type: String, default: 'Buscar' },
  required: Boolean,
  disable: Boolean,
  extraParams: { type: Object, default: () => ({}) },
  lookupCodeField: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'pick']);

const api = useResource(props.resource);
const options = ref([]);
const loading = ref(false);

function toOption(row) {
  const code = row[props.valueField] ?? '';
  const name = row[props.labelField] ?? '';
  const prefix = props.lookupCodeField ? (row[props.lookupCodeField] ?? '') : code;
  const label = name
    ? (prefix && prefix !== name ? `${prefix} — ${name}` : String(name))
    : String(code);
  return {
    value: code,
    label,
    row,
  };
}

async function loadOptions(q = '') {
  loading.value = true;
  try {
    const res = await api.list({ q, limit: 50, ...props.extraParams });
    options.value = res.data.map(toOption);
  } finally {
    loading.value = false;
  }
}

function onFilter(val, update) {
  update(async () => {
    await loadOptions(val);
  });
}

function onFocus() {
  if (!options.value.length) loadOptions('');
}

function onPick(val) {
  emit('update:modelValue', val);
  const opt = options.value.find((o) => o.value === val);
  if (opt?.row) emit('pick', opt.row);
}

watch(
  () => props.extraParams,
  () => {
    options.value = [];
    loadOptions('');
  },
  { deep: true },
);

watch(
  () => props.modelValue,
  async (val) => {
    if (!val) return;
    const exists = options.value.some((o) => o.value === val);
    if (!exists) {
      await loadOptions(String(val));
      if (!options.value.some((o) => o.value === val)) {
        options.value = [{ value: val, label: String(val) }, ...options.value];
      }
    }
  },
  { immediate: true },
);
</script>
