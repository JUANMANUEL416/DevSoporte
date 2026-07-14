<template>
  <q-page class="cronograma-page">
    <section class="crono-hero">
      <div class="crono-hero__main">
        <div class="crono-hero__icon">
          <q-icon name="event_note" size="22px" />
        </div>
        <div>
          <p class="crono-hero__eyebrow">Soporte</p>
          <h1 class="crono-hero__title">Cronograma de capacitaciones</h1>
          <p class="crono-hero__subtitle">
            Planifique temas por cliente, controle cumplimiento y envíe PDFs al cliente.
          </p>
        </div>
      </div>
      <div class="crono-hero__meta">
        <span class="crono-hero__chip">
          <strong>{{ pagCrono.rowsNumber }}</strong>
          {{ pagCrono.rowsNumber === 1 ? 'cronograma' : 'cronogramas' }}
        </span>
        <span v-if="expandedCnscrono" class="crono-hero__chip crono-hero__chip--active">
          <q-icon name="list_alt" size="14px" />
          <strong>{{ currentItemRows.length }}</strong>
          {{ currentItemRows.length === 1 ? 'ítem' : 'ítems' }}
        </span>
      </div>
    </section>

    <q-banner v-if="mailConfigured === false" dense rounded class="crono-alert q-mb-md">
      <template #avatar><q-icon name="mail" color="orange" /></template>
      Correo no configurado en el servidor (SMTP). Configure <code>SMTP_HOST</code> y <code>SMTP_USER</code> en el
      backend para enviar notificaciones.
    </q-banner>

    <section class="crono-panel">
      <header class="crono-panel__header">
        <div class="crono-panel__filters">
          <q-input
            v-model="filtroFechaIni"
            label="Desde (fecha inicio)"
            type="date"
            dense
            outlined
            stack-label
            class="crono-filter-date"
            bg-color="white"
            @update:model-value="onFilterFechas"
          />
          <q-input
            v-model="filtroFechaFin"
            label="Hasta (fecha inicio)"
            type="date"
            dense
            outlined
            stack-label
            class="crono-filter-date"
            bg-color="white"
            :min="filtroFechaIni || undefined"
            @update:model-value="onFilterFechas"
          />
          <q-input
            v-model="searchCrono"
            dense
            outlined
            debounce="400"
            placeholder="Buscar cronograma..."
            class="crono-search"
            bg-color="white"
            @update:model-value="onSearchCrono"
          >
            <template #prepend><q-icon name="search" color="grey-6" /></template>
          </q-input>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nuevo cronograma"
            class="crono-btn"
            @click="openCronoCreate"
          />
        </div>
      </header>

      <q-table
        class="crono-table"
        :rows="cronoRows"
        :columns="cronoColumns"
        row-key="cnscrono"
        :loading="loadingCrono"
        v-model:pagination="pagCrono"
        :rows-per-page-options="[5, 10, 25]"
        flat
        bordered
        @request="onCronoRequest"
      >
        <template #body="props">
          <q-tr
            :props="props"
            class="crono-table__row"
            :class="{ 'crono-table__row--expanded': expandedCnscrono === props.row.cnscrono }"
            @click="toggleExpand(props.row)"
          >
            <q-td auto-width class="crono-table__expand-cell" @click.stop="toggleExpand(props.row)">
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="expandedCnscrono === props.row.cnscrono ? 'expand_less' : 'expand_more'"
                color="primary"
              />
            </q-td>
            <q-td auto-width class="crono-table__actions-cell" @click.stop>
              <div class="crono-actions">
                <q-btn
                  flat
                  dense
                  round
                  icon="content_copy"
                  color="secondary"
                  @click="confirmDuplicar(props.row)"
                >
                  <q-tooltip>Duplicar cronograma (refuerzo)</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  round
                  icon="edit"
                  color="primary"
                  :disable="!isCronoEditable(props.row)"
                  @click="openCronoEdit(props.row)"
                >
                  <q-tooltip>
                    {{ isCronoEditable(props.row) ? 'Editar encabezado' : 'Cronograma cerrado' }}
                  </q-tooltip>
                </q-btn>
              </div>
            </q-td>
            <q-td v-for="col in dataCols(props.cols)" :key="col.name" :props="props">
              <template v-if="col.name === 'estado'">
                <q-badge
                  :color="estadoCronoColor(props.row.estado)"
                  :label="props.row.estado || 'Borrador'"
                  class="crono-badge"
                />
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>

          <q-tr v-if="expandedCnscrono === props.row.cnscrono" class="crono-table__expand-row">
            <q-td :colspan="cronoColumns.length">
              <div class="items-expand">
                <header class="items-expand__header">
                  <div class="items-expand__actions">
                    <q-btn
                      v-if="isCronoEditable(props.row)"
                      unelevated
                      color="primary"
                      icon="library_add"
                      label="Agregar tema"
                      size="sm"
                      class="crono-btn"
                      @click="openAgregarTema(props.row)"
                    />
                    <q-btn
                      flat
                      color="secondary"
                      icon="picture_as_pdf"
                      label="PDF programación"
                      size="sm"
                      class="crono-btn"
                      :disable="!getItemRows(props.row.cnscrono).length"
                      @click="printPdf(props.row, 'programacion')"
                    />
                    <q-btn
                      flat
                      color="deep-orange"
                      icon="picture_as_pdf"
                      label="PDF seguimiento"
                      size="sm"
                      class="crono-btn"
                      :disable="!getItemRows(props.row.cnscrono).length"
                      @click="printPdf(props.row, 'seguimiento')"
                    />
                    <q-btn
                      flat
                      color="teal"
                      icon="forward_to_inbox"
                      label="Enviar correo"
                      size="sm"
                      class="crono-btn"
                      :disable="!props.row.cliente || !getItemRows(props.row.cnscrono).length"
                      @click="openNotifyCrono(props.row)"
                    />
                  </div>
                </header>

                <q-inner-loading :showing="isItemLoading(props.row.cnscrono)" />

                <template v-if="getTemaGroups(props.row.cnscrono).length">
                  <section
                    v-for="grupo in getTemaGroups(props.row.cnscrono)"
                    :key="temaGroupKey(props.row.cnscrono, grupo)"
                    class="tema-group"
                    :class="{ 'tema-group--collapsed': !isTemaExpanded(props.row.cnscrono, grupo) }"
                  >
                    <header
                      class="tema-group__header"
                      role="button"
                      tabindex="0"
                      @click="toggleTemaExpand(props.row.cnscrono, grupo)"
                      @keydown.enter.space.prevent="toggleTemaExpand(props.row.cnscrono, grupo)"
                    >
                      <q-btn
                        flat
                        dense
                        round
                        size="sm"
                        :icon="isTemaExpanded(props.row.cnscrono, grupo) ? 'expand_less' : 'expand_more'"
                        color="primary"
                        @click.stop="toggleTemaExpand(props.row.cnscrono, grupo)"
                      />
                      <q-icon name="menu_book" size="16px" class="q-mr-xs" />
                      <div class="tema-group__main">
                        <strong class="tema-group__title">{{ grupo.tema_nombre }}</strong>
                        <div class="tema-group__dirigidoa">
                          <span class="tema-group__dirigidoa-label">Dirigido a:</span>
                          <span class="tema-group__dirigidoa-text">{{ grupo.dirigidoa || '—' }}</span>
                          <q-btn
                            v-if="isCronoEditable(props.row)"
                            flat
                            dense
                            round
                            size="xs"
                            icon="edit"
                            color="primary"
                            @click.stop="openDirigidoaDialog(props.row.cnscrono, grupo)"
                          >
                            <q-tooltip>Editar dirigido a</q-tooltip>
                          </q-btn>
                        </div>
                        <div class="tema-group__programacion">
                          <span>
                            F. probable:
                            <strong>{{ grupo.fecha_probable ? fmtDateOnly(grupo.fecha_probable) : '—' }}</strong>
                          </span>
                          <span>
                            Hora:
                            <strong>{{ grupo.hora_sugerida || '—' }}</strong>
                          </span>
                          <q-btn
                            v-if="isCronoEditable(props.row)"
                            flat
                            dense
                            round
                            size="xs"
                            icon="edit_calendar"
                            color="primary"
                            @click.stop="openProgramacionDialog(props.row.cnscrono, grupo)"
                          >
                            <q-tooltip>Cambiar fecha y hora de asignación</q-tooltip>
                          </q-btn>
                        </div>
                      </div>
                      <div class="tema-group__actions">
                        <q-btn
                          v-if="isCronoEditable(props.row)"
                          flat
                          dense
                          round
                          size="sm"
                          icon="flag"
                          color="deep-orange"
                          @click.stop="openEstadoTemaDialog(props.row.cnscrono, grupo)"
                        >
                          <q-tooltip>Cambiar estado del tema</q-tooltip>
                        </q-btn>
                        <span class="tema-group__count">{{ grupo.items.length }} ítem(s)</span>
                      </div>
                    </header>
                    <q-table
                      v-show="isTemaExpanded(props.row.cnscrono, grupo)"
                      class="items-table"
                      :rows="grupo.items"
                      :columns="itemColumns"
                      :row-key="itemRowKey"
                      flat
                      bordered
                      dense
                      hide-pagination
                      :pagination="{ rowsPerPage: 0 }"
                    >
                      <template #body-cell-estado="cell">
                        <q-td :props="cell">
                          <q-badge
                            :color="estadoItemColor(cell.row.estado)"
                            :label="cell.row.estado || 'Programado'"
                            class="crono-badge"
                          />
                        </q-td>
                      </template>
                      <template #body-cell-acciones="cell">
                        <q-td :props="cell" class="items-table__actions-cell">
                          <div v-if="isCronoEditable(props.row)" class="crono-actions crono-actions--row">
                            <q-btn
                              flat
                              dense
                              round
                              icon="flag"
                              color="deep-orange"
                              @click="openEstadoItemDialog(cell.row)"
                            >
                              <q-tooltip>Cambiar estado</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="edit"
                              color="primary"
                              @click="openItemEdit(cell.row)"
                            >
                              <q-tooltip>Editar ítem</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="delete"
                              color="negative"
                              @click="confirmItemDelete(cell.row)"
                            >
                              <q-tooltip>Eliminar</q-tooltip>
                            </q-btn>
                          </div>
                          <span v-else class="text-grey-6 text-caption">—</span>
                        </q-td>
                      </template>
                    </q-table>
                  </section>
                </template>

                <div v-else-if="!isItemLoading(props.row.cnscrono)" class="items-expand__empty">
                  <q-icon name="event_busy" size="28px" color="grey-4" />
                  <span>Sin ítems programados. Use «Agregar tema» para traer un tema del catálogo.</span>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </section>

    <GenericForm
      v-model="formCronoOpen"
      :module="cronoModule"
      :record="cronoCurrent"
      :is-edit="cronoIsEdit"
      @saved="onCronoSaved"
    />

    <GenericForm
      v-model="formItemOpen"
      :module="itemModule"
      :record="itemCurrent"
      :is-edit="itemIsEdit"
      :context="itemFormContext"
      @saved="onItemSaved"
    />

    <PDFViewerComponent
      v-if="pdfDocument"
      ref="pdfRef"
      :document="pdfDocument"
      :document-name="pdfDocumentName"
      @close="pdfDocument = null"
    />

    <q-dialog v-model="agregarTemaOpen" persistent>
      <q-card style="min-width: 420px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Agregar tema completo</div>
          <div v-if="agregarTemaRow" class="text-caption text-grey q-mt-xs">
            Cronograma: <strong>{{ agregarTemaRow.cnscrono }}</strong>
            · {{ agregarTemaRow.nombrecliente || agregarTemaRow.cliente }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-md">
          <LookupSelect
            v-model="agregarTemaCodigo"
            resource="temas_capacitacion"
            value-field="codigo"
            label-field="nombre"
            label="Tema del catálogo"
            :extra-params="{ estado: 'A' }"
          />
          <q-input
            v-model="agregarTemaFecha"
            label="Fecha probable (opcional, aplica a todos los ítems)"
            type="date"
            outlined
            dense
            bg-color="white"
            :min="agregarTemaFechaMin"
            :max="agregarTemaFechaMax"
            :rules="agregarTemaFechaRules"
          />
          <q-input
            v-model="agregarTemaHora"
            label="Hora sugerida (opcional, HH:MM)"
            type="time"
            outlined
            dense
            bg-color="white"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Agregar"
            :loading="agregandoTema"
            :disable="!agregarTemaCodigo"
            @click="confirmAgregarTema"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="estadoItemOpen" persistent>
      <q-card class="crono-estado-dialog">
        <q-card-section class="crono-estado-dialog__header">
          <div>
            <p class="crono-estado-dialog__eyebrow">
              {{ estadoDialogMode === 'tema' ? 'Estado del tema' : 'Estado del ítem' }}
            </p>
            <div class="crono-estado-dialog__title">
              {{
                estadoDialogMode === 'tema'
                  ? estadoTemaGrupo?.tema_nombre
                  : estadoItemRow?.descripcion
              }}
            </div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="estadoDialogMode === 'item' && estadoItemRow">
          <p class="text-body2 q-mb-md">
            Estado actual:
            <q-badge
              :color="estadoItemColor(estadoItemRow.estado)"
              :label="estadoItemRow.estado || 'Programado'"
            />
          </p>

          <q-input
            v-model="estadoItemFechaReal"
            label="Fecha real (para Realizado)"
            type="date"
            outlined
            dense
            bg-color="white"
            class="q-mb-md"
          />

          <q-input
            v-model="estadoItemObservacion"
            label="Observación (requerida para No cumplido / Cancelado)"
            type="textarea"
            outlined
            dense
            bg-color="white"
            autogrow
            class="q-mb-md"
          />

          <div class="crono-estado-dialog__options">
            <q-btn
              unelevated
              color="positive"
              icon="check_circle"
              label="Marcar realizado"
              class="full-width q-mb-sm"
              :loading="changingEstadoItem && pendingEstadoItem === 'Realizado'"
              @click="aplicarEstadoItem('Realizado')"
            />
            <q-btn
              unelevated
              color="negative"
              icon="warning"
              label="No cumplido"
              class="full-width q-mb-sm"
              :loading="changingEstadoItem && pendingEstadoItem === 'No cumplido'"
              @click="aplicarEstadoItem('No cumplido')"
            />
            <q-btn
              unelevated
              color="grey-8"
              icon="cancel"
              label="Cancelado"
              class="full-width q-mb-sm"
              :loading="changingEstadoItem && pendingEstadoItem === 'Cancelado'"
              @click="aplicarEstadoItem('Cancelado')"
            />
            <q-btn
              flat
              color="primary"
              icon="schedule"
              label="Volver a programado"
              class="full-width"
              :loading="changingEstadoItem && pendingEstadoItem === 'Programado'"
              @click="aplicarEstadoItem('Programado')"
            />
          </div>
        </q-card-section>
        <q-card-section v-else-if="estadoDialogMode === 'tema' && estadoTemaGrupo">
          <p class="text-body2 q-mb-md">
            Se aplicará el nuevo estado a los
            <strong>{{ estadoTemaGrupo.items?.length || 0 }}</strong>
            ítem(s) de este tema.
          </p>

          <q-input
            v-model="estadoItemFechaReal"
            label="Fecha real (para Realizado)"
            type="date"
            outlined
            dense
            bg-color="white"
            class="q-mb-md"
          />

          <q-input
            v-model="estadoItemObservacion"
            label="Observación (requerida para No cumplido / Cancelado)"
            type="textarea"
            outlined
            dense
            bg-color="white"
            autogrow
            class="q-mb-md"
          />

          <div class="crono-estado-dialog__options">
            <q-btn
              unelevated
              color="positive"
              icon="check_circle"
              label="Marcar realizado"
              class="full-width q-mb-sm"
              :loading="changingEstadoItem && pendingEstadoItem === 'Realizado'"
              @click="aplicarEstadoItem('Realizado')"
            />
            <q-btn
              unelevated
              color="negative"
              icon="warning"
              label="No cumplido"
              class="full-width q-mb-sm"
              :loading="changingEstadoItem && pendingEstadoItem === 'No cumplido'"
              @click="aplicarEstadoItem('No cumplido')"
            />
            <q-btn
              unelevated
              color="grey-8"
              icon="cancel"
              label="Cancelado"
              class="full-width q-mb-sm"
              :loading="changingEstadoItem && pendingEstadoItem === 'Cancelado'"
              @click="aplicarEstadoItem('Cancelado')"
            />
            <q-btn
              flat
              color="primary"
              icon="schedule"
              label="Volver a programado"
              class="full-width"
              :loading="changingEstadoItem && pendingEstadoItem === 'Programado'"
              @click="aplicarEstadoItem('Programado')"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <NotifyRecipientDialog
      v-model="notifyOpen"
      :cliente-codigo="notifyCliente"
      :record-id="notifyCronoId"
      notify-type="cronograma"
      title="Enviar cronograma por correo"
      :sending="sendingNotify"
      @send="onNotifySend"
    />

    <q-dialog v-model="dirigidoaOpen" persistent>
      <q-card style="min-width: 420px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Dirigido a</div>
          <div v-if="dirigidoaTemaNombre" class="text-caption text-grey q-mt-xs">
            Tema: {{ dirigidoaTemaNombre }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="dirigidoaText"
            type="textarea"
            outlined
            dense
            autogrow
            bg-color="white"
            label="Personal requerido para la capacitación"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Guardar"
            :loading="savingDirigidoa"
            @click="saveDirigidoa"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="programacionOpen" persistent>
      <q-card style="min-width: 420px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Fecha y hora de asignación</div>
          <div v-if="programacionTemaNombre" class="text-caption text-grey q-mt-xs">
            Tema: {{ programacionTemaNombre }}
          </div>
          <div v-if="programacionFechaMin && programacionFechaMax" class="text-caption text-grey">
            Rango del cronograma: {{ programacionFechaMin }} — {{ programacionFechaMax }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-md">
          <q-input
            v-model="programacionFecha"
            label="Fecha probable"
            type="date"
            outlined
            dense
            bg-color="white"
            clearable
            :min="programacionFechaMin || undefined"
            :max="programacionFechaMax || undefined"
            :rules="programacionFechaRules"
          />
          <q-input
            v-model="programacionHora"
            label="Hora sugerida"
            type="time"
            outlined
            dense
            bg-color="white"
            clearable
          />
          <p class="text-caption text-grey-7">
            Se aplica a todos los ítems de este tema.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Guardar"
            :loading="savingProgramacion"
            @click="saveProgramacion"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource, notificacionApi, cronogramaApi, extractApiError } from 'src/services/api';
import { api } from 'src/boot/axios';
import { findModule } from 'src/config/modules';
import GenericForm from 'components/GenericForm.vue';
import LookupSelect from 'components/LookupSelect.vue';
import PDFViewerComponent from 'components/PDFViewerComponent.vue';
import NotifyRecipientDialog from 'components/NotifyRecipientDialog.vue';

const $q = useQuasar();
const cronoApi = useResource('cronograma');
const itemApi = useResource('cronograma_items');

const mod = findModule('cronograma');
const cronoModule = computed(() => mod);
const itemModule = computed(() => ({
  resource: mod.detail.resource,
  title: 'Ítem del cronograma',
  formCols: mod.detail.formCols || 3,
  idField: mod.detail.idField,
  fields: [
    { name: 'cnscrono', label: 'Cronograma', type: 'text', hidden: true },
    ...mod.detail.fields,
  ],
}));

const cronoColumns = computed(() => [
  { name: 'expand', label: '', field: 'expand', align: 'left', style: 'width: 40px' },
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 72px; min-width: 72px' },
  ...mod.columns,
]);
const itemColumns = computed(() => [
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 120px' },
  ...mod.detail.columns.filter((c) => c.name !== 'tema_nombre'),
]);

const cronoRows = ref([]);
const itemCache = ref({});
const itemLoading = ref({});
const loadingCrono = ref(false);
const searchCrono = ref('');
const filtroFechaIni = ref('');
const filtroFechaFin = ref('');
const expandedCnscrono = ref(null);
const expandedTemas = ref({});
const pagCrono = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const formCronoOpen = ref(false);
const formItemOpen = ref(false);
const cronoIsEdit = ref(false);
const itemIsEdit = ref(false);
const cronoCurrent = ref({});
const itemCurrent = ref({});

const pdfDocument = ref(null);
const pdfDocumentName = ref('cronograma.pdf');
const pdfRef = ref(null);

const agregarTemaOpen = ref(false);
const agregarTemaRow = ref(null);
const agregarTemaCodigo = ref('');
const agregarTemaFecha = ref('');
const agregarTemaHora = ref('');
const agregandoTema = ref(false);
const duplicando = ref(false);

const estadoItemOpen = ref(false);
const estadoDialogMode = ref('item');
const estadoItemRow = ref(null);
const estadoTemaGrupo = ref(null);
const estadoTemaCnscrono = ref('');
const estadoItemFechaReal = ref('');
const estadoItemObservacion = ref('');
const pendingEstadoItem = ref('');
const changingEstadoItem = ref(false);

const mailConfigured = ref(null);
const notifyOpen = ref(false);
const notifyCliente = ref('');
const notifyCronoId = ref('');
const sendingNotify = ref(false);

const dirigidoaOpen = ref(false);
const dirigidoaCnscrono = ref('');
const dirigidoaTemaNombre = ref('');
const dirigidoaItemRef = ref(null);
const dirigidoaText = ref('');
const savingDirigidoa = ref(false);

const programacionOpen = ref(false);
const programacionCnscrono = ref('');
const programacionTemaNombre = ref('');
const programacionItemRef = ref(null);
const programacionFecha = ref('');
const programacionHora = ref('');
const programacionFechaMin = ref('');
const programacionFechaMax = ref('');
const savingProgramacion = ref(false);

const currentItemRows = computed(() =>
  expandedCnscrono.value ? getItemRows(expandedCnscrono.value) : [],
);

function toDateKey(value) {
  if (!value) return '';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDateOnly(value) {
  const key = toDateKey(value);
  if (!key) return '';
  const [y, m, day] = key.split('-');
  return `${day}/${m}/${y}`;
}

function findCronoRow(cnscrono) {
  return cronoRows.value.find((r) => r.cnscrono === cnscrono) || null;
}

const itemFormContext = computed(() => {
  const cnscrono = itemCurrent.value.cnscrono || expandedCnscrono.value;
  const row = cnscrono ? findCronoRow(cnscrono) : null;
  if (!row?.fecha_inicial || !row?.fecha_final) return {};
  return {
    fecha_inicial: toDateKey(row.fecha_inicial),
    fecha_final: toDateKey(row.fecha_final),
  };
});

const agregarTemaFechaMin = computed(() =>
  agregarTemaRow.value?.fecha_inicial ? toDateKey(agregarTemaRow.value.fecha_inicial) : undefined,
);

const agregarTemaFechaMax = computed(() =>
  agregarTemaRow.value?.fecha_final ? toDateKey(agregarTemaRow.value.fecha_final) : undefined,
);

const programacionFechaRules = computed(() => {
  const min = programacionFechaMin.value;
  const max = programacionFechaMax.value;
  if (!min || !max) return [];
  return [
    (v) => !v || (v >= min && v <= max) || `Debe estar entre ${min} y ${max}`,
  ];
});

const agregarTemaFechaRules = computed(() => {
  const min = agregarTemaFechaMin.value;
  const max = agregarTemaFechaMax.value;
  if (!min || !max) return [];
  return [(v) => !v || (v >= min && v <= max) || `Debe estar entre ${min} y ${max}`];
});

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    ini: `${y}-${m}-01`,
    fin: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
  };
}

function initFiltroFechas() {
  const { ini, fin } = currentMonthRange();
  filtroFechaIni.value = ini;
  filtroFechaFin.value = fin;
}

function dataCols(cols) {
  return cols.filter((c) => c.name !== 'acciones' && c.name !== 'expand');
}

function itemRowKey(row) {
  return `${row.cnscrono}~${row.item}`;
}

function isCronoEditable(row) {
  return (row?.estado || 'Borrador') !== 'Cerrado';
}

function estadoCronoColor(estado) {
  const map = { Borrador: 'grey-6', Programado: 'primary', Cerrado: 'positive' };
  return map[estado] || 'grey';
}

function estadoItemColor(estado) {
  const map = {
    Programado: 'primary',
    Realizado: 'positive',
    'No cumplido': 'deep-orange',
    Cancelado: 'grey-7',
  };
  return map[estado] || 'grey';
}

function getItemRows(cnscrono) {
  return itemCache.value[cnscrono]?.rows || [];
}

function isItemLoading(cnscrono) {
  return !!itemLoading.value[cnscrono];
}

function parseProbableDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function temaFechaProbableSortKey(items) {
  const stamps = items.map((i) => parseProbableDate(i.fecha_probable)).filter((d) => d != null);
  if (!stamps.length) return Number.MAX_SAFE_INTEGER;
  return Math.min(...stamps);
}

function temaGroupKey(cnscrono, grupo) {
  return `${cnscrono}:${grupo.tema_codigo || grupo.tema_nombre || '_'}`;
}

function isTemaExpanded(cnscrono, grupo) {
  return expandedTemas.value[temaGroupKey(cnscrono, grupo)] !== false;
}

function toggleTemaExpand(cnscrono, grupo) {
  const key = temaGroupKey(cnscrono, grupo);
  expandedTemas.value = {
    ...expandedTemas.value,
    [key]: !isTemaExpanded(cnscrono, grupo),
  };
}

function groupByTema(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.tema_codigo || row.tema_nombre || '_';
    if (!map.has(key)) {
      map.set(key, {
        tema_codigo: row.tema_codigo,
        tema_nombre: row.tema_nombre || 'Sin tema',
        items: [],
      });
    }
    map.get(key).items.push(row);
  }
  return Array.from(map.values())
    .map((g) => ({
      ...g,
      dirigidoa: g.items[0]?.dirigidoa || '',
      fecha_probable: g.items.find((i) => i.fecha_probable)?.fecha_probable || '',
      hora_sugerida: g.items.find((i) => i.hora_sugerida)?.hora_sugerida || '',
      items: g.items.sort((a, b) => (Number(a.item) || 0) - (Number(b.item) || 0)),
    }))
    .sort((a, b) => {
      const diff = temaFechaProbableSortKey(a.items) - temaFechaProbableSortKey(b.items);
      if (diff !== 0) return diff;
      return (a.tema_codigo || a.tema_nombre || '').localeCompare(
        b.tema_codigo || b.tema_nombre || '',
        'es',
      );
    });
}

