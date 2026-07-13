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
        <q-btn color="primary" icon="add" label="Nueva acta" @click="openCreate" />
      </div>

      <q-table
        :rows="rows"
        :columns="tableColumns"
        row-key="consecutivo"
        :loading="loading"
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 25, 50]"
        @request="onRequest"
        flat
        bordered
      >
        <template #body="props">
          <q-tr
            :props="props"
            class="cursor-pointer"
            :class="{ 'bg-blue-1': expanded === props.row.consecutivo }"
            @click="toggleExpand(props.row)"
          >
            <q-td auto-width @click.stop="toggleExpand(props.row)">
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="expanded === props.row.consecutivo ? 'expand_less' : 'expand_more'"
                color="primary"
              />
            </q-td>
            <q-td auto-width class="actreun-row-actions" @click.stop>
              <q-btn flat dense round icon="picture_as_pdf" color="red-7" @click="abrirPdf(props.row)">
                <q-tooltip>Ver PDF</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="edit"
                color="primary"
                :disable="!isAbierta(props.row)"
                @click="openEdit(props.row)"
              >
                <q-tooltip>{{ isAbierta(props.row) ? 'Editar' : 'Solo editable en estado Abierta' }}</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="delete" color="negative" @click="confirmDelete(props.row)">
                <q-tooltip>Eliminar</q-tooltip>
              </q-btn>
            </q-td>
            <q-td v-for="col in dataCols(props.cols)" :key="col.name" :props="props">
              <template v-if="col.name === 'estado'">
                <q-badge :color="estadoColor(props.row.estado)" :label="props.row.estado || 'Abierta'" />
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>

          <q-tr v-if="expanded === props.row.consecutivo">
            <q-td :colspan="tableColumns.length">
              <div class="q-pa-md bg-grey-1 rounded-borders">
                <div class="actreun-toolbar q-mb-md">
                  <span class="actreun-toolbar__label">{{ props.row.consecutivo }}</span>
                  <q-btn
                    v-if="isAbierta(props.row)"
                    unelevated
                    no-caps
                    color="deep-orange"
                    icon="flag"
                    label="Finalizar reunión"
                    class="actreun-action-btn"
                    @click="finalizar(props.row)"
                  />
                  <q-btn
                    v-if="isEnFirma(props.row)"
                    unelevated
                    no-caps
                    color="teal"
                    icon="mail"
                    label="Enviar firmas"
                    class="actreun-action-btn"
                    @click="enviarFirmas(props.row)"
                  />
                  <q-btn
                    v-if="isTerminada(props.row)"
                    unelevated
                    no-caps
                    color="primary"
                    icon="forward_to_inbox"
                    label="Enviar al equipo del cliente"
                    class="actreun-action-btn"
                    @click="openEnviarActa(props.row)"
                  />
                  <q-chip
                    v-if="firmaResumen[props.row.consecutivo]"
                    dense
                    :color="firmaResumen[props.row.consecutivo].todasFirmadas ? 'positive' : 'orange'"
                    text-color="white"
                    :label="`${firmaResumen[props.row.consecutivo].firmados}/${firmaResumen[props.row.consecutivo].total} firmas`"
                  />
                </div>

                <div class="text-subtitle2 q-mb-md">Compromisos y asistentes</div>

                <q-card flat bordered class="actreun-section q-mb-md">
                  <q-card-section class="actreun-section__head">
                    <span class="text-subtitle2">Compromisos adquiridos</span>
                  </q-card-section>
                  <q-separator />
                  <q-card-section>
                    <DetailCompromisos
                      :consecutivo="props.row.consecutivo"
                      :cliente="props.row.cliente"
                      :rows="allCompromisos(props.row.consecutivo)"
                      :editable="isAbierta(props.row)"
                      @changed="reloadDetail(props.row.consecutivo)"
                    />
                  </q-card-section>
                </q-card>

                <q-card flat bordered class="actreun-section">
                  <q-card-section class="actreun-section__head">
                    <span class="text-subtitle2">Asistentes</span>
                  </q-card-section>
                  <q-separator />
                  <q-card-section>
                    <DetailAsistentes
                      :consecutivo="props.row.consecutivo"
                      :cliente="props.row.cliente"
                      :rows="allAsistentes(props.row.consecutivo)"
                      :editable="isAbierta(props.row)"
                      :show-firma-actions="isEnFirma(props.row) || isTerminada(props.row)"
                      @changed="onDetailChanged(props.row)"
                      @enviar-firma="(row) => enviarFirmaAsistente(row)"
                    />
                  </q-card-section>
                </q-card>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>

      <ActaReunionFormDialog
        v-model="formOpen"
        :record="current"
        :is-edit="isEdit"
        @saved="onSaved"
      />

      <NotifyRecipientDialog
        v-model="notifyOpen"
        :cliente-codigo="notifyCliente"
        :record-id="notifyRecordId"
        :notify-type="notifyType"
        :title="notifyTitle"
        :sending="sendingNotify"
        @send="onNotifySend"
      />

      <PDFViewerComponent ref="pdfRef" :document="pdfDocument" :document-name="pdfDocumentName" />
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource, actreunApi } from 'src/services/api';
import { findModule } from 'src/config/modules';
import ActaReunionFormDialog from 'components/ActaReunionFormDialog.vue';
import PDFViewerComponent from 'components/PDFViewerComponent.vue';
import NotifyRecipientDialog from 'components/NotifyRecipientDialog.vue';
import DetailCompromisos from 'components/ActaReunionCompromisosPanel.vue';
import DetailAsistentes from 'components/ActaReunionAsistentesPanel.vue';

