<template>
  <q-page class="qrys-page">
    <section class="qrys-hero">
      <div class="qrys-hero__main">
        <div class="qrys-hero__icon"><q-icon name="account_tree" size="22px" /></div>
        <div>
          <p class="qrys-hero__eyebrow">Soporte</p>
          <h1 class="qrys-hero__title">Procesos Qrystalos</h1>
          <p class="qrys-hero__subtitle">
            Catálogo por módulo e ítems hijos. Agrupadores para relacionar procesos operativos y de configuración.
          </p>
        </div>
      </div>
    </section>

    <q-tabs v-model="tab" dense class="q-mb-md" align="left" active-color="primary">
      <q-tab name="modulos" label="Módulos e ítems" icon="folder" />
      <q-tab name="grupos" label="Agrupadores" icon="hub" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="modulos" class="q-pa-none">
        <section class="qrys-panel">
          <header class="qrys-panel__header">
            <q-input
              v-model="searchMod"
              dense outlined debounce="400"
              placeholder="Buscar módulo..."
              class="qrys-search"
              bg-color="white"
              @update:model-value="loadModulos"
            >
              <template #prepend><q-icon name="search" color="grey-6" /></template>
            </q-input>
          </header>
          <q-table
            class="qrys-table"
            :rows="modRows"
            :columns="modColumns"
            row-key="codigo"
            :loading="loadingMod"
            v-model:pagination="pagMod"
            flat bordered dense
            @request="onModRequest"
          >
            <template #body="props">
              <q-tr
                :props="props"
                class="qrys-table__row"
                :class="{ 'qrys-table__row--expanded': expandedMod === props.row.codigo }"
                @click="toggleMod(props.row)"
              >
                <q-td auto-width @click.stop="toggleMod(props.row)">
                  <q-btn flat dense round size="sm" color="primary"
                    :icon="expandedMod === props.row.codigo ? 'expand_less' : 'expand_more'" />
                </q-td>
                <q-td v-for="col in props.cols.filter(c => c.name !== 'expand')" :key="col.name" :props="props">
                  <template v-if="col.name === 'estado'">
                    <q-badge :color="props.row.estado === 'A' ? 'positive' : 'grey'" :label="props.row.estado === 'A' ? 'Activo' : 'Inactivo'" />
                  </template>
                  <template v-else>{{ col.value }}</template>
                </q-td>
              </q-tr>
              <q-tr v-if="expandedMod === props.row.codigo" class="qrys-table__expand-row">
                <q-td :colspan="modColumns.length">
                  <q-inner-loading :showing="isProcLoading(props.row.codigo)" />
                  <QrystalosProcessTree
                    v-if="getProcTree(props.row.codigo).length"
                    :nodes="getProcTree(props.row.codigo)"
                    @edit="openProcEdit"
                  />
                  <div v-else-if="!isProcLoading(props.row.codigo)" class="text-grey q-pa-md">Sin procesos.</div>
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </section>
      </q-tab-panel>

      <q-tab-panel name="grupos" class="q-pa-none">
        <section class="qrys-panel">
          <header class="qrys-panel__header">
            <q-input v-model="searchGrp" dense outlined debounce="400" placeholder="Buscar agrupador..."
              class="qrys-search" bg-color="white" @update:model-value="loadGrupos">
              <template #prepend><q-icon name="search" color="grey-6" /></template>
            </q-input>
            <q-btn unelevated color="primary" icon="add" label="Nuevo agrupador" @click="openGrupoCreate" />
          </header>
          <q-table
            class="qrys-table"
            :rows="grpRows"
            :columns="grpColumns"
            row-key="codigo"
            :loading="loadingGrp"
            v-model:pagination="pagGrp"
            flat bordered dense
            @request="onGrpRequest"
          >
            <template #body="props">
              <q-tr
                :props="props"
                class="qrys-table__row"
                :class="{ 'qrys-table__row--expanded': expandedGrp === props.row.codigo }"
                @click="toggleGrp(props.row)"
              >
                <q-td auto-width @click.stop="toggleGrp(props.row)">
                  <q-btn flat dense round size="sm" color="primary"
                    :icon="expandedGrp === props.row.codigo ? 'expand_less' : 'expand_more'" />
                </q-td>
                <q-td>{{ props.row.codigo }}</q-td>
                <q-td>{{ props.row.nombre }}</q-td>
                <q-td>{{ props.row.descripcion || '—' }}</q-td>
                <q-td auto-width @click.stop>
                  <q-btn flat dense round icon="edit" color="primary" @click="openGrupoEdit(props.row)" />
                </q-td>
              </q-tr>
              <q-tr v-if="expandedGrp === props.row.codigo">
                <q-td :colspan="grpColumns.length">
                  <q-inner-loading :showing="loadingGrpProcs" />
                  <div class="row items-center q-mb-sm q-gutter-sm">
                    <q-btn flat color="primary" icon="playlist_add" label="Agregar procesos" size="sm"
                      @click="openGrupoAddProcs(props.row)" />
                  </div>
                  <q-list v-if="grpProcs.length" bordered separator dense>
                    <q-item v-for="p in grpProcs" :key="p.proceso">
                      <q-item-section>
                        <q-item-label>{{ p.proceso_nombre || p.proceso }}</q-item-label>
                        <q-item-label caption>{{ p.modulo_nombre || p.modulo }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn flat dense round icon="delete" color="negative"
                          @click="removeGrupoProc(props.row.codigo, p.proceso)" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <div v-else class="text-grey q-pa-sm">Sin procesos en este agrupador.</div>
                </q-td>
              </q-tr>
            </template>
          </q-table>
        </section>
      </q-tab-panel>
    </q-tab-panels>

    <GenericForm v-model="formProcOpen" :module="procModule" :record="procCurrent" :is-edit="procIsEdit"
      @saved="onProcSaved" />

    <GenericForm v-model="formGrupoOpen" :module="grupoModule" :record="grupoCurrent" :is-edit="grupoIsEdit"
      @saved="onGrupoSaved" />

    <q-dialog v-model="addProcsOpen" persistent>
      <q-card style="min-width: 520px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Agregar procesos al agrupador</div>
          <div class="text-caption text-grey">{{ addProcsGrupo?.nombre }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-select v-model="addProcsModulo" :options="modOptions" emit-value map-options outlined dense
            label="Filtrar por módulo" clearable @update:model-value="loadProcPick" />
          <q-input v-model="addProcsSearch" dense outlined debounce="300" label="Buscar proceso" class="q-mt-sm"
            @update:model-value="loadProcPick" />
          <q-scroll-area style="height: 320px" class="q-mt-sm">
            <q-list dense>
              <q-item v-for="p in procPickRows" :key="p.codigo" tag="label">
                <q-item-section side>
                  <q-checkbox v-model="addProcsSelected" :val="p.codigo" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ p.nombre }}</q-item-label>
                  <q-item-label caption>{{ p.modulo_nombre || p.modulo }} · {{ p.codigo_num }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Agregar" :loading="addingProcs"
            :disable="!addProcsSelected.length" @click="confirmAddProcs" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource } from 'src/services/api';
