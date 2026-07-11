<template>
  <div>
    <template v-if="editable">
      <div class="row q-col-gutter-sm q-mb-sm">
        <div class="col-12 col-md-auto">
          <q-checkbox
            v-model="esCliente"
            label="Por el cliente"
            dense
            :disable="!cliente"
          />
          <q-tooltip v-if="!cliente">Seleccione primero el cliente del acta</q-tooltip>
        </div>
        <div class="col-12 col-md">
          <q-badge :color="esCliente ? 'teal' : 'deep-orange'" :label="esCliente ? 'Cliente' : 'IX Colombia'" />
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mb-sm">
      <div class="col-12 col-md-5">
        <q-input v-model="form.compromiso" label="Compromiso *" dense outlined />
      </div>
      <div class="col-12 col-md-3">
        <LookupSelect
          v-if="!esCliente"
          v-model="form.responsable"
          resource="soportes"
          value-field="nombre"
          label-field="nombre"
          lookup-code-field="codigo"
          label="Responsable (soporte)"
          :extra-params="{ estado: 'A' }"
        />
        <template v-else>
          <LookupSelect
            v-model="form.responsable"
            resource="funcionarios"
            value-field="nombre"
            label-field="nombre"
            lookup-code-field="documento"
            label="Responsable (funcionario)"
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
      <div class="col-6 col-md-2">
        <q-input v-model="form.fecha_inicio" label="Fecha inicio" type="date" dense outlined />
      </div>
      <div class="col-6 col-md-2">
        <q-input v-model="form.fecha_entrega" label="Fecha entrega" type="date" dense outlined />
      </div>
    </div>

    <q-btn
      unelevated
      no-caps
      color="primary"
      icon="add"
      label="Agregar compromiso"
      size="sm"
      class="actreun-panel-btn q-mb-md"
      :loading="saving"
      @click="add"
    />
    </template>

    <q-table
      :rows="rows"
      :columns="columns"
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
      <template #body-cell-compromiso="cell">
        <q-td :props="cell" class="actreun-compromiso-cell">
          <span class="actreun-compromiso-cell__text">{{ cell.row.compromiso }}</span>
        </q-td>
      </template>
      <template #body-cell-acciones="cell">
        <q-td :props="cell" class="actreun-acciones-cell">
          <q-btn
            v-if="editable"
            flat
            dense
            round
            icon="edit"
            color="primary"
            @click="openEdit(cell.row)"
          >
            <q-tooltip>Editar compromiso</q-tooltip>
          </q-btn>
          <q-btn v-if="editable" flat dense round icon="delete" color="negative" @click="removeRow(cell.row)">
            <q-tooltip>Eliminar</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="editOpen" persistent>
      <q-card style="min-width: 520px; max-width: 92vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Editar compromiso</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="row q-col-gutter-sm q-mb-sm items-center">
            <div class="col-auto">
              <q-checkbox v-model="editEsCliente" label="Por el cliente" dense :disable="!cliente" />
            </div>
            <div class="col-auto">
              <q-badge :color="editEsCliente ? 'teal' : 'deep-orange'" :label="editEsCliente ? 'Cliente' : 'IX Colombia'" />
            </div>
          </div>
          <q-input v-model="editForm.compromiso" label="Compromiso *" outlined dense type="textarea" autogrow rows="2" class="q-mb-sm" />
          <LookupSelect
            v-if="!editEsCliente"
            v-model="editForm.responsable"
            resource="soportes"
            value-field="nombre"
            label-field="nombre"
            lookup-code-field="codigo"
            label="Responsable (soporte)"
            :extra-params="{ estado: 'A' }"
            class="q-mb-sm"
          />
          <template v-else>
            <LookupSelect
              v-model="editForm.responsable"
              resource="funcionarios"
              value-field="nombre"
              label-field="nombre"
              lookup-code-field="documento"
              label="Responsable (funcionario)"
              :disable="!cliente"
              :extra-params="funcExtraParams"
              class="q-mb-sm"
              @pick="onEditFuncPick"
            />
          </template>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="editForm.fecha_inicio" label="Fecha inicio" type="date" dense outlined />
            </div>
            <div class="col-6">
              <q-input v-model="editForm.fecha_entrega" label="Fecha entrega" type="date" dense outlined />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" v-close-popup />
          <q-btn unelevated no-caps color="primary" label="Guardar" :loading="saving" @click="saveEdit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
import { ref, computed } from 'vue';
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
});
const emit = defineEmits(['changed', 'add', 'remove', 'update']);

const $q = useQuasar();
const api = useResource('actas_reunion_compromisos');
const saving = ref(false);
const esCliente = ref(false);
const editOpen = ref(false);
const editEsCliente = ref(false);
const editingRow = ref(null);
const editForm = ref(emptyForm());
const funcFormOpen = ref(false);
const funcCurrent = ref({});

const form = ref(emptyForm());

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