const $q = useQuasar();
const resource = 'actas_reunion';
const mod = computed(() => findModule(resource));

const rows = ref([]);
const loading = ref(false);
const search = ref('');
const formOpen = ref(false);
const isEdit = ref(false);
const current = ref({});
const pagination = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 });
const expanded = ref(null);
const detailCache = ref({});
const firmaResumen = ref({});

const pdfDocument = ref(null);
const pdfDocumentName = ref('acta-reunion.pdf');
const pdfRef = ref(null);

const notifyOpen = ref(false);
const notifyCliente = ref('');
const notifyRecordId = ref('');
const notifyType = ref('actreun');
const notifyTitle = ref('Enviar acta al equipo del cliente');
const sendingNotify = ref(false);

const tableColumns = computed(() => [
  { name: '_expand', label: '', field: '_expand', align: 'left' },
  { name: 'acciones', label: 'Acciones', field: 'acciones', align: 'left' },
  ...(mod.value?.columns || []),
]);

function dataCols(cols) {
  return cols.filter((c) => c.name !== 'acciones' && c.name !== '_expand');
}

function isAbierta(row) {
  return (row.estado || 'Abierta') === 'Abierta';
}

function isEnFirma(row) {
  return row.estado === 'En firma';
}

function isTerminada(row) {
  return row.estado === 'Terminada';
}

function estadoColor(estado) {
  const map = { Abierta: 'primary', 'En firma': 'orange', Terminada: 'positive' };
  return map[estado] || 'grey';
}

function allCompromisos(consecutivo) {
  return detailCache.value[consecutivo]?.compromisos || [];
}

function allAsistentes(consecutivo) {
  return detailCache.value[consecutivo]?.asistentes || [];
}

async function loadFirmaResumen(consecutivo) {
  try {
    const data = await actreunApi.firmaEstado(consecutivo);
    firmaResumen.value = { ...firmaResumen.value, [consecutivo]: data };
  } catch {
    /* ignora */
  }
}

async function loadDetail(consecutivo) {
  const compApi = useResource('actas_reunion_compromisos');
  const asisApi = useResource('actas_reunion_asistentes');
  const [comp, asis] = await Promise.all([
    compApi.list({ consecutivo, limit: 200 }),
    asisApi.list({ consecutivo, limit: 200 }),
  ]);
  detailCache.value = {
    ...detailCache.value,
    [consecutivo]: { compromisos: comp.data, asistentes: asis.data },
  };
  await loadFirmaResumen(consecutivo);
}

async function reloadDetail(consecutivo) {
  await loadDetail(consecutivo);
}

async function onDetailChanged(row) {
  await reloadDetail(row.consecutivo);
  await load();
}