function getTemaGroups(cnscrono) {
  return groupByTema(getItemRows(cnscrono));
}

async function loadCronogramas() {
  loadingCrono.value = true;
  try {
    const params = {
      q: searchCrono.value,
      page: pagCrono.value.page,
      limit: pagCrono.value.rowsPerPage,
    };
    if (filtroFechaIni.value) params.fechaini = filtroFechaIni.value;
    if (filtroFechaFin.value) params.fechafin = filtroFechaFin.value;
    const res = await cronoApi.list(params);
    cronoRows.value = res.data;
    pagCrono.value.rowsNumber = res.total;

    if (expandedCnscrono.value && !res.data.some((r) => r.cnscrono === expandedCnscrono.value)) {
      expandedCnscrono.value = null;
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar cronogramas' });
  } finally {
    loadingCrono.value = false;
  }
}

async function loadItems(cnscrono, force = false) {
  if (!force && itemCache.value[cnscrono]) return;

  itemLoading.value = { ...itemLoading.value, [cnscrono]: true };
  try {
    const res = await itemApi.list({ cnscrono, limit: 500 });
    itemCache.value = {
      ...itemCache.value,
      [cnscrono]: { rows: res.data },
    };
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar ítems' });
  } finally {
    itemLoading.value = { ...itemLoading.value, [cnscrono]: false };
  }
}

function toggleExpand(row) {
  if (expandedCnscrono.value === row.cnscrono) {
    expandedCnscrono.value = null;
    return;
  }
  expandedCnscrono.value = row.cnscrono;
  loadItems(row.cnscrono);
}

function onSearchCrono() {
  pagCrono.value.page = 1;
  expandedCnscrono.value = null;
  loadCronogramas();
}

function onFilterFechas() {
  if (filtroFechaIni.value && filtroFechaFin.value && filtroFechaFin.value < filtroFechaIni.value) {
    filtroFechaFin.value = filtroFechaIni.value;
  }
  pagCrono.value.page = 1;
  expandedCnscrono.value = null;
  loadCronogramas();
}

function onCronoRequest(req) {
  pagCrono.value.page = req.pagination.page;
  pagCrono.value.rowsPerPage = req.pagination.rowsPerPage;
  loadCronogramas();
}

function openCronoCreate() {
  cronoCurrent.value = {};
  cronoIsEdit.value = false;
  formCronoOpen.value = true;
}

function openCronoEdit(row) {
  if (!isCronoEditable(row)) {
    $q.notify({ type: 'warning', message: 'El cronograma está cerrado' });
    return;
  }
  cronoCurrent.value = { ...row };
  cronoIsEdit.value = true;
  formCronoOpen.value = true;
}

function onCronoSaved() {
  formCronoOpen.value = false;
  loadCronogramas();
}

function openAgregarTema(row) {
  agregarTemaRow.value = row;
  agregarTemaCodigo.value = '';
  agregarTemaFecha.value = '';
  agregarTemaHora.value = '';
  agregarTemaOpen.value = true;
}

function confirmDuplicar(row) {
  $q.dialog({
    title: 'Duplicar cronograma',
    message: `Se creará una copia en Borrador del cronograma ${row.cnscrono} con los mismos temas (refuerzo).`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    duplicando.value = true;
    try {
      const result = await cronogramaApi.duplicar(row.cnscrono);
      $q.notify({ type: 'positive', message: `Cronograma duplicado: ${result.cnscrono}` });
      await loadCronogramas();
      expandedCnscrono.value = result.cnscrono;
      await loadItems(result.cnscrono, true);
    } catch (err) {
      $q.notify({ type: 'negative', message: extractApiError(err) });
    } finally {
      duplicando.value = false;
    }
  });
}

async function confirmAgregarTema() {
  if (!agregarTemaRow.value?.cnscrono || !agregarTemaCodigo.value) return;
  if (agregarTemaFecha.value) {
    const min = agregarTemaFechaMin.value;
    const max = agregarTemaFechaMax.value;
    if (min && max && (agregarTemaFecha.value < min || agregarTemaFecha.value > max)) {
      $q.notify({
        type: 'warning',
        message: `La fecha probable debe estar entre ${min} y ${max}`,
      });
      return;
    }
  }
  agregandoTema.value = true;
  try {
    const payload = { tema_codigo: agregarTemaCodigo.value };
    if (agregarTemaFecha.value) payload.fecha_probable = agregarTemaFecha.value;
    if (agregarTemaHora.value) payload.hora_sugerida = agregarTemaHora.value;
    const result = await cronogramaApi.agregarTema(agregarTemaRow.value.cnscrono, payload);
    agregarTemaOpen.value = false;
    $q.notify({
      type: 'positive',
      message: `Tema «${result.tema}» agregado (${result.count} ítem(s))`,
    });
    await loadItems(agregarTemaRow.value.cnscrono, true);
    await loadCronogramas();
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo agregar el tema',
    });
  } finally {
    agregandoTema.value = false;
  }
}

