<template>
  <q-page class="devsoporte-page">
    <div v-if="!mod" class="text-negative">Módulo no configurado: {{ resource }}</div>

    <template v-else>
      <div class="row items-center q-mb-md">
        <div class="page-title">{{ mod.title }}</div>
        <q-space />
        <q-input
          v-model="search"
          dense
          outlined
          debounce="400"
          placeholder="Buscar..."
          class="q-mr-sm"
          @update:model-value="reload"
        >
          <template #append><q-icon name="search" /></template>
        </q-input>
        <q-btn color="primary" icon="add" label="Nuevo" @click="openCreate" />
      </div>

      <q-table
        :rows="rows"
        :columns="tableColumns"
        :row-key="rowKey"
        :loading="loading"
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 25, 50, 100]"
        @request="onRequest"
        flat
        bordered
      >
        <template #body-cell-acciones="props">
          <q-td :props="props" class="text-right">
            <q-btn
              v-if="mod.notifyEmail && props.row.cliente"
              flat
              dense
              round
              icon="forward_to_inbox"
              color="teal"
              @click="openNotify(props.row)"
            >
              <q-tooltip>Enviar notificación por correo</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="edit" color="primary" @click="openEdit(props.row)">
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete" color="negative" @click="confirmDelete(props.row)">
              <q-tooltip>Eliminar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <GenericForm
        v-model="formOpen"
        :module="mod"
        :record="current"
        :is-edit="isEdit"
        @saved="onSaved"
      />

      <NotifyRecipientDialog
        v-model="notifyOpen"
        :cliente-codigo="notifyCliente"
        :record-id="notifyRecordId"
        notify-type="bitacora"
        :title="`Enviar notificación — ${mod?.title || ''}`"
        @send="onNotifySend"
      />
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource, notificacionApi } from 'src/services/api';
import { findModule } from 'src/config/modules';
import GenericForm from 'components/GenericForm.vue';
import NotifyRecipientDialog from 'components/NotifyRecipientDialog.vue';

const props = defineProps({ resource: { type: String, required: true } });
const $q = useQuasar();

const mod = computed(() => findModule(props.resource));
const rows = ref([]);
const loading = ref(false);
const search = ref('');
const formOpen = ref(false);
const isEdit = ref(false);
const current = ref({});
const notifyOpen = ref(false);
const notifyCliente = ref('');
const notifyRecordId = ref('');

const pagination = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 });

// Columna extra de acciones (editar / eliminar).
const tableColumns = computed(() => [
  ...(mod.value?.columns || []),
  { name: 'acciones', label: '', field: 'acciones', align: 'right' },
]);

const idFields = computed(() => {
  const id = mod.value?.idField;
  return Array.isArray(id) ? id : [id];
});

function rowKey(row) {
  return idFields.value.map((f) => row[f]).join('~');
}

async function load() {
  if (!mod.value) return;
  loading.value = true;
  try {
    const api = useResource(props.resource);
    const res = await api.list({
      q: search.value,
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
    });
    rows.value = res.data;
    pagination.value.rowsNumber = res.total;
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar' });
  } finally {
    loading.value = false;
  }
}

function onRequest(reqProps) {
  pagination.value.page = reqProps.pagination.page;
  pagination.value.rowsPerPage = reqProps.pagination.rowsPerPage;
  load();
}

function reload() {
  pagination.value.page = 1;
  load();
}

function openCreate() {
  current.value = {};
  isEdit.value = false;
  formOpen.value = true;
}

function openEdit(row) {
  current.value = { ...row };
  isEdit.value = true;
  formOpen.value = true;
}

function confirmDelete(row) {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Eliminar el registro seleccionado?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await useResource(props.resource).remove(rowKey(row));
      $q.notify({ type: 'positive', message: 'Registro eliminado' });
      load();
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

function onSaved() {
  formOpen.value = false;
  load();
}

function openNotify(row) {
  if (!row.cliente) {
    $q.notify({ type: 'warning', message: 'El registro no tiene cliente asignado' });
    return;
  }
  notifyRecordId.value = rowKey(row);
  notifyCliente.value = row.cliente;
  notifyOpen.value = true;
}

async function onNotifySend(payload) {
  if (!notifyRecordId.value) return;
  try {
    const data =
      props.resource === 'bitacora'
        ? await notificacionApi.bitacora(notifyRecordId.value, payload)
        : await notificacionApi.capacitacion(notifyRecordId.value, payload);
    notifyOpen.value = false;
    if (data.sent > 0) {
      $q.notify({ type: 'positive', icon: 'mail', message: `${data.sent} correo(s) enviado(s)` });
    } else {
      $q.notify({ type: 'warning', message: data.error || 'No se envió ningún correo' });
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Error al enviar la notificación',
    });
  }
}

watch(() => props.resource, reload);
onMounted(load);
</script>