import { findModule } from 'src/config/modules';
import GenericForm from 'components/GenericForm.vue';
import QrystalosProcessTree from 'components/QrystalosProcessTree.vue';
import { buildProcessTree } from 'src/utils/qrystalosProcessTree';

const $q = useQuasar();
const tab = ref('modulos');
const modApi = useResource('qrystalos_modulos');
const procApi = useResource('qrystalos_procesos');
const grpApi = useResource('qrystalos_grupos');
const grpItemApi = useResource('qrystalos_grupo_items');

const modDef = findModule('qrystalos_modulos');
const procModule = computed(() => ({
  resource: modDef.detail.resource,
  title: 'Proceso Qrystalos',
  formCols: modDef.detail.formCols,
  idField: modDef.detail.idField,
  fields: [{ name: 'modulo', label: 'Módulo', type: 'text', hidden: true }, ...modDef.detail.fields],
}));
const grupoModule = computed(() => ({
  resource: 'qrystalos_grupos',
  title: 'Agrupador',
  formCols: 2,
  idField: 'codigo',
  fields: [
    { name: 'codigo', label: 'Código', type: 'text', hideOnCreate: true },
    { name: 'nombre', label: 'Nombre', type: 'text', required: true, colSpan: 2 },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', colSpan: 2 },
    { name: 'estado', label: 'Estado', type: 'select', options: [{ label: 'Activo', value: 'A' }, { label: 'Inactivo', value: 'I' }], default: 'A' },
  ],
}));

