<template>
  <q-page class="capacitaciones-page">
    <section class="cap-hero">
      <div class="cap-hero__main">
        <div class="cap-hero__icon">
          <q-icon name="school" size="22px" />
        </div>
        <div>
          <p class="cap-hero__eyebrow">Soporte</p>
          <h1 class="cap-hero__title">Control Capacitaciones</h1>
          <p class="cap-hero__subtitle">
            Registre actas, gestione asistentes, firmas digitales y envío de notificaciones.
          </p>
        </div>
      </div>
      <div class="cap-hero__meta">
        <span class="cap-hero__chip">
          <strong>{{ pagCap.rowsNumber }}</strong>
          {{ pagCap.rowsNumber === 1 ? 'capacitación' : 'capacitaciones' }}
        </span>
        <span v-if="expandedCnscapacita" class="cap-hero__chip cap-hero__chip--active">
          <q-icon name="groups" size="14px" />
          <strong>{{ currentAsisRows.length }}</strong>
          {{ currentAsisRows.length === 1 ? 'asistente' : 'asistentes' }}
        </span>
      </div>
    </section>

    <q-banner v-if="mailConfigured === false" dense rounded class="cap-alert q-mb-md">
      <template #avatar><q-icon name="mail" color="orange" /></template>
      Correo no configurado en el servidor (SMTP). Los enlaces de firma no se enviarán hasta configurar
      <code>SMTP_HOST</code> y <code>SMTP_USER</code> en el archivo <code>.env</code> del backend.
    </q-banner>

    <section class="cap-panel">
      <header class="cap-panel__header cap-panel__header--compact">
        <div class="cap-panel__actions">
          <q-input
            v-model="searchCap"
            dense
            outlined
            debounce="400"
            placeholder="Buscar capacitación..."
            class="cap-search"
            bg-color="white"
            @update:model-value="onSearchCap"
          >
            <template #prepend><q-icon name="search" color="grey-6" /></template>
          </q-input>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nueva capacitación"
            class="cap-btn"
            @click="openCapCreate"
          />
        </div>
      </header>

      <q-table
        class="cap-table"
        :rows="capRows"
        :columns="capColumns"
        row-key="cnscapacita"
        :loading="loadingCap"
        v-model:pagination="pagCap"
        :rows-per-page-options="[5, 10, 25]"
        flat
        bordered
        @request="onCapRequest"
      >
        <template #body="props">
          <q-tr
            :props="props"
            class="cap-table__row"
            :class="{ 'cap-table__row--expanded': expandedCnscapacita === props.row.cnscapacita }"
            @click="toggleExpand(props.row)"
          >
            <q-td auto-width class="cap-table__expand-cell" @click.stop="toggleExpand(props.row)">
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="expandedCnscapacita === props.row.cnscapacita ? 'expand_less' : 'expand_more'"
                color="primary"
              />
            </q-td>
            <q-td auto-width class="cap-table__actions-cell" @click.stop>
              <div class="cap-actions">
                <q-btn
                  flat
                  dense
                  round
                  icon="edit"
                  color="primary"
                  :disable="!isCapAbierta(props.row)"
                  @click="openCapEdit(props.row)"
                >
                  <q-tooltip>
                    {{ isCapAbierta(props.row) ? 'Editar' : 'No editable: capacitación cerrada o anulada' }}
                  </q-tooltip>
                </q-btn>
              </div>
            </q-td>
            <q-td v-for="col in dataCols(props.cols)" :key="col.name" :props="props">
              <template v-if="col.name === 'estado'">
                <q-badge
                  :color="estadoColor(props.row.estado)"
                  :label="props.row.estado || 'Abierta'"
                  class="cap-badge"
                />
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>

          <q-tr v-if="expandedCnscapacita === props.row.cnscapacita" class="cap-table__expand-row">
            <q-td :colspan="capColumns.length">
              <div class="asistentes-expand">
                <header class="asistentes-expand__header">
                  <div>
                    <h3 class="asistentes-expand__title">
                      <q-icon name="groups" size="18px" class="q-mr-xs" />
                      Participantes
                    </h3>
                  </div>
                  <div class="asistentes-expand__actions">
                    <q-btn
                      v-if="isCapAbierta(props.row)"
                      unelevated
                      color="deep-orange"
                      icon="flag"
                      label="Cambiar estado"
                      size="sm"
                      class="cap-btn"
                      @click="openEstadoDialog(props.row)"
                    />
                    <q-btn
                      flat
                      color="info"
                      icon="link"
                      label="Copiar enlace"
                      size="sm"
                      class="cap-btn"
                      :disable="!props.row.cliente || !isCapAbierta(props.row)"
                      :loading="copyingRegistroCapId === props.row.cnscapacita"
                      @click="copyRegistroLinkForCap(props.row)"
                    />
                    <q-btn
                      flat
                      color="secondary"
                      icon="picture_as_pdf"
                      label="Ver PDF"
                      size="sm"
                      class="cap-btn"
                      @click="printCap(props.row)"
                    />
                    <q-btn
                      flat
                      color="teal"
                      icon="forward_to_inbox"
                      label="Enviar acta"
                      size="sm"
                      class="cap-btn"
                      :disable="!props.row.cliente || props.row.estado !== 'Cerrada'"
                      @click="openNotifyCap(props.row)"
                    >
                      <q-tooltip v-if="props.row.estado !== 'Cerrada'">
                        Disponible cuando la capacitación esté cerrada
                      </q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="isCapAbierta(props.row)"
                      flat
                      color="info"
                      icon="mail"
                      label="Firmas pendientes"
                      size="sm"
                      class="cap-btn"
                      :loading="sendingFirmasCapId === props.row.cnscapacita"
                      @click="enviarFirmasPendientes(props.row)"
                    />
                    <q-btn
                      v-if="isCapAbierta(props.row)"
                      unelevated
                      color="primary"
                      icon="person_add"
                      label="Agregar asistente"
                      size="sm"
                      class="cap-btn"
                      @click="openAsisCreate(props.row)"
                    />
                  </div>
                </header>

                <q-inner-loading :showing="isAsisLoading(props.row.cnscapacita)" />

                <q-table
                  v-if="getAsisRows(props.row.cnscapacita).length"
                  class="asistentes-table"
                  :rows="getAsisRows(props.row.cnscapacita)"
                  :columns="asisColumns"
                  :row-key="asisRowKey"
                  flat
                  bordered
                  dense
                  hide-pagination
                  :pagination="{ rowsPerPage: 0 }"
                >
                  <template #body-cell-acciones="cell">
                    <q-td :props="cell">
                      <div v-if="isCapAbierta(props.row)" class="cap-actions">
                        <q-btn
                          flat
                          dense
                          round
                          icon="mail"
                          color="info"
                          :loading="sendingFirmaId === asisRowKey(cell.row)"
                          @click="enviarFirma(cell.row)"
                        >
                          <q-tooltip>Enviar enlace de firma por correo</q-tooltip>
                        </q-btn>
                        <q-btn flat dense round icon="draw" color="secondary" @click="openFirma(cell.row)">
                          <q-tooltip>Firmar</q-tooltip>
                        </q-btn>
                        <q-btn flat dense round icon="edit" color="primary" @click="openAsisEdit(cell.row)">
                          <q-tooltip>Editar</q-tooltip>
                        </q-btn>
                        <q-btn flat dense round icon="delete" color="negative" @click="confirmAsisDelete(cell.row)">
                          <q-tooltip>Eliminar</q-tooltip>
                        </q-btn>
                      </div>
                      <span v-else class="text-grey-6 text-caption">—</span>
                    </q-td>
                  </template>
                  <template #body-cell-firma="cell">
                    <q-td :props="cell">
                      <q-badge
                        :color="cell.row.firma ? 'positive' : 'grey-5'"
                        :label="cell.row.firma ? 'Firmado' : 'Pendiente'"
                        class="cap-badge"
                      />
                    </q-td>
                  </template>
                </q-table>

                <div v-else-if="!isAsisLoading(props.row.cnscapacita)" class="asistentes-expand__empty">
                  <q-icon name="person_off" size="28px" color="grey-4" />
                  <span>Esta capacitación no tiene participantes registrados.</span>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </section>

    <GenericForm
      v-model="formCapOpen"
      :module="capModule"
      :record="capCurrent"
      :is-edit="capIsEdit"
      @saved="onCapSaved"
    />

    <GenericForm
      v-model="formAsisOpen"
      :module="asisModule"
      :record="asisCurrent"
      :is-edit="asisIsEdit"
      :context="asisContext"
      @saved="onAsisSaved"
    />

    <PDFViewerComponent
      v-if="pdfDocument"
      ref="pdfRef"
      :document="pdfDocument"
      :document-name="pdfDocumentName"
      @close="pdfDocument = null"
    />

    <q-dialog v-model="firmaOpen" persistent>
      <q-card class="cap-firma-dialog">
        <q-card-section class="cap-firma-dialog__header">
          <div>
            <p class="cap-firma-dialog__eyebrow">Firma digital</p>
            <div class="cap-firma-dialog__title">Firma del asistente</div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="firmaAsistente">
          <div class="cap-firma-dialog__person q-mb-md">
            <strong>{{ firmaAsistente.nombres }}</strong>
            <span class="text-grey q-ml-sm">— Doc. {{ firmaAsistente.documento }}</span>
          </div>
          <SignaturePad
            v-if="firmaOpen"
            :key="`${firmaAsistente.cnscapacita}-${firmaAsistente.item}`"
            :titulo="firmaAsistente.firma ? 'Actualizar firma' : 'Registrar firma'"
            :existing-image="firmaAsistente.firma || ''"
            height="240px"
            @save="onFirmaSave"
            @cancel="firmaOpen = false"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="estadoDialogOpen" persistent>
      <q-card class="cap-estado-dialog">
        <q-card-section class="cap-estado-dialog__header">
          <div>
            <p class="cap-estado-dialog__eyebrow">Estado de capacitación</p>
            <div class="cap-estado-dialog__title">{{ estadoCapRow?.cnscapacita }}</div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="estadoOpciones">
          <p class="text-body2 q-mb-md">
            Estado actual:
            <q-badge :color="estadoColor(estadoOpciones.estado)" :label="estadoOpciones.estado" />
          </p>
          <div class="cap-estado-dialog__options">
            <q-btn
              unelevated
              color="positive"
              icon="check_circle"
              label="Cerrar capacitación"
              class="full-width q-mb-sm"
              :disable="!estadoOpciones.puedeCerrar || changingEstado"
              :loading="changingEstado && pendingEstado === 'Cerrada'"
              @click="aplicarEstado('Cerrada')"
            />
            <p v-if="!estadoOpciones.puedeCerrar" class="cap-estado-dialog__hint">{{ estadoOpciones.motivoCerrar }}</p>
            <q-btn
              unelevated
              color="grey-8"
              icon="cancel"
              label="Anular capacitación"
              class="full-width q-mt-md"
              :disable="!estadoOpciones.puedeAnular || changingEstado"
              :loading="changingEstado && pendingEstado === 'Anulada'"
              @click="aplicarEstado('Anulada')"
            />
            <p v-if="!estadoOpciones.puedeAnular" class="cap-estado-dialog__hint">{{ estadoOpciones.motivoAnular }}</p>
          </div>
        </q-card-section>
        <q-inner-loading :showing="loadingEstadoOpciones" />
      </q-card>
    </q-dialog>

    <NotifyRecipientDialog
      v-model="notifyOpen"
      :cliente-codigo="notifyCliente"
      :record-id="notifyCapId"
      notify-type="capacitacion"
      title="Enviar acta cerrada"
      :sending="sendingNotify"
      @send="onNotifySend"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource, notificacionApi, capacitacionesApi } from 'src/services/api';
