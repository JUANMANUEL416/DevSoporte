<template>
  <q-page class="plan-page">
    <section class="plan-hero">
      <div class="plan-hero__main">
        <div class="plan-hero__icon"><q-icon name="assignment" size="22px" /></div>
        <div>
          <p class="plan-hero__eyebrow">Soporte</p>
          <h1 class="plan-hero__title">Plan de trabajo</h1>
          <p class="plan-hero__subtitle">
            Plan de implantación por proyecto: seleccione procesos Qrystalos, ordene y estime tiempos.
          </p>
        </div>
      </div>
      <div class="plan-hero__meta">
        <span class="plan-hero__chip"><strong>{{ pagPlan.rowsNumber }}</strong> planes</span>
      </div>
    </section>

    <section class="plan-panel">
      <header class="plan-panel__header">
        <q-input v-model="filtroFechaIni" label="Desde" type="date" dense outlined stack-label
          class="plan-filter-date" bg-color="white" @update:model-value="onFilterFechas" />
        <q-input v-model="filtroFechaFin" label="Hasta" type="date" dense outlined stack-label
          class="plan-filter-date" bg-color="white" :min="filtroFechaIni || undefined"
          @update:model-value="onFilterFechas" />
        <q-input v-model="searchPlan" dense outlined debounce="400" placeholder="Buscar plan..."
          class="plan-search" bg-color="white" @update:model-value="onSearchPlan">
          <template #prepend><q-icon name="search" color="grey-6" /></template>
        </q-input>
        <q-btn unelevated color="primary" icon="add" label="Nuevo plan" @click="openPlanCreate" />
      </header>

      <q-table
        class="plan-table"
        :rows="planRows"
        :columns="planColumns"
        row-key="cnplan"
        :loading="loadingPlan"
        v-model:pagination="pagPlan"
        flat bordered
        @request="onPlanRequest"
      >
        <template #body="props">
          <q-tr
            :props="props"
            class="plan-table__row"
            :class="{ 'plan-table__row--expanded': expandedPlan === props.row.cnplan }"
            @click="toggleExpand(props.row)"
          >
            <q-td auto-width @click.stop="toggleExpand(props.row)">
              <q-btn flat dense round size="sm" color="primary"
                :icon="expandedPlan === props.row.cnplan ? 'expand_less' : 'expand_more'" />
            </q-td>
            <q-td auto-width @click.stop>
              <q-btn flat dense round icon="edit" color="primary"
                :disable="!isPlanEditable(props.row)" @click="openPlanEdit(props.row)" />
            </q-td>
            <q-td v-for="col in dataCols(props.cols)" :key="col.name" :props="props">
              <template v-if="col.name === 'estado'">
                <q-badge :color="estadoPlanColor(props.row.estado)" :label="props.row.estado || 'Borrador'" />
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>
          <q-tr v-if="expandedPlan === props.row.cnplan" class="plan-table__expand-row">
            <q-td :colspan="planColumns.length">
              <div class="items-expand">
                <header class="items-expand__header">
                  <div class="items-expand__actions">
                    <q-btn v-if="isPlanEditable(props.row)" unelevated dense color="primary" icon="folder"
                      label="+ Módulo" size="xs" class="plan-btn" @click="openAddModulo(props.row)">
                      <q-tooltip>Agregar desde módulo</q-tooltip>
                    </q-btn>
                    <q-btn v-if="isPlanEditable(props.row)" flat dense color="secondary" icon="hub"
                      label="+ Agrup." size="xs" class="plan-btn" @click="openAddGrupo(props.row)">
                      <q-tooltip>Agregar desde agrupador</q-tooltip>
                    </q-btn>
                    <q-btn v-if="isPlanEditable(props.row)" flat dense color="primary" icon="sort"
                      label="Módulo" size="xs" class="plan-btn" @click="reorganizarModulo(props.row)">
                      <q-tooltip>Ordenar por módulo</q-tooltip>
                    </q-btn>
                    <q-btn v-if="isPlanEditable(props.row)" flat dense color="secondary" icon="hub"
                      label="Agrup." size="xs" class="plan-btn" @click="reorganizarAgrupador(props.row)">
                      <q-tooltip>Ordenar por área (Inventario, Financiero…)</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canGenerarCronograma(props.row)" unelevated dense color="teal" icon="event_note"
                      label="Crono." size="xs" class="plan-btn" @click="generarCronograma(props.row)">
                      <q-tooltip>Generar cronograma</q-tooltip>
                    </q-btn>
                    <q-btn v-if="props.row.cnscrono" flat dense color="teal" icon="sync"
                      label="Sync" size="xs" class="plan-btn" @click="sincronizarCronograma(props.row)">
                      <q-tooltip>Sincronizar temas del cronograma con el plan</q-tooltip>
                    </q-btn>
                    <q-btn v-if="props.row.cnscrono" flat dense color="primary" icon="open_in_new"
                      label="Ver crono." size="xs" class="plan-btn"
                      :to="`/cronograma?cnscrono=${encodeURIComponent(props.row.cnscrono)}`" />
                    <q-btn flat dense color="secondary" icon="picture_as_pdf" label="PDF" size="xs" class="plan-btn"
                      :disable="!getItemRows(props.row.cnplan).length"
                      @click="printPdf(props.row)">
                      <q-tooltip>Ver PDF del plan</q-tooltip>
                    </q-btn>
                    <q-btn flat dense color="green-8" icon="download" label="Excel" size="xs" class="plan-btn"
                      :disable="!getItemRows(props.row.cnplan).length"
                      @click="downloadExcel(props.row)">
                      <q-tooltip>Descargar Excel de avance</q-tooltip>
                    </q-btn>
                    <q-btn flat dense color="green-8" icon="upload" label="Subir" size="xs" class="plan-btn"
                      :disable="!getItemRows(props.row.cnplan).length || !isPlanEditable(props.row)"
                      :loading="importingExcel === props.row.cnplan"
                      @click="triggerExcelImport(props.row)">
                      <q-tooltip>Subir avance desde Excel</q-tooltip>
                    </q-btn>
                    <q-btn flat dense color="teal" icon="forward_to_inbox" label="Correo" size="xs" class="plan-btn"
                      :disable="!props.row.cliente || !getItemRows(props.row.cnplan).length"
                      @click="openNotifyPlan(props.row)">
                      <q-tooltip>Enviar plan por correo</q-tooltip>
                    </q-btn>
                  </div>
                </header>
                <div class="items-expand__body">
                <q-inner-loading :showing="isItemLoading(props.row.cnplan)" />
                  <template v-if="getItemRows(props.row.cnplan).length">
                  <template v-if="hasModuloLayout(props.row.cnplan)">
                    <section
                      v-for="modBlock in getModuloGroups(props.row.cnplan)"
                      :key="`${props.row.cnplan}:mod:${modBlock.modulo}`"
                      class="modulo-group"
                    >
                      <header class="modulo-group__header">
                        <q-icon name="view_module" size="18px" class="q-mr-sm" color="primary" />
                        <strong>{{ modBlock.modulo_nombre }}</strong>
                        <span class="modulo-group__count">{{ modBlock.areas.length }} agrupador(es)</span>
                      </header>
                      <section
                        v-for="(areaBlock, areaIdx) in modBlock.areas"
                        :key="`${props.row.cnplan}:${modBlock.modulo}:${areaBlock.area}`"
                        class="area-group"
                      >
                        <header class="area-group__header">
                          <q-icon name="category" size="16px" class="q-mr-xs" color="secondary" />
                          <strong>{{ areaBlock.area }}</strong>
                          <span class="area-group__count">{{ areaBlock.items.length }} actividad(es)</span>
                          <div
                            v-if="isPlanEditable(props.row)"
                            class="area-group__actions row no-wrap q-gutter-xs"
                          >
                            <q-btn
                              flat dense round icon="arrow_upward" size="sm" color="primary"
                              :disable="areaIdx === 0"
                              @click="moveAreaBlock(props.row.cnplan, modBlock.modulo, areaBlock.area, -1)"
                            >
                              <q-tooltip>Subir agrupador</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat dense round icon="arrow_downward" size="sm" color="primary"
                              :disable="areaIdx === modBlock.areas.length - 1"
                              @click="moveAreaBlock(props.row.cnplan, modBlock.modulo, areaBlock.area, 1)"
                            >
                              <q-tooltip>Bajar agrupador</q-tooltip>
                            </q-btn>
                          </div>
                        </header>
                        <q-table
                          flat bordered dense class="items-table"
                          :rows="areaBlock.items"
                          :columns="itemDetailColumns"
                          :row-key="itemRowKey"
                          hide-pagination
                          :pagination="{ rowsPerPage: 0 }"
                        >
                          <template #body-cell-acciones="cell">
                            <q-td :props="cell">
                              <div v-if="isPlanEditable(props.row)" class="row no-wrap q-gutter-xs">
                                <q-btn flat dense round icon="arrow_upward" size="sm" color="primary"
                                  @click="moveItem(props.row.cnplan, cell.row, -1)" />
                                <q-btn flat dense round icon="arrow_downward" size="sm" color="primary"
                                  @click="moveItem(props.row.cnplan, cell.row, 1)" />
                                <q-btn flat dense round icon="edit" size="sm" color="primary"
                                  @click="openItemEdit(cell.row)" />
                                <q-btn flat dense round icon="delete" size="sm" color="negative"
                                  @click="confirmItemDelete(cell.row)" />
                              </div>
                            </q-td>
                          </template>
                          <template #body-cell-nombre="cell">
                            <q-td :props="cell">{{ planItemActividad(cell.row) }}</q-td>
                          </template>
                          <template #body-cell-estado="cell">
                            <q-td :props="cell">
                              <q-badge :color="estadoItemColor(cell.row.estado)" :label="cell.row.estado || 'Pendiente'" />
                            </q-td>
                          </template>
                          <template #body-cell-pct_cumplimiento="cell">
                            <q-td :props="cell">
                              <span v-if="cell.row.pct_cumplimiento != null && cell.row.pct_cumplimiento !== ''">
                                {{ cell.row.pct_cumplimiento }}%
                              </span>
                              <span v-else class="text-grey-5">—</span>
                            </q-td>
                          </template>
                        </q-table>
                      </section>
                    </section>
                  </template>
                  <q-table
                    v-else
                    flat bordered dense
                    :rows="getItemRows(props.row.cnplan)"
                    :columns="itemColumns"
                    :row-key="itemRowKey"
                    hide-pagination
                    :pagination="{ rowsPerPage: 0 }"
                  >
                    <template #body-cell-acciones="cell">
                      <q-td :props="cell">
                        <div v-if="isPlanEditable(props.row)" class="row no-wrap q-gutter-xs">
                          <q-btn flat dense round icon="arrow_upward" size="sm" color="primary"
                            @click="moveItem(props.row.cnplan, cell.row, -1)" />
                          <q-btn flat dense round icon="arrow_downward" size="sm" color="primary"
                            @click="moveItem(props.row.cnplan, cell.row, 1)" />
                          <q-btn flat dense round icon="edit" size="sm" color="primary"
                            @click="openItemEdit(cell.row)" />
                          <q-btn flat dense round icon="delete" size="sm" color="negative"
                            @click="confirmItemDelete(cell.row)" />
                        </div>
                      </q-td>
                    </template>
                    <template #body-cell-estado="cell">
                      <q-td :props="cell">
                        <q-badge :color="estadoItemColor(cell.row.estado)" :label="cell.row.estado || 'Pendiente'" />
                      </q-td>
                    </template>
                    <template #body-cell-pct_cumplimiento="cell">
                      <q-td :props="cell">
                        <span v-if="cell.row.pct_cumplimiento != null && cell.row.pct_cumplimiento !== ''">
                          {{ cell.row.pct_cumplimiento }}%
                        </span>
                        <span v-else class="text-grey-5">—</span>
                      </q-td>
                    </template>
                  </q-table>
                </template>
                <div v-else-if="!isItemLoading(props.row.cnplan)" class="text-grey q-pa-md">
                  Sin actividades. Use «Desde módulo» o «Desde agrupador».
                </div>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </section>

    <GenericForm v-model="formPlanOpen" :module="planModule" :record="planCurrent"
      :is-edit="planIsEdit" @saved="onPlanSaved" />
    <GenericForm v-model="formItemOpen" :module="itemModule" :record="itemCurrent"
      :is-edit="itemIsEdit" @saved="onItemSaved" />

    <!-- Agregar desde módulo -->
    <q-dialog v-model="addModOpen" persistent maximized>
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Agregar procesos desde módulo</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-list bordered separator dense style="max-height: 70vh; overflow: auto">
              <q-item v-for="m in modPickRows" :key="m.codigo" clickable
                :active="addModSelected === m.codigo" @click="selectModPick(m.codigo)">
                <q-item-section>{{ m.nombre }}</q-item-section>
              </q-item>
            </q-list>
          </div>
          <div class="col-12 col-md-8">
            <q-inner-loading :showing="loadingProcPick" />
            <QrystalosProcessPicker
              v-if="procPickRows.length"
              :processes="procPickRows"
              v-model="addModProcs"
              v-model:search="addModSearch"
              scroll-height="65vh"
            />
            <div v-else-if="!loadingProcPick" class="text-grey q-pa-md">Seleccione un módulo.</div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Agregar seleccionados" :loading="addingItems"
            :disable="!addModProcs.length" @click="confirmAddModulo" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Agregar desde agrupador -->
    <q-dialog v-model="addGrpOpen" persistent>
      <q-card style="min-width: 520px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Agregar desde agrupador</div>
          <p class="text-caption text-grey">
            Incluye procesos operativos y de configuración relacionados (ej. Caja + Financiero/Caja).
          </p>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="addGrpCodigo" :options="grpOptions" emit-value map-options outlined dense
            label="Agrupador" @update:model-value="loadGrpProcsPick" />
          <q-scroll-area v-if="grpProcsPick.length" style="height: 280px">
            <q-list dense>
              <q-item tag="label">
                <q-item-section side>
                  <q-checkbox
                    :model-value="addGrpProcs.length === grpSelectable.length && grpSelectable.length > 0"
                    :indeterminate="addGrpProcs.length > 0 && addGrpProcs.length < grpSelectable.length"
                    @update:model-value="toggleAllGrpProcs"
                  />
                </q-item-section>
                <q-item-section><q-item-label class="text-weight-medium">Seleccionar todos</q-item-label></q-item-section>
              </q-item>
              <q-item v-for="p in grpProcsPick" :key="p.proceso" tag="label">
                <q-item-section side>
                  <q-checkbox v-model="addGrpProcs" :val="p.proceso" :disable="isGrouperRow(p)" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ p.nombre || p.proceso_nombre }}</q-item-label>
                  <q-item-label caption>{{ p.modulo_nombre || p.modulo }} · {{ p.tipo }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Agregar" :loading="addingItems"
            :disable="!addGrpCodigo || !addGrpProcs.length" @click="confirmAddGrupo" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <PDFViewerComponent
      v-if="pdfDocument"
      ref="pdfRef"
      :document="pdfDocument"
      :document-name="pdfDocumentName"
      @close="pdfDocument = null"
    />

    <input
      ref="excelFileInput"
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      class="hidden"
      @change="onExcelFileSelected"
    />

    <NotifyRecipientDialog
      v-model="notifyOpen"
      :cliente-codigo="notifyCliente"
      :record-id="notifyPlanId"
      notify-type="plan_trabajo"
      title="Enviar plan de trabajo por correo"
      :sending="sendingNotify"
      @send="onNotifySend"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource, planTrabajoApi, qrystalosApi, notificacionApi, extractApiError } from 'src/services/api';