function openItemEdit(row) {
  itemCurrent.value = { ...row };
  itemIsEdit.value = true;
  formItemOpen.value = true;
}

function openDirigidoaDialog(cnscrono, grupo) {
  const refItem = grupo.items[0];
  if (!refItem) return;
  dirigidoaCnscrono.value = cnscrono;
  dirigidoaTemaNombre.value = grupo.tema_nombre || '';
  dirigidoaItemRef.value = { ...refItem };
  dirigidoaText.value = grupo.dirigidoa || refItem.dirigidoa || '';
  dirigidoaOpen.value = true;
}

async function saveDirigidoa() {
  if (!dirigidoaItemRef.value) return;
  savingDirigidoa.value = true;
  try {
    await itemApi.update(itemRowKey(dirigidoaItemRef.value), {
      ...dirigidoaItemRef.value,
      dirigidoa: dirigidoaText.value.trim(),
    });
    dirigidoaOpen.value = false;
    $q.notify({ type: 'positive', message: 'Dirigido a actualizado' });
    await loadItems(dirigidoaCnscrono.value, true);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo guardar',
    });
  } finally {
    savingDirigidoa.value = false;
  }
}

function openProgramacionDialog(cnscrono, grupo) {
  const refItem = grupo.items[0];
  if (!refItem) return;
  const crono = findCronoRow(cnscrono);
  programacionCnscrono.value = cnscrono;
  programacionTemaNombre.value = grupo.tema_nombre || '';
  programacionItemRef.value = { ...refItem };
  programacionFecha.value = toDateKey(grupo.fecha_probable || refItem.fecha_probable) || '';
  programacionHora.value = String(grupo.hora_sugerida || refItem.hora_sugerida || '').slice(0, 5);
  programacionFechaMin.value = crono?.fecha_inicial ? toDateKey(crono.fecha_inicial) : '';
  programacionFechaMax.value = crono?.fecha_final ? toDateKey(crono.fecha_final) : '';
  programacionOpen.value = true;
}