import { api } from 'src/boot/axios';
import { findModule } from 'src/config/modules';
import GenericForm from 'components/GenericForm.vue';
import PDFViewerComponent from 'components/PDFViewerComponent.vue';
import SignaturePad from 'components/SignaturePad.vue';
import NotifyRecipientDialog from 'components/NotifyRecipientDialog.vue';

const $q = useQuasar();
const capApi = useResource('capacitaciones');
const asisApi = useResource('asistentes');

const mod = findModule('capacitaciones');
const capModule = computed(() => mod);

const asisCapCtx = ref(null);
const asisContext = computed(() => {
  if (!asisCapCtx.value) return {};
  return {
    cliente: asisCapCtx.value.cliente,
    cnscapacita: asisCapCtx.value.cnscapacita,
  };
});

const asisModule = computed(() => ({
  resource: mod.detail.resource,
  title: 'Asistente',
  formCols: mod.detail.formCols || 4,
  idField: mod.detail.idField,
  fields: [
    { name: 'cnscapacita', label: 'Capacitación', type: 'text', hidden: true },
    ...mod.detail.fields,
  ],
}));

const capColumns = computed(() => [
  { name: 'expand', label: '', field: 'expand', align: 'left', style: 'width: 40px' },
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 52px' },
  ...mod.columns,
]);
const asisColumns = computed(() => [
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 160px' },
  ...mod.detail.columns,
  { name: 'firma', label: 'Firma', field: 'firma', align: 'center' },
]);