import { findModule } from 'src/config/modules';
import GenericForm from 'components/GenericForm.vue';
import QrystalosProcessPicker from 'components/QrystalosProcessPicker.vue';
import PDFViewerComponent from 'components/PDFViewerComponent.vue';
import NotifyRecipientDialog from 'components/NotifyRecipientDialog.vue';
import { isGrouperTipo } from 'src/utils/qrystalosProcessTree';

const $q = useQuasar();
const planApi = useResource('plan_trabajo');
const itemApi = useResource('plan_trabajo_items');
const modApi = useResource('qrystalos_modulos');
const procApi = useResource('qrystalos_procesos');
const grpApi = useResource('qrystalos_grupos');

const mod = findModule('plan_trabajo');
const planModule = computed(() => mod);
const itemModule = computed(() => ({
  resource: mod.detail.resource,
  title: 'Actividad del plan',
  formCols: mod.detail.formCols,
  idField: mod.detail.idField,
  fields: [{ name: 'cnplan', label: 'Plan', type: 'text', hidden: true }, ...mod.detail.fields],
}));

const planColumns = computed(() => [
  { name: 'expand', label: '', field: 'expand', align: 'left', style: 'width: 40px' },
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 48px' },
  ...mod.columns,
]);
const itemColumns = computed(() => [
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 140px' },
  ...mod.detail.columns,
]);
const itemDetailColumns = computed(() =>
  itemColumns.value.filter((c) => c.name !== 'modulo_nombre'),
);

