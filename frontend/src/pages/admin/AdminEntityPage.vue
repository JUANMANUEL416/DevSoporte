<template>
  <q-page class="devsoporte-page admin-entity-page">
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
        <q-btn color="orange-9" icon="add" label="Nuevo" @click="openCreate" />
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
              v-if="mod.pdf"
              flat
              dense
              round
              icon="picture_as_pdf"
              color="orange-9"
              @click="openPdf(props.row)"
            >
              <q-tooltip>Ver PDF</q-tooltip>
            </q-btn>
            <q-btn
              v-if="mod.duplicate"
              flat
              dense
              round
              icon="content_copy"
              color="teal-7"
              @click="openDuplicate(props.row)"
            >
              <q-tooltip>Duplicar</q-tooltip>
            </q-btn>
            <q-btn
              v-if="mod.email"
              flat
              dense
              round
              icon="mail"
              color="primary"
              @click="openEmail(props.row)"
            >
              <q-tooltip>Enviar por correo</q-tooltip>
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
        :is-duplicate="isDuplicate"
        @saved="onSaved"
      />

      <PDFViewerComponent
        v-if="pdfDocument"
        ref="pdfRef"
        :document="pdfDocument"
        :document-name="pdfDocumentName"
        @close="pdfDocument = null"
      />

      <NotifyRecipientDialog
        v-model="notifyOpen"
        notify-type="vip_cuenta_cobro"
        title="Enviar cuenta de cobro"
        :cliente-codigo="notifyClienteCodigo"
        :record-id="notifyRecordId"
        :sending="notifySending"
        @send="onNotifySend"
      />
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource, vipCuentasCobroApi } from 'src/services/api';
import { findAdminEntityModule } from 'src/config/adminEntityModules';
import GenericForm from 'components/GenericForm.vue';
import PDFViewerComponent from 'components/PDFViewerComponent.vue';
import NotifyRecipientDialog from 'components/NotifyRecipientDialog.vue';

const props = defineProps({ resource: { type: String, required: true } });
const $q = useQuasar();

const mod = computed(() => findAdminEntityModule(props.resource));
const rows = ref([]);
const loading = ref(false);
const search = ref('');
const formOpen = ref(false);
const isEdit = ref(false);
const isDuplicate = ref(false);
const current = ref({});
const pdfDocument = ref(null);
const pdfDocumentName = ref('cuenta-cobro.pdf');
const pdfRef = ref(null);
const notifyOpen = ref(false);
const notifySending = ref(false);
const notifyRecordId = ref('');
const notifyClienteCodigo = ref('');

const pagination = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 });

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
  isDuplicate.value = false;
  formOpen.value = true;
}

function openEdit(row) {
  isEdit.value = true;
  isDuplicate.value = false;
  current.value = { ...row };
  formOpen.value = true;
}

function toDateKey(value) {
  if (!value) return '';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addOneMonth(iso) {
  const key = toDateKey(iso);
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  const next = new Date(y, m - 1 + 1, d);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function buildDuplicateCxc(source) {
  const copy = { ...source };
  delete copy.cns;
  delete copy.numero;
  delete copy.valor_letras;
  delete copy.cliente_nombre;
  copy.fecha_emision = todayISO();
  if (copy.periodo_desde) copy.periodo_desde = addOneMonth(copy.periodo_desde);
  if (copy.periodo_hasta) copy.periodo_hasta = addOneMonth(copy.periodo_hasta);
  if (!copy.estado) copy.estado = 'Emitida';
  return copy;
}

async function openDuplicate(row) {
  try {
    const full = await useResource(props.resource).get(row.cns);
    current.value = buildDuplicateCxc(full);
    isEdit.value = false;
    isDuplicate.value = true;
    formOpen.value = true;
    $q.notify({
      type: 'info',
      message: 'Cuenta duplicada. El periodo se avanzó un mes; revise concepto y fechas antes de guardar.',
      timeout: 4500,
    });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo cargar la cuenta para duplicar',
    });
  }
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
  isDuplicate.value = false;
  load();
}

async function openPdf(row) {
  try {
    const res = await vipCuentasCobroApi.pdf(row.cns);
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const cliente = String(row.cliente_nombre || row.codigo_cliente || 'cliente').split(' ')[0];
    const numero = String(row.numero || row.cns || '').replace(/\s/g, '');
    pdfDocumentName.value = `Cuenta Cobro ${numero} ${cliente}.pdf`;
    pdfDocument.value = blob;
    setTimeout(() => pdfRef.value?.mostrarPDF(), 150);
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'No se pudo generar el PDF' });
  }
}

function openEmail(row) {
  notifyRecordId.value = String(row.cns);
  notifyClienteCodigo.value = row.codigo_cliente || '';
  notifyOpen.value = true;
}

async function onNotifySend(data) {
  notifySending.value = true;
  try {
    const payload = data?.payload ?? data;
    const files = data?.files || [];
    const result = await vipCuentasCobroApi.enviarNotificacion(notifyRecordId.value, payload, files);
    const extra = result.extraCount ? ` (${result.extraCount} adjunto(s) extra)` : '';
    $q.notify({
      type: 'positive',
      message: result.from
        ? `Correo enviado desde ${result.from}${extra}`
        : 'Correo enviado',
    });
    notifyOpen.value = false;
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'No se pudo enviar el correo' });
  } finally {
    notifySending.value = false;
  }
}

watch(() => props.resource, reload);
onMounted(load);
</script>

<style scoped>
.admin-entity-page .page-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #5d4037;
}
</style>
