<template>
  <q-dialog v-model="open" persistent class="acta-comp-preview-dialog">
    <q-card class="acta-comp-preview-card">
      <q-card-section class="acta-comp-preview-card__header row items-center">
        <q-icon name="assignment_turned_in" size="22px" />
        <div class="q-ml-sm">
          <div class="text-h6">Vista previa de compromisos</div>
          <div class="text-caption acta-comp-preview-card__subtitle">
            Revise texto, responsable y fechas antes de agregarlos al acta
          </div>
        </div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup @click="onCancel" />
      </q-card-section>

      <q-separator />

      <q-card-section class="acta-comp-preview-card__body scroll">
        <q-banner v-if="!cliente" dense rounded class="bg-amber-1 text-amber-10 q-mb-md">
          Seleccione el cliente del acta para asignar responsables del lado cliente.
        </q-banner>

        <div
          v-for="(row, idx) in rows"
          :key="idx"
          class="acta-comp-preview-row q-mb-md q-pa-md"
        >
          <div class="row items-center q-mb-sm">
            <q-badge color="primary" :label="`Compromiso ${idx + 1}`" />
            <q-space />
            <q-btn
              v-if="rows.length > 1"
              flat
              dense
              round
              icon="delete_outline"
              color="negative"
              @click="removeRow(idx)"
            >
              <q-tooltip>Quitar de la lista</q-tooltip>
            </q-btn>
          </div>

          <q-input
            v-model="row.compromiso"
            label="Compromiso *"
            type="textarea"
            autogrow
            outlined
            dense
            class="q-mb-sm"
          />

          <div class="row q-col-gutter-sm q-mb-sm items-center">
            <div class="col-auto">
              <q-checkbox v-model="row.esCliente" label="Por el cliente" dense :disable="!cliente" />
            </div>
            <div class="col-auto">
              <q-badge
                :color="row.esCliente ? 'teal' : 'deep-orange'"
                :label="row.esCliente ? 'Cliente' : 'IX Colombia'"
              />
            </div>
          </div>

          <div class="row q-col-gutter-sm q-mb-sm">
            <div class="col-12 col-md-6">
              <LookupSelect
                v-if="!row.esCliente"
                v-model="row.responsable"
                resource="soportes"
                value-field="nombre"
                label-field="nombre"
                lookup-code-field="codigo"
                label="Responsable (soporte) *"
                :extra-params="{ estado: 'A' }"
              />
              <template v-else>
                <LookupSelect
                  v-model="row.responsable"
                  resource="funcionarios"
                  value-field="nombre"
                  label-field="nombre"
                  lookup-code-field="documento"
                  label="Responsable (funcionario) *"
                  :disable="!cliente"
                  :extra-params="funcExtraParams"
                  @pick="(r) => onFuncPick(row, r)"
                />
                <q-btn
                  flat
                  dense
                  no-caps
                  color="primary"
                  icon="person_add"
                  label="Nuevo funcionario"
                  class="q-mt-xs"
                  :disable="!cliente"
                  @click="openNuevoFuncionario(row)"
                />
              </template>
            </div>
            <div class="col-6 col-md-3">
              <q-input v-model="row.fecha_inicio" label="Fecha inicio" type="date" dense outlined />
            </div>
            <div class="col-6 col-md-3">
              <q-input v-model="row.fecha_entrega" label="Fecha entrega" type="date" dense outlined />
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions class="acta-comp-preview-card__actions">
        <q-btn flat no-caps label="Cancelar" class="q-px-md" @click="onCancel" />
        <q-space />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add"
          :label="`Agregar ${rows.length} compromiso(s)`"
          class="q-px-md"
          :loading="loading"
          @click="onConfirm"
        />
      </q-card-actions>
    </q-card>

    <GenericForm
      v-model="funcFormOpen"
      :module="funcModule"
      :record="funcCurrent"
      :is-edit="false"
      @saved="onFuncionarioCreado"
    />
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { findModule } from 'src/config/modules';
import LookupSelect from 'components/LookupSelect.vue';
import GenericForm from 'components/GenericForm.vue';
import { normalizeDateInput } from 'src/utils/dateInput';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  compromisos: { type: Array, default: () => [] },
  cliente: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const $q = useQuasar();