const planRows = ref([]);
const itemCache = ref({});
const itemLoading = ref({});
const loadingPlan = ref(false);
const searchPlan = ref('');
const filtroFechaIni = ref('');
const filtroFechaFin = ref('');
const expandedPlan = ref(null);
const pagPlan = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const formPlanOpen = ref(false);
const formItemOpen = ref(false);
const planIsEdit = ref(false);
const itemIsEdit = ref(false);
const planCurrent = ref({});
const itemCurrent = ref({});

const addModOpen = ref(false);
const addModPlan = ref(null);
const addModSelected = ref('');
const addModProcs = ref([]);
const addModSearch = ref('');
const modPickRows = ref([]);
const procPickRows = ref([]);
const loadingProcPick = ref(false);
const addingItems = ref(false);

const addGrpOpen = ref(false);
const addGrpPlan = ref(null);
const addGrpCodigo = ref('');
const addGrpProcs = ref([]);
const grpOptions = ref([]);
const grpProcsPick = ref([]);

const pdfDocument = ref(null);
const pdfDocumentName = ref('plan-trabajo.pdf');
const pdfRef = ref(null);
const notifyOpen = ref(false);
const notifyPlanId = ref('');
const notifyCliente = ref('');
const sendingNotify = ref(false);
const excelFileInput = ref(null);
const excelImportRow = ref(null);
const importingExcel = ref(null);