async function saveProgramacion() {
  if (!programacionItemRef.value) return;
  const fecha = String(programacionFecha.value || '').trim();
  const min = programacionFechaMin.value;
  const max = programacionFechaMax.value;
  if (fecha && min && max && (fecha < min || fecha > max)) {
    $q.notify({
      type: 'warning',
      message: `La fecha probable debe estar entre ${min} y ${max}`,
    });
    return;
  }
  savingProgramacion.value = true;
  try {
    await itemApi.update(itemRowKey(programacionItemRef.value), {
      ...programacionItemRef.value,
      fecha_probable: fecha || null,
      hora_sugerida: String(programacionHora.value || '').trim() || null,
    });
    programacionOpen.value = false;
    $q.notify({ type: 'positive', message: 'Fecha y hora de asignación actualizadas' });
    await loadItems(programacionCnscrono.value, true);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo guardar',
    });
  } finally {
    savingProgramacion.value = false;
  }
}

function confirmItemDelete(row) {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Eliminar este ítem del cronograma?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await itemApi.remove(itemRowKey(row));
      $q.notify({ type: 'positive', message: 'Ítem eliminado' });
      await loadItems(row.cnscrono, true);
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

function onItemSaved() {
  formItemOpen.value = false;
  const cnscrono = itemCurrent.value.cnscrono || expandedCnscrono.value;
  if (cnscrono) loadItems(cnscrono, true);
}

function openEstadoItemDialog(row) {
  estadoDialogMode.value = 'item';
  estadoTemaGrupo.value = null;
  estadoTemaCnscrono.value = '';
  estadoItemRow.value = { ...row };
  estadoItemFechaReal.value = row.fecha_real || new Date().toISOString().slice(0, 10);
  estadoItemObservacion.value = row.observacion || '';
  pendingEstadoItem.value = '';
  estadoItemOpen.value = true;
}

function openEstadoTemaDialog(cnscrono, grupo) {
  estadoDialogMode.value = 'tema';
  estadoItemRow.value = null;
  estadoTemaGrupo.value = { ...grupo };
  estadoTemaCnscrono.value = cnscrono;
  estadoItemFechaReal.value = new Date().toISOString().slice(0, 10);
  estadoItemObservacion.value = '';
  pendingEstadoItem.value = '';
  estadoItemOpen.value = true;
}

async function aplicarEstadoItem(estado) {
  if (estadoDialogMode.value === 'tema') {
    if (!estadoTemaGrupo.value || !estadoTemaCnscrono.value) return;
  } else if (!estadoItemRow.value) {
    return;
  }

  if (estado === 'No cumplido' || estado === 'Cancelado') {
    if (!String(estadoItemObservacion.value || '').trim()) {
      $q.notify({ type: 'warning', message: 'Indique la observación o motivo' });
      return;
    }
  }
  changingEstadoItem.value = true;
  pendingEstadoItem.value = estado;
  try {
    const payload = { estado };
    if (estado === 'Realizado') {
      payload.fecha_real = estadoItemFechaReal.value || new Date().toISOString().slice(0, 10);
    }
    if (estado === 'No cumplido' || estado === 'Cancelado') {
      payload.observacion = estadoItemObservacion.value.trim();
    }

    let cnscrono;
    if (estadoDialogMode.value === 'tema') {
      const grupo = estadoTemaGrupo.value;
      cnscrono = estadoTemaCnscrono.value;
      const temaPayload = {
        ...payload,
        tema_codigo: grupo.tema_codigo || undefined,
        tema_nombre: grupo.tema_codigo ? undefined : grupo.tema_nombre,
      };
      const result = await cronogramaApi.cambiarEstadoTema(cnscrono, temaPayload);
      estadoItemOpen.value = false;
      $q.notify({
        type: 'positive',
        message: `Estado del tema actualizado (${result.count} ítem(s)): ${estado}`,
      });
    } else {
      cnscrono = estadoItemRow.value.cnscrono;
      await cronogramaApi.cambiarEstadoItem(cnscrono, estadoItemRow.value.item, payload);
      estadoItemOpen.value = false;
      $q.notify({ type: 'positive', message: `Estado actualizado: ${estado}` });
    }

    await loadItems(cnscrono, true);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo cambiar el estado',
    });
  } finally {
    changingEstadoItem.value = false;
    pendingEstadoItem.value = '';
  }
}