const columns = [
  { name: 'acciones', label: '', field: 'acciones', align: 'left' },
  { name: 'lado', label: 'Lado', field: 'lado', align: 'left' },
  { name: 'compromiso', label: 'Compromiso', field: 'compromiso', align: 'left' },
  { name: 'responsable', label: 'Responsable', field: 'responsable', align: 'left' },
  { name: 'fecha_inicio', label: 'Inicio', field: 'fecha_inicio', align: 'left' },
  { name: 'fecha_entrega', label: 'Entrega', field: 'fecha_entrega', align: 'left' },
];

function emptyForm() {
  return {
    compromiso: '',
    responsable: '',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_entrega: '',
  };
}

function rowKey(row) {
  if (row._localId) return row._localId;
  return `${row.consecutivo}~${row.item}`;
}

function nextItem() {
  if (!props.rows.length) return 1;
  return Math.max(...props.rows.map((r) => Number(r.item) || 0)) + 1;
}

function onFuncPick(row) {
  if (row?.nombre) form.value.responsable = row.nombre;
}

function onEditFuncPick(row) {
  if (row?.nombre) editForm.value.responsable = row.nombre;
}

function toDateInput(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

function openEdit(row) {
  editingRow.value = row;
  editEsCliente.value = row.lado === 'cliente';
  editForm.value = {
    compromiso: row.compromiso || '',
    responsable: row.responsable || '',
    fecha_inicio: toDateInput(row.fecha_inicio) || new Date().toISOString().slice(0, 10),
    fecha_entrega: toDateInput(row.fecha_entrega),
  };
  editOpen.value = true;
}

async function saveEdit() {
  if (!editForm.value.compromiso?.trim()) {
    $q.notify({ type: 'warning', message: 'Indique el compromiso' });
    return;
  }
  if (!editForm.value.responsable?.trim()) {
    $q.notify({ type: 'warning', message: 'Seleccione el responsable' });
    return;
  }
  if (editEsCliente.value && !props.cliente) {
    $q.notify({ type: 'warning', message: 'Seleccione el cliente del acta' });
    return;
  }

  const payload = {
    lado: editEsCliente.value ? 'cliente' : 'ix',
    compromiso: editForm.value.compromiso.trim(),
    responsable: editForm.value.responsable.trim(),
    fecha_inicio: editForm.value.fecha_inicio || null,
    fecha_entrega: editForm.value.fecha_entrega || null,
  };

  if (props.localMode) {
    emit('update', { ...editingRow.value, ...payload });
    editOpen.value = false;
    $q.notify({ type: 'positive', message: 'Compromiso actualizado' });
    return;
  }

  saving.value = true;
  try {
    await api.update(rowKey(editingRow.value), payload);
    editOpen.value = false;
    emit('changed');
    $q.notify({ type: 'positive', message: 'Compromiso actualizado' });
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al actualizar' });
  } finally {
    saving.value = false;
  }
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
  if (saved?.nombre) {
    form.value.responsable = saved.nombre;
    $q.notify({ type: 'positive', message: 'Funcionario creado y seleccionado como responsable' });
  }
}

async function add() {
  if (!form.value.compromiso?.trim()) {
    $q.notify({ type: 'warning', message: 'Indique el compromiso' });
    return;
  }
  if (!form.value.responsable?.trim()) {
    $q.notify({ type: 'warning', message: 'Seleccione el responsable' });
    return;
  }
  if (esCliente.value && !props.cliente) {
    $q.notify({ type: 'warning', message: 'Seleccione el cliente del acta' });
    return;
  }

  const payload = {
    lado: esCliente.value ? 'cliente' : 'ix',
    compromiso: form.value.compromiso,
    responsable: form.value.responsable,
    fecha_inicio: form.value.fecha_inicio || null,
    fecha_entrega: form.value.fecha_entrega || null,
  };

  if (props.localMode) {
    emit('add', { ...payload, _localId: `local-${Date.now()}-${Math.random()}` });
    form.value = emptyForm();
    return;
  }

  saving.value = true;
  try {
    await api.create({
      consecutivo: props.consecutivo,
      item: nextItem(),
      ...payload,
    });
    form.value = emptyForm();
    emit('changed');
    $q.notify({ type: 'positive', message: 'Compromiso agregado' });
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al agregar' });
  } finally {
    saving.value = false;
  }
}

function removeRow(row) {
  $q.dialog({ title: 'Eliminar', message: '¿Eliminar este compromiso?', cancel: true }).onOk(async () => {
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
  padding: 6px 14px;
}
.actreun-panel-btn--link {
  font-weight: 600;
  font-size: 12px;
}

.actreun-compromiso-cell {
  white-space: normal !important;
  word-break: break-word;
  max-width: 360px;
  vertical-align: top;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

.actreun-compromiso-cell__text {
  display: block;
  line-height: 1.45;
  min-height: 2.9em;
}

.actreun-acciones-cell {
  white-space: nowrap;
  vertical-align: top;
}
</style>