const grpSelectable = computed(() =>
  grpProcsPick.value.filter((p) => !isGrouperRow(p)).map((p) => p.proceso),
);

function isGrouperRow(p) {
  return isGrouperTipo(p.tipo);
}

function canGenerarCronograma(row) {
  return !row.cnscrono && ['En curso', 'Cerrado'].includes(row.estado || '');
}

function toggleAllGrpProcs(checked) {
  addGrpProcs.value = checked ? [...grpSelectable.value] : [];
}

function currentMonthRange() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, d.getMonth() + 1, 0).getDate();
  return { ini: `${y}-${m}-01`, fin: `${y}-${m}-${String(last).padStart(2, '0')}` };
}

function initFiltroFechas() {
  const { ini, fin } = currentMonthRange();
  filtroFechaIni.value = ini;
  filtroFechaFin.value = fin;
}

function dataCols(cols) {
  return cols.filter((c) => !['acciones', 'expand'].includes(c.name));
}

function itemRowKey(row) {
  return `${row.cnplan}~${row.item}`;
}

function isPlanEditable(row) {
  const e = row?.estado || 'Borrador';
  return e !== 'Cerrado' && e !== 'Cancelado';
}

function estadoPlanColor(estado) {
  const map = { Borrador: 'grey-6', 'En curso': 'primary', Cerrado: 'positive', Cancelado: 'negative' };
  return map[estado] || 'grey';
}