async function printPdf(row, tipo) {
  try {
    const res = await cronogramaApi.pdf(row.cnscrono, tipo);
    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.error || 'Error al generar el PDF');
    }
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const suffix = tipo === 'seguimiento' ? 'SEGUIMIENTO' : 'PROGRAMACION';
    pdfDocumentName.value = `CRONOGRAMA_${row.cnscrono}_${suffix}.pdf`;
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

function openNotifyCrono(row) {
  if (!row.cliente) {
    $q.notify({ type: 'warning', message: 'Asigne un cliente al cronograma' });
    return;
  }
  if (!getItemRows(row.cnscrono).length) {
    $q.notify({ type: 'warning', message: 'El cronograma no tiene ítems' });
    return;
  }
  notifyCronoId.value = row.cnscrono;
  notifyCliente.value = row.cliente;
  notifyOpen.value = true;
}

async function onNotifySend(payload) {
  if (!notifyCronoId.value) return;
  sendingNotify.value = true;
  try {
    const data = await notificacionApi.cronograma(notifyCronoId.value, payload);
    notifyOpen.value = false;
    if (data.sent > 0) {
      const extra = (data.pdfCount || 0) > 1 ? ` con ${data.pdfCount} PDF adjuntos` : data.pdfAttached ? ' con PDF adjunto' : '';
      $q.notify({
        type: 'positive',
        icon: 'mail',
        message: `Correo enviado${extra}`,
      });
    } else {
      $q.notify({ type: 'warning', message: data.error || 'No se envió ningún correo' });
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: extractApiError(err, 'Error al enviar la notificación'),
    });
  } finally {
    sendingNotify.value = false;
  }
}