async function toggleExpand(row) {
  if (expanded.value === row.consecutivo) {
    expanded.value = null;
    return;
  }
  expanded.value = row.consecutivo;
  if (!detailCache.value[row.consecutivo]) {
    try {
      await loadDetail(row.consecutivo);
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar detalle' });
    }
  } else {
    await loadFirmaResumen(row.consecutivo);
  }
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
    if (expanded.value && !res.data.some((r) => r.consecutivo === expanded.value)) {
      expanded.value = null;
    }
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
    message: `¿Eliminar el acta ${row.consecutivo}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await useResource(resource).remove(row.consecutivo);
      $q.notify({ type: 'positive', message: 'Acta eliminada' });
      load();
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

function finalizar(row) {
  $q.dialog({
    title: 'Finalizar reunión',
    message: `¿Cerrar el acta ${row.consecutivo} para iniciar el proceso de firmas? Ya no podrá editar compromisos ni asistentes.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await actreunApi.finalizar(row.consecutivo);
      $q.notify({ type: 'positive', message: 'Reunión finalizada. Puede enviar enlaces de firma.' });
      await load();
      if (expanded.value === row.consecutivo) await reloadDetail(row.consecutivo);
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'No se pudo finalizar' });
    }
  });
}

function enviarFirmas(row) {
  if (!row.cliente) {
    $q.notify({ type: 'warning', message: 'El acta no tiene cliente asignado' });
    return;
  }
  notifyRecordId.value = row.consecutivo;
  notifyCliente.value = row.cliente;
  notifyType.value = 'actreun_firmas';
  notifyTitle.value = 'Enviar enlaces de firma a asistentes';
  notifyOpen.value = true;
}

async function enviarFirmaAsistente(row) {
  try {
    const id = `${row.consecutivo}~${row.item}`;
    const res = await actreunApi.enviarFirmaAsistente(id);
    $q.notify({ type: 'positive', icon: 'mail', message: `Enlace enviado a ${res.email}` });
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'No se pudo enviar' });
  }
}

function openEnviarActa(row) {
  if (!row.cliente) {
    $q.notify({ type: 'warning', message: 'El acta no tiene cliente asignado' });
    return;
  }
  notifyRecordId.value = row.consecutivo;
  notifyCliente.value = row.cliente;
  notifyType.value = 'actreun';
  notifyTitle.value = 'Enviar acta al equipo del cliente';
  notifyOpen.value = true;
}

async function onNotifySend(payload) {
  if (!notifyRecordId.value) return;
  sendingNotify.value = true;
  try {
    if (notifyType.value === 'actreun_firmas') {
      const data = await actreunApi.enviarFirmas(notifyRecordId.value, payload);
      notifyOpen.value = false;
      if (data.sent > 0) {
        $q.notify({
          type: 'positive',
          icon: 'mail',
          message: `Enlaces enviados: ${data.sent} de ${data.total}`,
        });
      } else {
        $q.notify({ type: 'warning', message: data.error || 'No se envió ningún correo' });
      }
      if (expanded.value === notifyRecordId.value) await reloadDetail(notifyRecordId.value);
      await load();
      return;
    }

    const data = await actreunApi.enviarActa(notifyRecordId.value, payload);
    notifyOpen.value = false;
    if (data.sent > 0) {
      $q.notify({ type: 'positive', icon: 'mail', message: `Acta enviada a ${data.sent} destinatario(s) con PDF adjunto` });
    } else {
      $q.notify({ type: 'warning', message: data.error || 'No se envió ningún correo' });
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al enviar' });
  } finally {
    sendingNotify.value = false;
  }
}

async function abrirPdf(row) {
  try {
    const res = await actreunApi.pdf(row.consecutivo);
    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.error || 'Error al generar el PDF');
    }
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const cliente = (row.nombrecliente || row.cliente || 'acta').replace(/[<>:"/\\|?*]/g, '').trim();
    pdfDocumentName.value = `ACTA REUNION ${cliente}.pdf`;
    pdfDocument.value = blob;
    setTimeout(() => pdfRef.value?.mostrarPDF(), 150);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || err.response?.data?.error || 'No se pudo generar el PDF',
    });
  }
}

onMounted(load);
</script>

<style scoped>
.actreun-row-actions {
  white-space: nowrap;
}

.actreun-toolbar {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  overflow-x: auto;
}

.actreun-toolbar__label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
  white-space: nowrap;
  margin-right: 4px;
}

.actreun-action-btn {
  border-radius: 8px;
  font-weight: 600;
  padding: 6px 14px;
  flex-shrink: 0;
}
.actreun-section {
  border-radius: 10px;
  border-color: #dce3eb !important;
  background: #fff;
}
.actreun-section__head {
  padding: 10px 14px !important;
}
</style>