function estadoItemColor(estado) {
  const map = { Pendiente: 'grey-6', 'En curso': 'primary', Realizado: 'positive', Cancelado: 'negative' };
  return map[estado] || 'grey';
}

function getItemRows(cnplan) {
  return itemCache.value[cnplan]?.rows || [];
}

function planItemArea(nombre, procNombre) {
  const text = String(procNombre || nombre || '').trim();
  const idx = text.indexOf(' / ');
  if (idx > 0) return text.slice(0, idx).trim();
  return '';
}

function planItemActividad(row) {
  const text = String(row.proc_nombre || row.nombre || '').trim();
  const area = planItemArea(row.nombre, row.proc_nombre);
  if (area && text.startsWith(`${area} / `)) {
    return text.slice(area.length + 3).trim() || '—';
  }
  const idx = text.indexOf(' / ');
  if (idx > 0) return text.slice(idx + 3).trim();
  return text || '—';
}

function hasModuloLayout(cnplan) {
  return getItemRows(cnplan).length > 0;
}

function getModuloGroups(cnplan) {
  const modMap = new Map();
  for (const row of getItemRows(cnplan)) {
    const modKey = row.modulo || '_';
    if (!modMap.has(modKey)) {
      modMap.set(modKey, {
        modulo: row.modulo,
        modulo_nombre: row.modulo_nombre || row.modulo || 'Sin módulo',
        modulo_orden: row.modulo_orden ?? 999,
        areasMap: new Map(),
      });
    }
    const mod = modMap.get(modKey);
    const area = planItemArea(row.nombre, row.proc_nombre) || 'General';
    if (!mod.areasMap.has(area)) {
      modMap.get(modKey).areasMap.set(area, { area, minOrden: row.orden ?? 999, items: [] });
    }
    const areaBlock = mod.areasMap.get(area);
    areaBlock.minOrden = Math.min(areaBlock.minOrden, row.orden ?? 999);
    areaBlock.items.push(row);
  }
  return [...modMap.values()]
    .sort((a, b) => (a.modulo_orden ?? 999) - (b.modulo_orden ?? 999))
    .map((mod) => ({
      modulo: mod.modulo,
      modulo_nombre: mod.modulo_nombre,
      areas: [...mod.areasMap.values()]
        .sort((a, b) => {
          const diff = (a.minOrden ?? 999) - (b.minOrden ?? 999);
          if (diff !== 0) return diff;
          return a.area.localeCompare(b.area, 'es');
        })
        .map((b) => ({
          area: b.area,
          items: [...b.items].sort((a, c) => (Number(a.orden) || 0) - (Number(c.orden) || 0)),
        })),
    }));
}

