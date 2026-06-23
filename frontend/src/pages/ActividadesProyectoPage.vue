<template>
  <q-page class="devsoporte-page">
    <div v-if="!mod" class="text-negative">Módulo no configurado</div>

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
        row-key="consecutivo"
        :loading="loading"
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 25, 50, 100]"
        @request="onRequest"
        flat
        bordered
      >
        <template #body-cell-firma="props">
          <q-td :props="props">
            <q-chip
              dense
              :color="props.row.firma_cli_fecha ? 'green-2' : 'grey-3'"
              :text-color="props.row.firma_cli_fecha ? 'green-10' : 'grey-8'"
              :icon="props.row.firma_cli_fecha ? 'verified' : 'schedule'"
              :label="props.row.firma_cli_fecha ? 'Firmado' : 'Pendiente'"
            >
              <q-tooltip v-if="props.row.firma_cli_fecha">
                {{ fmtDateTime(props.row.firma_cli_fecha) }}
                <template v-if="props.row.firma_cli_nombre"> · {{ props.row.firma_cli_nombre }}</template>
              </q-tooltip>
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-acciones="props">
          <q-td :props="props" class="text-right">
            <q-btn flat dense round icon="picture_as_pdf" color="red-7" @click="abrirPdf(props.row)">
              <q-tooltip>Ver PDF</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="forward_to_inbox"
              color="teal"
              :disable="!props.row.firma_cli_fecha"
              @click="openEnviarInforme(props.row)"
            >
              <q-tooltip>{{ props.row.firma_cli_fecha ? 'Enviar informe firmado por correo' : 'Disponible cuando el cliente firme' }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="draw"
              color="deep-purple"
              :disable="!!props.row.firma_cli_fecha"
              @click="enviarFirma(props.row)"
            >
              <q-tooltip>{{ props.row.firma_cli_fecha ? 'Ya firmado' : 'Enviar firma al cliente' }}</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="link" color="blue-grey" @click="copiarEnlace(props.row)">
              <q-tooltip>Copiar enlace de firma</q-tooltip>
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

      <ActproyFormDialog
        v-model="formOpen"
        :record="current"
        :is-edit="isEdit"
        @saved="onSaved"
      />

      <NotifyRecipientDialog
        v-model="notifyOpen"
        :cliente-codigo="notifyCliente"
        :record-id="notifyRecordId"
        notify-type="actproy"
        :title="`Enviar informe firmado — ${mod?.title || ''}`"
        :sending="sendingNotify"
        @send="onNotifySend"
      />

      <PDFViewerComponent
        v-if="pdfDocument"
        ref="pdfRef"
        :document="pdfDocument"
        :document-name="pdfDocumentName"
        @close="pdfDocument = null"
      />
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource, actproyApi } from 'src/services/api';
import { findModule } from 'src/config/modules';
import ActproyFormDialog from 'components/ActproyFormDialog.vue';
import PDFViewerComponent from 'components/PDFViewerComponent.vue';
import NotifyRecipientDialog from 'components/NotifyRecipientDialog.vue';

const $q = useQuasar();
const resource = 'actividades_proyecto';
const mod = computed(() => findModule(resource));

const rows = ref([]);
const loading = ref(false);
const search = ref('');
const formOpen = ref(false);
const isEdit = ref(false);
const current = ref({});
const pagination = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 });
const pdfDocument = ref(null);
const pdfDocumentName = ref('informe-actividades.pdf');
const pdfRef = ref(null);
const notifyOpen = ref(false);
const notifyCliente = ref('');
const notifyRecordId = ref('');
const sendingNotify = ref(false);

const tableColumns = computed(() => [
  ...(mod.value?.columns || []),
  { name: 'firma', label: 'Firma cliente', field: 'firma', align: 'center' },
  { name: 'acciones', label: '', field: 'acciones', align: 'right' },
]);

function fmtDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO');
}

async function load() {
  loading.value = true;
  try {
    const res = await useResource(resource).list({
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

function onSaved() {
  formOpen.value = false;
  load();
}

function confirmDelete(row) {
  $q.dialog({
    title: 'Confirmar',
    message: `¿Eliminar el informe ${row.consecutivo}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await useResource(resource).remove(row.consecutivo);
      $q.notify({ type: 'positive', message: 'Informe eliminado' });
      load();
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

async function abrirPdf(row) {
  try {
    const res = await actproyApi.pdf(row.consecutivo);
    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.error || 'Error al generar el PDF');
    }
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const cliente = (row.nombrecliente || row.cliente || 'informe').replace(/[<>:"/\\|?*]/g, '').trim();
    pdfDocumentName.value = `INFORME ACTIVIDADES ${cliente}.pdf`;
    pdfDocument.value = blob;
    setTimeout(() => pdfRef.value?.mostrarPDF(), 150);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || err.response?.data?.error || 'No se pudo generar el PDF',
    });
  }
}

function enviarFirma(row) {
  if (row.firma_cli_fecha) return;
  $q.dialog({
    title: 'Enviar firma al cliente',
    message: `Se enviará el enlace de firma del informe ${row.consecutivo} a los contactos de notificación del cliente. ¿Continuar?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const res = await actproyApi.enviarFirma(row.consecutivo);
      if (res.sent > 0) {
        $q.notify({ type: 'positive', icon: 'mail', message: `Enlace enviado a ${res.total} contacto(s)` });
      } else {
        $q.notify({ type: 'warning', message: res.error || 'No se envió ningún correo' });
      }
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al enviar la firma' });
    }
  });
}

function openEnviarInforme(row) {
  if (!row.firma_cli_fecha) {
    $q.notify({ type: 'warning', message: 'El informe debe estar firmado por el cliente antes de enviarlo' });
    return;
  }
  if (!row.cliente) {
    $q.notify({ type: 'warning', message: 'El informe no tiene cliente asignado' });
    return;
  }
  notifyRecordId.value = row.consecutivo;
  notifyCliente.value = row.cliente;
  notifyOpen.value = true;
}

async function onNotifySend(payload) {
  if (!notifyRecordId.value) return;
  sendingNotify.value = true;
  try {
    const data = await actproyApi.enviarInforme(notifyRecordId.value, payload);
    notifyOpen.value = false;
    if (data.sent > 0) {
      const pdfNote = data.pdfAttached ? ' con PDF adjunto' : '';
      $q.notify({ type: 'positive', icon: 'mail', message: `Informe enviado${pdfNote}` });
    } else {
      $q.notify({ type: 'warning', message: data.error || 'No se envió ningún correo' });
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Error al enviar el informe',
    });
  } finally {
    sendingNotify.value = false;
  }
}

async function copiarEnlace(row) {
  try {
    const estado = await actproyApi.firmaEstado(row.consecutivo);
    await navigator.clipboard.writeText(estado.url);
    $q.notify({ type: 'positive', icon: 'link', message: 'Enlace de firma copiado al portapapeles' });
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'No se pudo copiar el enlace' });
  }
}

onMounted(load);
</script>