onMounted(() => {
  initFiltroFechas();
  loadCronogramas();
  loadMailStatus();
});
</script>

<style scoped lang="scss">
.cronograma-page {
  padding: 12px 12px 16px;
  max-width: none;
  width: 100%;
}

.crono-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 55%, #01579b 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(13, 71, 161, 0.22);
}

.crono-hero__main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.crono-hero__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.crono-hero__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.crono-hero__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
}

.crono-hero__subtitle {
  margin: 4px 0 0;
  font-size: 0.78rem;
  opacity: 0.88;
}

.crono-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.crono-hero__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.75rem;

  strong {
    font-weight: 700;
  }

  &--active {
    background: rgba(255, 255, 255, 0.22);
  }
}

.crono-alert {
  border: 1px solid #ffe0b2;
  background: #fff3e0;
  color: #e65100;
}

.crono-panel {
  padding: 10px 8px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.crono-panel__header {
  margin-bottom: 14px;
}

.crono-panel__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  justify-content: flex-start;
}

.crono-filter-date {
  width: 168px;
  min-width: 148px;
}

.crono-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.crono-search {
  min-width: 220px;
}

.crono-btn {
  border-radius: 8px;
  font-weight: 500;
}

.crono-table {
  border-radius: 8px;
  overflow: hidden;
  width: 100%;

  :deep(thead tr:first-child th) {
    background: #f8fafc;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #64748b;
    padding: 6px 8px;
  }

  :deep(tbody td) {
    padding: 4px 8px;
  }
}