function isItemLoading(cnplan) {
  return !!itemLoading.value[cnplan];
}

async function loadPlans() {
  loadingPlan.value = true;
  try {
    const params = { q: searchPlan.value, page: pagPlan.value.page, limit: pagPlan.value.rowsPerPage };
    if (filtroFechaIni.value) params.fechaini = filtroFechaIni.value;
    if (filtroFechaFin.value) params.fechafin = filtroFechaFin.value;
    const res = await planApi.list(params);
    planRows.value = res.data;
    pagPlan.value.rowsNumber = res.total;
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar planes' });
  } finally {
    loadingPlan.value = false;
  }
}

async function loadItems(cnplan, force = false) {
  if (!force && itemCache.value[cnplan]) return;
  itemLoading.value = { ...itemLoading.value, [cnplan]: true };
  try {
    const res = await itemApi.list({ cnplan, limit: 500 });
    itemCache.value = { ...itemCache.value, [cnplan]: { rows: res.data } };
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar actividades' });
  } finally {
    itemLoading.value = { ...itemLoading.value, [cnplan]: false };
  }
}

function toggleExpand(row) {
  if (expandedPlan.value === row.cnplan) {
    expandedPlan.value = null;
    return;
  }
  expandedPlan.value = row.cnplan;
  loadItems(row.cnplan);
}

function onSearchPlan() {
  pagPlan.value.page = 1;
  expandedPlan.value = null;
  loadPlans();
}

function onFilterFechas() {
  if (filtroFechaIni.value && filtroFechaFin.value && filtroFechaFin.value < filtroFechaIni.value) {
    filtroFechaFin.value = filtroFechaIni.value;
  }
  pagPlan.value.page = 1;
  loadPlans();
}

function onPlanRequest(req) {
  pagPlan.value.page = req.pagination.page;
  pagPlan.value.rowsPerPage = req.pagination.rowsPerPage;
  loadPlans();
}

function openPlanCreate() {
  planCurrent.value = {};
  planIsEdit.value = false;
  formPlanOpen.value = true;
}

function openPlanEdit(row) {
  if (!isPlanEditable(row)) return;
  planCurrent.value = { ...row };
  planIsEdit.value = true;
  formPlanOpen.value = true;
}

function onPlanSaved() {
  formPlanOpen.value = false;
  loadPlans();
}

function openItemEdit(row) {
  itemCurrent.value = { ...row };
  itemIsEdit.value = true;
  formItemOpen.value = true;
}

function onItemSaved() {
  formItemOpen.value = false;
  if (expandedPlan.value) loadItems(expandedPlan.value, true);
}

function confirmItemDelete(row) {
  $q.dialog({ title: 'Eliminar actividad', message: `¿Eliminar «${row.nombre}»?`, cancel: true }).onOk(async () => {
    try {
      await itemApi.remove(`${row.cnplan}~${row.item}`);
      loadItems(row.cnplan, true);
    } catch (err) {
      $q.notify({ type: 'negative', message: extractApiError(err) });
    }
  });
}

async function openAddModulo(row) {
  addModPlan.value = row;
  addModProcs.value = [];
  addModSelected.value = '';
  addModSearch.value = '';
  procPickRows.value = [];
  const res = await modApi.list({ estado: 'A', limit: 100 });
  modPickRows.value = res.data;
  if (res.data.length) selectModPick(res.data[0].codigo);
  addModOpen.value = true;
}

async function selectModPick(codigo) {
  addModSelected.value = codigo;
  addModProcs.value = [];
  addModSearch.value = '';
  loadingProcPick.value = true;
  procPickRows.value = [];
  try {
    const res = await procApi.list({ modulo: codigo, estado: 'A', limit: 200 });
    procPickRows.value = res.data;
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  } finally {
    loadingProcPick.value = false;
  }
}

async function confirmAddModulo() {
  if (!addModPlan.value?.cnplan) return;
  addingItems.value = true;
  try {
    await planTrabajoApi.agregarProcesos(addModPlan.value.cnplan, addModProcs.value);
    addModOpen.value = false;
    $q.notify({ type: 'positive', message: 'Procesos agregados al plan' });
    loadItems(addModPlan.value.cnplan, true);
    loadPlans();
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  } finally {
    addingItems.value = false;
  }
}

async function openAddGrupo(row) {
  addGrpPlan.value = row;
  addGrpCodigo.value = '';
  addGrpProcs.value = [];
  grpProcsPick.value = [];
  const res = await grpApi.list({ estado: 'A', limit: 200 });
  grpOptions.value = res.data.map((g) => ({ label: g.nombre, value: g.codigo }));
  addGrpOpen.value = true;
}