const rows = ref([]);
const funcFormOpen = ref(false);
const funcCurrent = ref({});
const funcTargetRow = ref(null);

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const funcExtraParams = computed(() => ({
  codigo: props.cliente,
  estado: 'Activo',
}));

const cliMod = findModule('clientes');
const funcModule = computed(() => ({
  resource: cliMod.detail.resource,
  title: 'Nuevo funcionario',
  formCols: cliMod.detail.formCols,
  idField: cliMod.detail.idField,
  fields: [
    { name: 'codigo', label: 'Cliente', type: 'text', required: true, fixed: true },
    ...cliMod.detail.fields,
  ],
}));

function mapAiRow(c) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    compromiso: String(c?.compromiso || '').trim(),
    responsable: String(c?.responsable || '').trim(),
    esCliente: false,
    fecha_inicio: today,
    fecha_entrega: normalizeDateInput(c?.fecha_entrega),
  };
}

watch(
  () => [props.modelValue, props.compromisos],
  ([visible, list]) => {
    if (!visible) return;
    rows.value = (list || []).map(mapAiRow).filter((r) => r.compromiso);
    if (!rows.value.length) {
      rows.value = [mapAiRow({ compromiso: '' })];
    }
  },
  { immediate: true, deep: true },
);

function removeRow(idx) {
  rows.value = rows.value.filter((_, i) => i !== idx);
}

function onFuncPick(row, picked) {
  if (picked?.nombre) row.responsable = picked.nombre;
}

function openNuevoFuncionario(row) {
  if (!props.cliente) {
    $q.notify({ type: 'warning', message: 'Seleccione el cliente del acta' });
    return;
  }
  funcTargetRow.value = row;
  funcCurrent.value = { codigo: props.cliente, estado: 'Activo' };
  funcFormOpen.value = true;
}

function onFuncionarioCreado(saved) {
  funcFormOpen.value = false;
  if (saved?.nombre && funcTargetRow.value) {
    funcTargetRow.value.responsable = saved.nombre;
    $q.notify({ type: 'positive', message: 'Funcionario creado y seleccionado' });
  }
  funcTargetRow.value = null;
}

function onCancel() {
  open.value = false;
  emit('cancel');
}

function onConfirm() {
  const valid = rows.value.filter((r) => r.compromiso?.trim());
  if (!valid.length) {
    $q.notify({ type: 'warning', message: 'Indique al menos un compromiso' });
    return;
  }

  for (let i = 0; i < valid.length; i += 1) {
    const r = valid[i];
    if (!r.responsable?.trim()) {
      $q.notify({ type: 'warning', message: `Seleccione el responsable del compromiso ${i + 1}` });
      return;
    }
    if (r.esCliente && !props.cliente) {
      $q.notify({ type: 'warning', message: `Compromiso ${i + 1}: seleccione el cliente del acta` });
      return;
    }
  }

  emit(
    'confirm',
    valid.map((r) => ({
      compromiso: r.compromiso.trim(),
      responsable: r.responsable.trim(),
      esCliente: r.esCliente,
      lado: r.esCliente ? 'cliente' : 'ix',
      fecha_inicio: normalizeDateInput(r.fecha_inicio) || new Date().toISOString().slice(0, 10),
      fecha_entrega: normalizeDateInput(r.fecha_entrega),
    })),
  );
}
</script>

<style scoped>
.acta-comp-preview-card {
  width: min(1100px, 98vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
}

.acta-comp-preview-card__header {
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
  color: #fff;
  padding: 14px 20px;
}

.acta-comp-preview-card__subtitle {
  opacity: 0.85;
}

.acta-comp-preview-card__body {
  flex: 1;
  background: #f4f6f9;
  padding: 16px 20px;
  max-height: calc(92vh - 130px);
}

.acta-comp-preview-row {
  background: #fff;
  border: 1px solid #dce3eb;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.acta-comp-preview-card__actions {
  padding: 12px 20px;
  background: #fff;
  border-top: 1px solid #e8edf2;
}
</style>