.crono-table__expand-cell {
  width: 36px;
  min-width: 36px;
  padding: 2px 0 !important;
}

.crono-table__actions-cell {
  width: 72px;
  min-width: 72px;
  max-width: 72px;
  padding: 2px 4px !important;
  white-space: nowrap;
}

.crono-table__row {
  cursor: pointer;

  &:hover td {
    background: #f8fafc;
  }

  &--expanded {
    background: #e3f2fd !important;

    td {
      font-weight: 500;
      color: #0d47a1;
      border-bottom: none;
    }
  }
}

.crono-table__expand-row {
  background: #f8fafc;

  > td {
    padding: 0 4px 0 0 !important;
    border-top: none !important;
  }
}

.items-expand {
  position: relative;
  margin: 0 4px 10px 0;
  padding: 10px 10px 12px;
  border-radius: 10px;
  border: 1px solid #90caf9;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 40%);
}

.items-expand__header {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.items-expand__actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.items-expand__empty {
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

.tema-group {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }

  &--collapsed .tema-group__header {
    margin-bottom: 0;
  }
}

.tema-group__header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #e3f2fd;
  color: #0d47a1;
  font-size: 0.82rem;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: #bbdefb;
  }
}

.tema-group__main {
  flex: 1;
  min-width: 0;
}