const modColumns = [
  { name: 'expand', label: '', field: 'expand', align: 'left' },
  { name: 'codigo', label: 'Cód.', field: 'codigo', align: 'left' },
  { name: 'nombre', label: 'Módulo principal', field: 'nombre', align: 'left' },
  { name: 'orden', label: 'Orden', field: 'orden', align: 'right' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
];
const grpColumns = [
  { name: 'expand', label: '', field: 'expand', align: 'left' },
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left' },
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left' },
  { name: 'descripcion', label: 'Descripción', field: 'descripcion', align: 'left' },
  { name: 'acciones', label: '', field: 'acciones', align: 'left' },
];

const modRows = ref([]);
const grpRows = ref([]);
const procCache = ref({});
const procLoading = ref({});
const grpProcs = ref([]);
const loadingMod = ref(false);
const loadingGrp = ref(false);
const loadingGrpProcs = ref(false);
const searchMod = ref('');
const searchGrp = ref('');
const expandedMod = ref(null);
const expandedGrp = ref(null);
const pagMod = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 });
const pagGrp = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 });

const formProcOpen = ref(false);
const procCurrent = ref({});
const procIsEdit = ref(false);
const formGrupoOpen = ref(false);
const grupoCurrent = ref({});
const grupoIsEdit = ref(false);

const addProcsOpen = ref(false);
const addProcsGrupo = ref(null);
const addProcsModulo = ref(null);
const addProcsSearch = ref('');
const addProcsSelected = ref([]);
const procPickRows = ref([]);
const modOptions = ref([]);
const addingProcs = ref(false);

function getProcs(codigo) {
  return procCache.value[codigo]?.rows || [];
}
function getProcTree(codigo) {
  return buildProcessTree(getProcs(codigo));
}
function isProcLoading(codigo) {
  return !!procLoading.value[codigo];
}

async function loadModulos() {
  loadingMod.value = true;
  try {
    const res = await modApi.list({
      q: searchMod.value,
      page: pagMod.value.page,
      limit: pagMod.value.rowsPerPage,
      estado: 'A',
    });
    modRows.value = res.data;
    pagMod.value.rowsNumber = res.total;
    modOptions.value = res.data.map((m) => ({ label: m.nombre, value: m.codigo }));
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar módulos' });
  } finally {
    loadingMod.value = false;
  }
}

async function loadProcs(modulo, force = false) {
  if (!force && procCache.value[modulo]) return;
  procLoading.value = { ...procLoading.value, [modulo]: true };
  try {
    const res = await procApi.list({ modulo, limit: 1000, estado: 'A' });
    procCache.value = { ...procCache.value, [modulo]: { rows: res.data } };
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar procesos' });
  } finally {
    procLoading.value = { ...procLoading.value, [modulo]: false };
  }
}

function toggleMod(row) {
  if (expandedMod.value === row.codigo) {
    expandedMod.value = null;
    return;
  }
  expandedMod.value = row.codigo;
  loadProcs(row.codigo);
}

async function loadGrupos() {
  loadingGrp.value = true;
  try {
    const res = await grpApi.list({
      q: searchGrp.value,
      page: pagGrp.value.page,
      limit: pagGrp.value.rowsPerPage,
      estado: 'A',
    });
    grpRows.value = res.data;
    pagGrp.value.rowsNumber = res.total;
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar agrupadores' });
  } finally {
    loadingGrp.value = false;
  }
}

async function loadGrpProcs(codigo) {
  loadingGrpProcs.value = true;
  try {
    const res = await grpItemApi.list({ grupo: codigo, limit: 500 });
    grpProcs.value = res.data;
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar ítems' });
  } finally {
    loadingGrpProcs.value = false;
  }
}