const capRows = ref([]);
const asisCache = ref({});
const asisLoading = ref({});
const loadingCap = ref(false);
const searchCap = ref('');
const expandedCnscapacita = ref(null);
const pagCap = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const formCapOpen = ref(false);
const formAsisOpen = ref(false);
const capIsEdit = ref(false);
const asisIsEdit = ref(false);
const capCurrent = ref({});
const asisCurrent = ref({});

const pdfDocument = ref(null);
const pdfDocumentName = ref('capacitacion.pdf');
const pdfRef = ref(null);

const firmaOpen = ref(false);
const firmaAsistente = ref(null);
const sendingFirmaId = ref('');
const sendingFirmasCapId = ref('');
const mailConfigured = ref(null);
const copyingRegistroCapId = ref('');
const notifyOpen = ref(false);
const notifyCliente = ref('');
const notifyCapId = ref('');
const sendingNotify = ref(false);
const estadoDialogOpen = ref(false);
const estadoCapRow = ref(null);
const estadoOpciones = ref(null);
const loadingEstadoOpciones = ref(false);
const changingEstado = ref(false);
const pendingEstado = ref('');

const currentAsisRows = computed(() =>
  expandedCnscapacita.value ? getAsisRows(expandedCnscapacita.value) : [],
);

function dataCols(cols) {
  return cols.filter((c) => c.name !== 'acciones' && c.name !== 'expand');
}