async function loadGrpProcsPick() {
  addGrpProcs.value = [];
  if (!addGrpCodigo.value) {
    grpProcsPick.value = [];
    return;
  }
  grpProcsPick.value = await qrystalosApi.procesosGrupo(addGrpCodigo.value);
  addGrpProcs.value = grpProcsPick.value.filter((p) => !isGrouperRow(p)).map((p) => p.proceso);
}

async function reorganizarModulo(row) {
  try {
    await planTrabajoApi.reorganizarModulo(row.cnplan);
    $q.notify({ type: 'positive', message: 'Actividades ordenadas según el módulo Qrystalos' });
    loadItems(row.cnplan, true);
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  }
}

async function reorganizarAgrupador(row) {
  try {
    await planTrabajoApi.reorganizarAgrupador(row.cnplan);
    $q.notify({ type: 'positive', message: 'Actividades ordenadas por área (Inventario, Financiero…)' });
    loadItems(row.cnplan, true);
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  }
}

async function sincronizarCronograma(row) {
  try {
    const result = await planTrabajoApi.sincronizarCronograma(row.cnplan);
    $q.notify({
      type: 'positive',
      message: result.mensaje || result.advertencia || 'Cronograma sincronizado',
    });
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  }
}

async function generarCronograma(row) {
  $q.dialog({
    title: 'Generar cronograma de capacitación',
    message:
      'Se creará un cronograma en borrador para el mismo cliente. Los temas de capacitación existentes de cada agrupador se inactivarán y se crearán nuevos con las actividades del plan. ¿Continuar?',
    cancel: true,
    ok: { label: 'Generar', color: 'primary' },
  }).onOk(async () => {
    try {
      const result = await planTrabajoApi.generarCronograma(row.cnplan);
      $q.notify({
        type: result.advertencia ? 'warning' : 'positive',
        message: result.advertencia
          ? `Cronograma ${result.cnscrono} creado. ${result.advertencia}`
          : `Cronograma ${result.cnscrono} creado (${result.temas} temas, ${result.items} ítems)`,
        timeout: result.advertencia ? 8000 : 4000,
      });
      loadPlans();
    } catch (err) {
      $q.notify({ type: 'negative', message: extractApiError(err), timeout: 8000 });
    }
  });
}

async function confirmAddGrupo() {
  if (!addGrpPlan.value?.cnplan || !addGrpCodigo.value) return;
  addingItems.value = true;
  try {
    await planTrabajoApi.agregarGrupo(addGrpPlan.value.cnplan, {
      grupo: addGrpCodigo.value,
      procesos: addGrpProcs.value,
    });
    addGrpOpen.value = false;
    $q.notify({ type: 'positive', message: 'Actividades agregadas desde agrupador' });
    loadItems(addGrpPlan.value.cnplan, true);
    loadPlans();
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  } finally {
    addingItems.value = false;
  }
}

async function moveAreaBlock(cnplan, modulo, area, delta) {
  try {
    await planTrabajoApi.moverAgrupador(cnplan, { modulo, area, delta });
    loadItems(cnplan, true);
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  }
}

async function moveItem(cnplan, row, delta) {
  const rows = [...getItemRows(cnplan)].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const idx = rows.findIndex((r) => r.item === row.item);
  const swapIdx = idx + delta;
  if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapIdx];
  try {
    await planTrabajoApi.reordenar(cnplan, [
      { item: a.item, orden: b.orden },
      { item: b.item, orden: a.orden },
    ]);
    loadItems(cnplan, true);
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  }
}

async function printPdf(row) {
  try {
    const res = await planTrabajoApi.pdf(row.cnplan);
    if (res.data.type === 'application/json') {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.error || 'Error al generar el PDF');
    }
    const blob = new Blob([res.data], { type: 'application/pdf' });
    pdfDocumentName.value = `PLAN_TRABAJO_${row.cnplan}.pdf`;
    pdfDocument.value = blob;
    setTimeout(() => pdfRef.value?.mostrarPDF(), 150);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || err.response?.data?.error || 'Error al generar el PDF',
    });
  }
}

async function downloadExcel(row) {
  try {
    const res = await planTrabajoApi.excel(row.cnplan);
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PLAN_TRABAJO_${row.cnplan}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  }
}

function triggerExcelImport(row) {
  excelImportRow.value = row;
  excelFileInput.value?.click();
}