.tema-group__dirigidoa {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #546e7a;
}

.tema-group__dirigidoa-label {
  flex-shrink: 0;
  font-weight: 600;
}

.tema-group__dirigidoa-text {
  flex: 1;
  min-width: 0;
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}

.tema-group__programacion {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #37474f;
}

.tema-group__title {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  font-weight: 600;
}

.tema-group__actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.tema-group__count {
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 500;
}

.items-table {
  border-radius: 8px;
  overflow: hidden;
  background: #fff;

  :deep(thead tr:first-child th) {
    background: #e3f2fd;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #1565c0;
  }
}

.crono-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0;
  white-space: nowrap;

  &--row {
    flex-wrap: nowrap;
    white-space: nowrap;
  }
}

.items-table__actions-cell {
  white-space: nowrap;
  width: 1%;
}

.crono-badge {
  font-size: 0.7rem;
  padding: 3px 8px;
}

.crono-estado-dialog {
  min-width: 420px;
  max-width: 95vw;
  border-radius: 12px;
  overflow: hidden;
}

.crono-estado-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
  color: #fff;
}

.crono-estado-dialog__eyebrow {
  margin: 0 0 4px;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.85;
}

.crono-estado-dialog__title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.crono-estado-dialog__options {
  display: flex;
  flex-direction: column;
}
</style>
