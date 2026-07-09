<template>
  <div>
    <template v-if="editable">
      <div class="row q-col-gutter-sm items-center q-mb-sm">
        <div class="col-12 col-md-auto">
          <q-checkbox
            v-model="esCliente"
            label="Por el cliente"
            dense
            :disable="!cliente"
          />
        </div>
        <div class="col-12 col-md">
          <q-badge :color="esCliente ? 'teal' : 'deep-orange'" :label="esCliente ? 'Cliente' : 'IX Colombia'" />
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mb-sm items-end">
        <div class="col-12 col-md-5">
          <LookupSelect
            v-if="!esCliente"
            v-model="pickId"
            resource="soportes"
            value-field="nombre"
            label-field="nombre"
            lookup-code-field="codigo"
            label="Asistente (técnico soporte)"
            :extra-params="{ estado: 'A' }"
            @pick="onSoportePick"
          />
          <template v-else>
            <LookupSelect
              v-model="pickId"
              resource="funcionarios"
              value-field="documento"
              label-field="nombre"
              lookup-code-field="documento"
              label="Asistente (funcionario)"
              :disable="!cliente"
              :extra-params="funcExtraParams"
              @pick="onFuncPick"
            />
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="person_add"
              label="Nuevo funcionario"
              class="actreun-panel-btn--link q-mt-xs"
              :disable="!cliente"
              @click="openNuevoFuncionario"
            />
          </template>
        </div>
        <div class="col-12 col-md-3">
          <q-input v-model="form.nombre" label="Nombre" dense outlined readonly bg-color="grey-1" />
        </div>
        <div class="col-12 col-md-2">
          <q-input v-model="form.documento" label="Documento" dense outlined readonly bg-color="grey-1" />
        </div>
        <div class="col-12 col-md-2">
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="person_add"
            label="Agregar"
            class="full-width actreun-panel-btn"
            :loading="saving"
            @click="add"
          />
        </div>
      </div>
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12">
          <q-input v-model="form.cargo" label="Cargo" dense outlined />
        </div>
      </div>
    </template>

    <q-table
      :rows="rows"
      :columns="tableColumns"
      :row-key="rowKey"
      flat
      bordered
      dense
      hide-pagination
    >
      <template #body-cell-lado="cell">
        <q-td :props="cell">
          <q-badge
            :color="cell.row.lado === 'cliente' ? 'teal' : 'deep-orange'"
            :label="cell.row.lado === 'cliente' ? 'Cliente' : 'IX Colombia'"
          />
        </q-td>
      </template>
      <template #body-cell-firma="cell">
        <q-td :props="cell">
          <q-chip
            dense
            :color="cell.row.firma_fecha ? 'green-2' : 'grey-3'"
            :text-color="cell.row.firma_fecha ? 'green-10' : 'grey-8'"
            :icon="cell.row.firma_fecha ? 'verified' : 'schedule'"
            :label="cell.row.firma_fecha ? 'Firmado' : 'Pendiente'"
          />
        </q-td>
      </template>
      <template #body-cell-acciones="cell">
        <q-td :props="cell" class="text-right">
          <q-btn
            v-if="showFirmaActions && !cell.row.firma_fecha"
            flat
            dense
            round
            icon="mail"
            color="teal"
            @click="$emit('enviar-firma', cell.row)"
          >
            <q-tooltip>Enviar enlace de firma</q-tooltip>
          </q-btn>
          <q-btn
            v-if="editable"
            flat
            dense
            round
            icon="delete"
            color="negative"
            @click="removeRow(cell.row)"
          />
        </q-td>
      </template>
    </q-table>

    <GenericForm
      v-model="funcFormOpen"
      :module="funcModule"
      :record="funcCurrent"
      :is-edit="false"
      @saved="onFuncionarioCreado"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useResource } from 'src/services/api';
import { findModule } from 'src/config/modules';
import LookupSelect from 'components/LookupSelect.vue';
import GenericForm from 'components/GenericForm.vue';

const props = defineProps({
  consecutivo: { type: String, default: '' },
  cliente: { type: String, default: '' },
  rows: { type: Array, default: () => [] },
  localMode: { type: Boolean, default: false },
  editable: { type: Boolean, default: true },
  showFirmaActions: { type: Boolean, default: false },
});
const emit = defineEmits(['changed', 'add', 'remove', 'enviar-firma']);

const $q = useQuasar();
const api = useResource('actas_reunion_asistentes');
const saving = ref(false);
const esCliente = ref(false);
const pickId = ref('');
const funcFormOpen = ref(false);
const funcCurrent = ref({});
const pickMeta = ref({ documento: '', soporteCodigo: '' });