function toggleGrp(row) {
  if (expandedGrp.value === row.codigo) {
    expandedGrp.value = null;
    return;
  }
  expandedGrp.value = row.codigo;
  loadGrpProcs(row.codigo);
}

function onModRequest(req) {
  pagMod.value.page = req.pagination.page;
  pagMod.value.rowsPerPage = req.pagination.rowsPerPage;
  loadModulos();
}
function onGrpRequest(req) {
  pagGrp.value.page = req.pagination.page;
  pagGrp.value.rowsPerPage = req.pagination.rowsPerPage;
  loadGrupos();
}

function openProcEdit(row) {
  procCurrent.value = { ...row };
  procIsEdit.value = true;
  formProcOpen.value = true;
}
function onProcSaved() {
  formProcOpen.value = false;
  if (expandedMod.value) loadProcs(expandedMod.value, true);
}

function openGrupoCreate() {
  grupoCurrent.value = {};
  grupoIsEdit.value = false;
  formGrupoOpen.value = true;
}
function openGrupoEdit(row) {
  grupoCurrent.value = { ...row };
  grupoIsEdit.value = true;
  formGrupoOpen.value = true;
}
function onGrupoSaved() {
  formGrupoOpen.value = false;
  loadGrupos();
}

function openGrupoAddProcs(row) {
  addProcsGrupo.value = row;
  addProcsSelected.value = [];
  addProcsModulo.value = null;
  addProcsSearch.value = '';
  addProcsOpen.value = true;
  loadProcPick();
}

async function loadProcPick() {
  try {
    const params = { limit: 200, estado: 'A', q: addProcsSearch.value };
    if (addProcsModulo.value) params.modulo = addProcsModulo.value;
    const res = await procApi.list(params);
    procPickRows.value = res.data;
  } catch {
    procPickRows.value = [];
  }
}

async function confirmAddProcs() {
  if (!addProcsGrupo.value?.codigo) return;
  addingProcs.value = true;
  try {
    for (const proceso of addProcsSelected.value) {
      await grpItemApi.create({ grupo: addProcsGrupo.value.codigo, proceso });
    }
    addProcsOpen.value = false;
    $q.notify({ type: 'positive', message: `${addProcsSelected.value.length} proceso(s) agregado(s)` });
    if (expandedGrp.value === addProcsGrupo.value.codigo) loadGrpProcs(expandedGrp.value);
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'No se pudieron agregar procesos' });
  } finally {
    addingProcs.value = false;
  }
}

async function removeGrupoProc(grupo, proceso) {
  $q.dialog({
    title: 'Quitar del agrupador',
    message: `¿Quitar ${proceso} del agrupador?`,
    cancel: true,
  }).onOk(async () => {
    try {
      await grpItemApi.remove(`${grupo}~${proceso}`);
      loadGrpProcs(grupo);
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al quitar' });
    }
  });
}

onMounted(() => {
  loadModulos();
  loadGrupos();
});
</script>

<style scoped lang="scss">
.qrys-page { padding: 12px; max-width: none; width: 100%; }
.qrys-hero {
  display: flex; align-items: center; gap: 14px; padding: 14px 20px; margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #00695c 0%, #004d40 100%);
  color: #fff;
}
.qrys-hero__icon {
  width: 44px; height: 44px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.15);
}
.qrys-hero__eyebrow { margin: 0; font-size: 0.68rem; text-transform: uppercase; opacity: 0.85; }
.qrys-hero__title { margin: 0; font-size: 1.15rem; font-weight: 700; }
.qrys-hero__subtitle { margin: 4px 0 0; font-size: 0.78rem; opacity: 0.88; }
.qrys-panel {
  background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 12px;
}
.qrys-panel__header {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px;
}
.qrys-search { flex: 1; min-width: 200px; }
.qrys-table__row { cursor: pointer; }
.qrys-table__row--expanded { background: #e0f2f1 !important; }
.qrys-table__expand-row > td { background: #f8fafc; padding: 8px !important; }
</style>