function isCapAbierta(row) {
  return (row?.estado || 'Abierta') === 'Abierta';
}

function estadoColor(estado) {
  const map = { Abierta: 'primary', Cerrada: 'positive', Anulada: 'grey-7' };
  return map[estado] || 'grey';
}

function asisRowKey(row) {
  return `${row.cnscapacita}~${row.item}`;
}

function getAsisRows(cnscapacita) {
  return asisCache.value[cnscapacita]?.rows || [];
}

function isAsisLoading(cnscapacita) {
  return !!asisLoading.value[cnscapacita];
}

async function loadCapacitaciones() {
  loadingCap.value = true;
  try {
    const res = await capApi.list({
      q: searchCap.value,
      page: pagCap.value.page,
      limit: pagCap.value.rowsPerPage,
    });
    capRows.value = res.data;
    pagCap.value.rowsNumber = res.total;

    if (
      expandedCnscapacita.value
      && !res.data.some((r) => r.cnscapacita === expandedCnscapacita.value)
    ) {
      expandedCnscapacita.value = null;
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar capacitaciones' });
  } finally {
    loadingCap.value = false;
  }
}

async function loadAsistentes(cnscapacita, force = false) {
  if (!force && asisCache.value[cnscapacita]) return;

  asisLoading.value = { ...asisLoading.value, [cnscapacita]: true };
  try {
    const res = await asisApi.list({ cnscapacita, limit: 200 });
    asisCache.value = {
      ...asisCache.value,
      [cnscapacita]: { rows: res.data },
    };
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar asistentes' });
  } finally {
    asisLoading.value = { ...asisLoading.value, [cnscapacita]: false };
  }
}

function toggleExpand(row) {
  if (expandedCnscapacita.value === row.cnscapacita) {
    expandedCnscapacita.value = null;
    return;
  }
  expandedCnscapacita.value = row.cnscapacita;
  loadAsistentes(row.cnscapacita);
}

function onSearchCap() {
  pagCap.value.page = 1;
  expandedCnscapacita.value = null;
  loadCapacitaciones();
}

function onCapRequest(req) {
  pagCap.value.page = req.pagination.page;
  pagCap.value.rowsPerPage = req.pagination.rowsPerPage;
  loadCapacitaciones();
}

async function copyRegistroLinkForCap(row) {
  if (!row?.cliente) {
    $q.notify({ type: 'warning', message: 'Asigne un cliente a la capacitación' });
    return;
  }
  copyingRegistroCapId.value = row.cnscapacita;
  try {
    const { data } = await api.get(
      `/capacitaciones/${encodeURIComponent(row.cnscapacita)}/registro-link`,
    );
    if (!data.url) throw new Error('No se obtuvo el enlace');
    await navigator.clipboard.writeText(data.url);
    $q.notify({ type: 'positive', message: 'Enlace de registro copiado al portapapeles' });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || err.message || 'No se pudo copiar el enlace',
    });
  } finally {
    copyingRegistroCapId.value = '';
  }
}