const form = ref({ nombre: '', cargo: '', documento: '' });

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

const tableColumns = computed(() => {
  const cols = [
    { name: 'lado', label: 'Lado', field: 'lado', align: 'left' },
    { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left' },
    { name: 'documento', label: 'Documento', field: 'documento', align: 'left' },
    { name: 'cargo', label: 'Cargo', field: 'cargo', align: 'left' },
  ];
  if (props.showFirmaActions) {
    cols.push({ name: 'firma', label: 'Firma', field: 'firma', align: 'center' });
  }
  if (props.editable || props.showFirmaActions) {
    cols.push({ name: 'acciones', label: '', field: 'acciones', align: 'right' });
  }
  return cols;
});

watch(esCliente, () => {
  pickId.value = '';
  pickMeta.value = { documento: '', soporteCodigo: '' };
  form.value = { nombre: '', cargo: '', documento: '' };
});

function rowKey(row) {
  if (row._localId) return row._localId;
  return `${row.consecutivo}~${row.item}`;
}

function nextItem() {
  if (!props.rows.length) return 1;
  return Math.max(...props.rows.map((r) => Number(r.item) || 0)) + 1;
}

function onSoportePick(row) {
  const documento = String(row?.documento || '').trim() || (row?.codigo ? `SOP#${row.codigo}` : '');
  pickMeta.value = { documento, soporteCodigo: row?.codigo || '' };
  form.value.nombre = row?.nombre || '';
  form.value.documento = documento;
  form.value.cargo = form.value.cargo || 'Técnico de soporte';
}

function onFuncPick(row) {
  pickMeta.value = { documento: row?.documento || '', soporteCodigo: '' };
  form.value.nombre = row?.nombre || '';
  form.value.documento = row?.documento || '';
  form.value.cargo = row?.cargo || '';
}

function openNuevoFuncionario() {
  if (!props.cliente) {
    $q.notify({ type: 'warning', message: 'Seleccione el cliente del acta' });
    return;
  }
  funcCurrent.value = { codigo: props.cliente, estado: 'Activo' };
  funcFormOpen.value = true;
}

function onFuncionarioCreado(saved) {
  funcFormOpen.value = false;
  if (saved?.documento) {
    pickId.value = saved.documento;
    onFuncPick(saved);
    $q.notify({ type: 'positive', message: 'Funcionario creado; confirme con Agregar asistente' });
  }
}

function resetPick() {
  pickId.value = '';
  pickMeta.value = { documento: '', soporteCodigo: '' };
  form.value = { nombre: '', cargo: '', documento: '' };
}

async function add() {
  if (!form.value.nombre?.trim()) {
    $q.notify({ type: 'warning', message: 'Seleccione un asistente' });
    return;
  }
  if (!form.value.documento?.trim()) {
    $q.notify({ type: 'warning', message: 'El asistente debe tener número de documento' });
    return;
  }
  if (esCliente.value && !props.cliente) {
    $q.notify({ type: 'warning', message: 'Seleccione el cliente del acta' });
    return;
  }

  const payload = {
    lado: esCliente.value ? 'cliente' : 'ix',
    nombre: form.value.nombre,
    cargo: form.value.cargo || '',
    documento: form.value.documento,
  };

  if (props.localMode) {
    emit('add', { ...payload, _localId: `local-${Date.now()}-${Math.random()}` });
    resetPick();
    return;
  }

  saving.value = true;
  try {
    const body = {
      consecutivo: props.consecutivo,
      item: nextItem(),
      ...payload,
    };
    if (pickMeta.value.soporteCodigo) body._soporteCodigo = pickMeta.value.soporteCodigo;
    if (esCliente.value) body._funcionarioDocumento = form.value.documento;
    await api.create(body);
    resetPick();
    emit('changed');
    $q.notify({ type: 'positive', message: 'Asistente agregado' });
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al agregar' });
  } finally {
    saving.value = false;
  }
}

function removeRow(row) {
  $q.dialog({ title: 'Eliminar', message: '¿Eliminar este asistente?', cancel: true }).onOk(async () => {
    if (props.localMode) {
      emit('remove', row);
      return;
    }
    try {
      await api.remove(rowKey(row));
      emit('changed');
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error' });
    }
  });
}
</script>

<style scoped>
.actreun-panel-btn {
  border-radius: 8px;
  font-weight: 600;
  padding: 8px 14px;
}
.actreun-panel-btn--link {
  font-weight: 600;
  font-size: 12px;
}
</style>