async function onExcelFileSelected(ev) {
  const file = ev.target.files?.[0];
  ev.target.value = '';
  const row = excelImportRow.value;
  if (!file || !row) return;
  importingExcel.value = row.cnplan;
  try {
    const result = await planTrabajoApi.importExcel(row.cnplan, file);
    await loadItems(row.cnplan, true);
    const warn = result.errores?.length ? ` (${result.errores.length} aviso(s))` : '';
    $q.notify({
      type: 'positive',
      message: `Avance importado: ${result.updated} actividad(es)${result.omitidos ? `, ${result.omitidos} realizadas omitidas` : ''}${warn}`,
    });
  } catch (err) {
    $q.notify({ type: 'negative', message: extractApiError(err) });
  } finally {
    importingExcel.value = null;
    excelImportRow.value = null;
  }
}

function openNotifyPlan(row) {
  if (!row.cliente) {
    $q.notify({ type: 'warning', message: 'Asigne un cliente al plan' });
    return;
  }
  if (!getItemRows(row.cnplan).length) {
    $q.notify({ type: 'warning', message: 'El plan no tiene actividades' });
    return;
  }
  notifyPlanId.value = row.cnplan;
  notifyCliente.value = row.cliente;
  notifyOpen.value = true;
}

async function onNotifySend(payload) {
  if (!notifyPlanId.value) return;
  sendingNotify.value = true;
  try {
    const data = await notificacionApi.planTrabajo(notifyPlanId.value, payload);
    notifyOpen.value = false;
    if (data.sent > 0) {
      $q.notify({
        type: 'positive',
        icon: 'mail',
        message: data.pdfAttached ? 'Correo enviado con PDF adjunto' : 'Correo enviado',
      });
    } else {
      $q.notify({ type: 'negative', message: data.error || 'No se pudo enviar el correo' });
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || extractApiError(err) || 'No se pudo enviar el correo',
    });
  } finally {
    sendingNotify.value = false;
  }
}

onMounted(() => {
  initFiltroFechas();
  loadPlans();
});
</script>

<style scoped lang="scss">
.plan-page { padding: 12px; max-width: none; width: 100%; }
.plan-hero {
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;
  padding: 14px 20px; margin-bottom: 16px; border-radius: 12px;
  background: linear-gradient(135deg, #4527a0 0%, #311b92 100%);
  color: #fff;
}
.plan-hero__main { display: flex; align-items: center; gap: 14px; }
.plan-hero__icon {
  width: 44px; height: 44px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.15);
}
.plan-hero__eyebrow { margin: 0; font-size: 0.68rem; text-transform: uppercase; opacity: 0.85; }
.plan-hero__title { margin: 0; font-size: 1.15rem; font-weight: 700; }
.plan-hero__subtitle { margin: 4px 0 0; font-size: 0.78rem; opacity: 0.88; }
.plan-hero__chip {
  background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 8px; font-size: 0.78rem;
}
.plan-panel {
  background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 12px;
}
.plan-panel__header {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; margin-bottom: 10px;
}
.plan-filter-date { width: 160px; }
.plan-search { flex: 1; min-width: 180px; }
.plan-table__row { cursor: pointer; }
.plan-table__row--expanded { background: #ede7f6 !important; }
.plan-table__expand-row > td { padding: 0 !important; background: #f8fafc; }
.items-expand {
  position: relative;
  margin: 0 4px 10px 0;
  padding: 10px 10px 12px;
  border-radius: 10px;
  border: 1px solid #b39ddb;
  background: linear-gradient(180deg, #f3e5f5 0%, #ffffff 40%);
}
.items-expand__header {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-bottom: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #d1c4e9;
}
.items-expand__body {
  margin-top: 14px;
  padding-top: 4px;
}
.items-expand__actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.plan-btn {
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.72rem;
  white-space: nowrap;
  flex-shrink: 0;
  min-height: 28px;
}
.plan-btn :deep(.q-btn__content) {
  padding: 0 5px;
  gap: 3px;
}
.plan-btn :deep(.q-icon) {
  font-size: 16px;
}
.modulo-group:first-child {
  margin-top: 4px;
}
.modulo-group {
  margin-bottom: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
}
.modulo-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #e8eaf6 0%, #ede7f6 100%);
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}
.modulo-group__count {
  margin-left: auto;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 500;
}
.area-group {
  margin: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.area-group__header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #e3f2fd;
  color: #0d47a1;
  font-size: 0.82rem;
  border-bottom: 1px solid #bbdefb;
}
.area-group__count {
  margin-left: auto;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 500;
}
.area-group__actions {
  flex-shrink: 0;
}
.items-table {
  border-radius: 0;
}
.hidden { display: none; }
</style>