function openCapCreate() {
  capCurrent.value = {};
  capIsEdit.value = false;
  formCapOpen.value = true;
}

function openCapEdit(row) {
  if (!isCapAbierta(row)) {
    $q.notify({ type: 'warning', message: 'No se puede editar una capacitación cerrada o anulada' });
    return;
  }
  capCurrent.value = { ...row };
  capIsEdit.value = true;
  formCapOpen.value = true;
}

async function openEstadoDialog(row) {
  estadoCapRow.value = row;
  estadoOpciones.value = null;
  estadoDialogOpen.value = true;
  loadingEstadoOpciones.value = true;
  try {
    await loadAsistentes(row.cnscapacita, true);
    estadoOpciones.value = await capacitacionesApi.estadoOpciones(row.cnscapacita);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo validar el cambio de estado',
    });
    estadoDialogOpen.value = false;
  } finally {
    loadingEstadoOpciones.value = false;
  }
}

async function aplicarEstado(estado) {
  if (!estadoCapRow.value) return;
  const label = estado === 'Cerrada' ? 'cerrar' : 'anular';
  $q.dialog({
    title: 'Confirmar',
    message: `¿Desea ${label} esta capacitación?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    changingEstado.value = true;
    pendingEstado.value = estado;
    try {
      const updated = await capacitacionesApi.cambiarEstado(estadoCapRow.value.cnscapacita, estado);
      const idx = capRows.value.findIndex((r) => r.cnscapacita === updated.cnscapacita);
      if (idx >= 0) capRows.value[idx] = { ...capRows.value[idx], ...updated };
      estadoCapRow.value = { ...estadoCapRow.value, ...updated };
      estadoDialogOpen.value = false;
      $q.notify({ type: 'positive', message: `Capacitación ${estado.toLowerCase()}` });
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.error || 'No se pudo cambiar el estado',
      });
    } finally {
      changingEstado.value = false;
      pendingEstado.value = '';
    }
  });
}

function onCapSaved() {
  formCapOpen.value = false;
  loadCapacitaciones();
}

function nextAsisItem(cnscapacita) {
  const rows = getAsisRows(cnscapacita);
  if (!rows.length) return 1;
  return Math.max(...rows.map((r) => Number(r.item) || 0)) + 1;
}

function openAsisCreate(cap) {
  if (!isCapAbierta(cap)) {
    $q.notify({ type: 'warning', message: 'La capacitación no está abierta' });
    return;
  }
  if (!cap?.cliente) {
    $q.notify({ type: 'warning', message: 'La capacitación debe tener un cliente asignado' });
    return;
  }
  asisCapCtx.value = cap;
  asisCurrent.value = {
    cnscapacita: cap.cnscapacita,
    item: nextAsisItem(cap.cnscapacita),
  };
  asisIsEdit.value = false;
  formAsisOpen.value = true;
}

function openAsisEdit(row) {
  const cap = capRows.value.find((r) => r.cnscapacita === row.cnscapacita);
  asisCapCtx.value = { cnscapacita: row.cnscapacita, cliente: cap?.cliente };
  asisCurrent.value = { ...row };
  asisIsEdit.value = true;
  formAsisOpen.value = true;
}

function confirmAsisDelete(row) {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Eliminar este asistente?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await asisApi.remove(asisRowKey(row));
      $q.notify({ type: 'positive', message: 'Asistente eliminado' });
      await loadAsistentes(row.cnscapacita, true);
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

function notifyEmailMeta(meta) {
  if (!meta) return;
  if (meta.sent) {
    $q.notify({
      type: 'positive',
      icon: 'mail',
      message: `Correo de firma enviado a ${meta.email}`,
    });
    return;
  }
  const messages = {
    sin_email: 'Asistente guardado, pero el funcionario no tiene email en Clientes → Funcionarios',
    smtp_no_configurado: 'Asistente guardado, pero el correo no está configurado en el servidor',
  };
  $q.notify({
    type: 'warning',
    icon: 'mail',
    message: messages[meta.reason] || meta.message || 'No se envió el correo de firma',
  });
}

function showEmailResultDialog(data) {
  const lines = (data.details || []).map((d) => {
    if (d.ok) return `✓ ${d.nombres} → ${d.email}`;
    return `✗ ${d.nombres}: ${d.message || d.reason}`;
  });
  const message =
    lines.length > 0
      ? lines.join('\n')
      : data.sent === 0 && data.skipped === 0
        ? 'No hay asistentes pendientes de firma.'
        : 'Sin detalle de envío.';

  $q.dialog({
    title: 'Resultado del envío de correos',
    message: `Enviados: ${data.sent} · Omitidos: ${data.skipped}\n\n${message}`,
    ok: { label: 'Cerrar', flat: true },
  });
}

function onAsisSaved(saved) {
  formAsisOpen.value = false;
  if (saved?._meta) notifyEmailMeta(saved._meta);
  const cnscapacita = asisCapCtx.value?.cnscapacita || asisCurrent.value.cnscapacita;
  if (cnscapacita) loadAsistentes(cnscapacita, true);
}

function openFirma(row) {
  firmaAsistente.value = { ...row };
  firmaOpen.value = true;
}

async function onFirmaSave(dataUrl) {
  if (!firmaAsistente.value) return;
  try {
    await asisApi.update(asisRowKey(firmaAsistente.value), { firma: dataUrl });
    $q.notify({ type: 'positive', message: 'Firma guardada' });
    const cnscapacita = firmaAsistente.value.cnscapacita;
    firmaOpen.value = false;
    firmaAsistente.value = null;
    await loadAsistentes(cnscapacita, true);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Error al guardar la firma',
    });
  }
}

async function enviarFirma(row) {
  const id = asisRowKey(row);
  sendingFirmaId.value = id;
  try {
    const { data } = await api.post(`/asistentes/${encodeURIComponent(id)}/enviar-firma`);
    $q.notify({
      type: 'positive',
      message: `Enlace enviado a ${data.email}`,
    });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo enviar el correo',
    });
  } finally {
    sendingFirmaId.value = '';
  }
}

async function enviarFirmasPendientes(cap) {
  if (!cap?.cnscapacita) return;
  sendingFirmasCapId.value = cap.cnscapacita;
  try {
    const { data } = await api.post(
      `/capacitaciones/${encodeURIComponent(cap.cnscapacita)}/enviar-firmas`,
    );
    showEmailResultDialog(data);
    if (data.sent > 0) {
      $q.notify({ type: 'positive', icon: 'mail', message: `${data.sent} correo(s) enviado(s)` });
    } else if (mailConfigured.value === false) {
      $q.notify({
        type: 'warning',
        message: 'Correo no configurado en el servidor',
      });
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Error al enviar correos',
    });
  } finally {
    sendingFirmasCapId.value = '';
  }
}

async function printCap(row) {
  try {
    const res = await api.get(`/capacitaciones/${encodeURIComponent(row.cnscapacita)}/pdf`, {
      responseType: 'blob',
    });
    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.error || 'Error al generar el PDF');
    }
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const tema = (row.tema || row.cnscapacita || 'capacitacion').replace(/[<>:"/\\|?*]/g, '').trim();
    pdfDocumentName.value = `CAPACITACION_${tema}.pdf`;
    pdfDocument.value = blob;
    setTimeout(() => pdfRef.value?.mostrarPDF(), 150);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || err.response?.data?.error || 'Error al generar el PDF',
    });
  }
}

async function loadMailStatus() {
  try {
    const { data } = await api.get('/health');
    mailConfigured.value = Boolean(data.mailConfigured);
  } catch {
    mailConfigured.value = null;
  }
}

function openNotifyCap(row) {
  if (!row.cliente) return;
  if (row.estado !== 'Cerrada') {
    $q.notify({ type: 'warning', message: 'Solo se puede notificar una capacitación cerrada' });
    return;
  }
  notifyCapId.value = row.cnscapacita;
  notifyCliente.value = row.cliente;
  notifyOpen.value = true;
}

async function onNotifySend(payload) {
  if (!notifyCapId.value) return;
  sendingNotify.value = true;
  try {
    const data = await notificacionApi.capacitacion(notifyCapId.value, payload);
    notifyOpen.value = false;
    if (data.sent > 0) {
      const pdfNote = data.pdfAttached ? ' con PDF adjunto' : '';
      $q.notify({
        type: 'positive',
        icon: 'mail',
        message: `Correo enviado${pdfNote}`,
      });
    } else {
      $q.notify({ type: 'warning', message: data.error || 'No se envió ningún correo' });
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Error al enviar la notificación',
    });
  } finally {
    sendingNotify.value = false;
  }
}

onMounted(() => {
  loadCapacitaciones();
  loadMailStatus();
});
</script>

<style scoped lang="scss">
.capacitaciones-page {
  padding: 16px 20px;
  max-width: 1280px;
  margin: 0 auto;
}

.cap-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #00897b 0%, #00695c 55%, #004d40 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(0, 105, 92, 0.22);
}

.cap-hero__main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cap-hero__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.cap-hero__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.cap-hero__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
}

.cap-hero__subtitle {
  margin: 4px 0 0;
  font-size: 0.78rem;
  opacity: 0.88;
}

.cap-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cap-hero__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.75rem;
  white-space: nowrap;

  strong {
    font-weight: 700;
  }

  &--active {
    background: rgba(255, 255, 255, 0.22);
  }
}

.cap-alert {
  border: 1px solid #ffcc80;
  border-radius: 10px;
}

.cap-panel {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.cap-panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  &--compact {
    justify-content: flex-end;
  }
}

.cap-panel__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}

.cap-panel__desc {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: #64748b;
}

.cap-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cap-search {
  min-width: 220px;
}

.cap-btn {
  border-radius: 8px;
  font-weight: 500;
}

.cap-table {
  border-radius: 8px;
  overflow: hidden;

  :deep(thead tr:first-child th) {
    background: #f8fafc;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #64748b;
  }

  :deep(tbody td) {
    font-size: 0.85rem;
    color: #334155;
  }
}

.cap-table__expand-cell {
  width: 40px;
  padding-right: 0 !important;
}

.cap-table__actions-cell {
  width: 52px;
  padding-right: 4px !important;
}

.cap-table__row {
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #f1f5f9;
  }

  &--expanded {
    background: #e0f2f1 !important;

    td {
      font-weight: 500;
      color: #004d40;
      border-bottom: none;
    }
  }
}

.cap-table__expand-row {
  background: #f8fafc;

  > td {
    padding: 0 !important;
    border-top: none !important;
  }
}

.asistentes-expand {
  position: relative;
  margin: 0 12px 12px 48px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #b2dfdb;
  background: linear-gradient(180deg, #fafffe 0%, #ffffff 40%);
}

.asistentes-expand__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.asistentes-expand__title {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: #00695c;
}

.asistentes-expand__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.asistentes-expand__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #fff;
  font-size: 0.82rem;
  color: #94a3b8;
}

.asistentes-table {
  border-radius: 8px;
  overflow: hidden;
  background: #fff;

  :deep(thead tr:first-child th) {
    background: #e0f2f1;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #00695c;
  }
}

.cap-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
}

.cap-badge {
  font-size: 0.7rem;
  padding: 3px 8px;
}

.cap-firma-dialog {
  min-width: 520px;
  max-width: 95vw;
  border-radius: 12px;
  overflow: hidden;
}

.cap-firma-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #00897b 0%, #00695c 100%);
  color: #fff;
}

.cap-firma-dialog__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.cap-firma-dialog__title {
  font-size: 1rem;
  font-weight: 700;
}

.cap-firma-dialog__person {
  font-size: 0.9rem;
}

.cap-estado-dialog {
  min-width: 400px;
  max-width: 95vw;
  border-radius: 12px;
  overflow: hidden;
}

.cap-estado-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #00897b 0%, #00695c 100%);
  color: #fff;
}

.cap-estado-dialog__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.cap-estado-dialog__title {
  font-size: 1rem;
  font-weight: 700;
}

.cap-estado-dialog__hint {
  margin: 4px 0 0;
  font-size: 0.76rem;
  color: #64748b;
}

@media (max-width: 599px) {
  .capacitaciones-page {
    padding: 12px;
  }

  .cap-hero {
    padding: 12px 14px;
  }

  .cap-panel {
    padding: 12px;
  }

  .cap-search {
    width: 100%;
    min-width: 0;
  }

  .cap-panel__actions {
    width: 100%;
  }

  .asistentes-expand {
    margin-left: 8px;
    margin-right: 4px;
  }

  .asistentes-expand__actions {
    width: 100%;
  }
}
</style>
