<template>
  <q-page class="temas-page">
    <section class="temas-hero">
      <div class="temas-hero__main">
        <div class="temas-hero__icon">
          <q-icon name="menu_book" size="22px" />
        </div>
        <div>
          <p class="temas-hero__eyebrow">Configuración</p>
          <h1 class="temas-hero__title">Temas de capacitación</h1>
          <p class="temas-hero__subtitle">Catálogo de temas mayores e ítems con duración sugerida.</p>
        </div>
      </div>
      <div class="temas-hero__meta">
        <span class="temas-hero__chip">
          <strong>{{ pagTema.rowsNumber }}</strong>
          {{ pagTema.rowsNumber === 1 ? 'tema' : 'temas' }}
        </span>
        <span v-if="expandedCodigo" class="temas-hero__chip temas-hero__chip--active">
          <q-icon name="list_alt" size="14px" />
          <strong>{{ currentItemRows.length }}</strong>
          {{ currentItemRows.length === 1 ? 'ítem' : 'ítems' }}
        </span>
      </div>
    </section>

    <section class="temas-panel">
      <header class="temas-panel__header">
        <div class="temas-panel__actions">
          <q-input
            v-model="searchTema"
            dense
            outlined
            debounce="400"
            placeholder="Buscar tema..."
            class="temas-search"
            bg-color="white"
            @update:model-value="onSearchTema"
          >
            <template #prepend><q-icon name="search" color="grey-6" /></template>
          </q-input>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nuevo tema"
            class="temas-btn"
            @click="openTemaCreate"
          />
        </div>
      </header>

      <q-table
        class="temas-table"
        :rows="temaRows"
        :columns="temaColumns"
        row-key="codigo"
        :loading="loadingTema"
        v-model:pagination="pagTema"
        :rows-per-page-options="[5, 10, 25]"
        flat
        bordered
        dense
        @request="onTemaRequest"
      >
        <template #body="props">
          <q-tr
            :props="props"
            class="temas-table__row"
            :class="{ 'temas-table__row--expanded': expandedCodigo === props.row.codigo }"
            @click="toggleExpand(props.row)"
          >
            <q-td auto-width class="temas-table__expand-cell" @click.stop="toggleExpand(props.row)">
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="expandedCodigo === props.row.codigo ? 'expand_less' : 'expand_more'"
                color="primary"
              />
            </q-td>
            <q-td auto-width class="temas-table__actions-cell" @click.stop>
              <div class="temas-actions">
                <q-btn flat dense round icon="edit" color="primary" @click="openTemaEdit(props.row)">
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn flat dense round icon="delete" color="negative" @click="confirmTemaDelete(props.row)">
                  <q-tooltip>Eliminar</q-tooltip>
                </q-btn>
              </div>
            </q-td>
            <q-td
              v-for="col in dataCols(props.cols)"
              :key="col.name"
              :props="props"
              :class="{ 'temas-table__nombre-cell': col.name === 'nombre' }"
            >
              <template v-if="col.name === 'estado'">
                <q-badge
                  :color="props.row.estado === 'A' ? 'positive' : 'grey-6'"
                  :label="props.row.estado === 'A' ? 'Activo' : 'Inactivo'"
                  class="temas-badge"
                />
              </template>
              <template v-else-if="col.name === 'nombre'">
                <span class="temas-table__nombre-text">{{ col.value }}</span>
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>

          <q-tr v-if="expandedCodigo === props.row.codigo" class="temas-table__expand-row">
            <q-td :colspan="temaColumns.length">
              <div class="items-expand">
                <header class="items-expand__header">
                  <h3 class="items-expand__title">
                    <q-icon name="list_alt" size="18px" class="q-mr-xs" />
                    Ítems del tema
                  </h3>
                  <q-btn
                    unelevated
                    color="primary"
                    icon="add"
                    label="Agregar ítem"
                    size="sm"
                    class="temas-btn"
                    @click="openItemCreate(props.row)"
                  />
                </header>

                <q-inner-loading :showing="isItemLoading(props.row.codigo)" />

                <q-table
                  v-if="getItemRows(props.row.codigo).length"
                  class="items-table"
                  :rows="getItemRows(props.row.codigo)"
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
                        :color="cell.row.estado === 'A' ? 'positive' : 'grey-6'"
                        :label="cell.row.estado === 'A' ? 'Activo' : 'Inactivo'"
                        class="temas-badge"
                      />
                    </q-td>
                  </template>
                  <template #body-cell-acciones="cell">
                    <q-td :props="cell">
                      <div class="temas-actions">
                        <q-btn flat dense round icon="edit" color="primary" @click="openItemEdit(cell.row)">
                          <q-tooltip>Editar</q-tooltip>
                        </q-btn>
                        <q-btn flat dense round icon="delete" color="negative" @click="confirmItemDelete(cell.row)">
                          <q-tooltip>Eliminar</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </template>
                </q-table>

                <div v-else-if="!isItemLoading(props.row.codigo)" class="items-expand__empty">
                  <q-icon name="playlist_remove" size="28px" color="grey-4" />
                  <span>Este tema no tiene ítems registrados.</span>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </section>

    <GenericForm
      v-model="formTemaOpen"
      :module="temaModule"
      :record="temaCurrent"
      :is-edit="temaIsEdit"
      @saved="onTemaSaved"
    />

    <GenericForm
      v-model="formItemOpen"
      :module="itemModule"
      :record="itemCurrent"
      :is-edit="itemIsEdit"
      @saved="onItemSaved"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useResource } from 'src/services/api';
import { findModule } from 'src/config/modules';
import GenericForm from 'components/GenericForm.vue';

const $q = useQuasar();
const temaApi = useResource('temas_capacitacion');
const itemApi = useResource('temas_capacitacion_items');

const mod = findModule('temas_capacitacion');
const temaModule = computed(() => mod);
const itemModule = computed(() => ({
  resource: mod.detail.resource,
  title: 'Ítem del tema',
  formCols: mod.detail.formCols,
  idField: mod.detail.idField,
  fields: [
    { name: 'codigo', label: 'Tema', type: 'text', required: true, fixed: true },
    ...mod.detail.fields,
  ],
}));

const temaColumns = computed(() => [
  { name: 'expand', label: '', field: 'expand', align: 'left', style: 'width: 40px' },
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 72px; min-width: 72px' },
  ...mod.columns,
]);
const itemColumns = computed(() => [
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 72px; min-width: 72px' },
  ...mod.detail.columns,
]);

const temaRows = ref([]);
const itemCache = ref({});
const itemLoading = ref({});
const loadingTema = ref(false);
const searchTema = ref('');
const expandedCodigo = ref(null);
const itemTemaCtx = ref(null);
const pagTema = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const formTemaOpen = ref(false);
const formItemOpen = ref(false);
const temaIsEdit = ref(false);
const itemIsEdit = ref(false);
const temaCurrent = ref({});
const itemCurrent = ref({});

const currentItemRows = computed(() =>
  expandedCodigo.value ? getItemRows(expandedCodigo.value) : [],
);

function itemRowKey(row) {
  return `${row.codigo}~${row.item}`;
}

function dataCols(cols) {
  return cols.filter((c) => c.name !== 'acciones' && c.name !== 'expand');
}

function getItemRows(codigo) {
  return itemCache.value[codigo]?.rows || [];
}

function isItemLoading(codigo) {
  return !!itemLoading.value[codigo];
}

async function loadTemas() {
  loadingTema.value = true;
  try {
    const res = await temaApi.list({
      q: searchTema.value,
      page: pagTema.value.page,
      limit: pagTema.value.rowsPerPage,
    });
    temaRows.value = res.data;
    pagTema.value.rowsNumber = res.total;

    if (expandedCodigo.value && !res.data.some((r) => r.codigo === expandedCodigo.value)) {
      expandedCodigo.value = null;
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar temas' });
  } finally {
    loadingTema.value = false;
  }
}

async function loadItems(codigo, force = false) {
  if (!force && itemCache.value[codigo]) return;

  itemLoading.value = { ...itemLoading.value, [codigo]: true };
  try {
    const res = await itemApi.list({ codigo, limit: 500 });
    itemCache.value = {
      ...itemCache.value,
      [codigo]: { rows: res.data },
    };
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar ítems' });
  } finally {
    itemLoading.value = { ...itemLoading.value, [codigo]: false };
  }
}

function toggleExpand(row) {
  if (expandedCodigo.value === row.codigo) {
    expandedCodigo.value = null;
    return;
  }
  expandedCodigo.value = row.codigo;
  loadItems(row.codigo);
}

function onSearchTema() {
  pagTema.value.page = 1;
  expandedCodigo.value = null;
  loadTemas();
}

function onTemaRequest(req) {
  pagTema.value.page = req.pagination.page;
  pagTema.value.rowsPerPage = req.pagination.rowsPerPage;
  loadTemas();
}

function openTemaCreate() {
  temaCurrent.value = {};
  temaIsEdit.value = false;
  formTemaOpen.value = true;
}

function openTemaEdit(row) {
  temaCurrent.value = { ...row };
  temaIsEdit.value = true;
  formTemaOpen.value = true;
}

function confirmTemaDelete(row) {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Eliminar este tema y sus ítems?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await temaApi.remove(row.codigo);
      if (expandedCodigo.value === row.codigo) expandedCodigo.value = null;
      const nextCache = { ...itemCache.value };
      delete nextCache[row.codigo];
      itemCache.value = nextCache;
      $q.notify({ type: 'positive', message: 'Tema eliminado' });
      loadTemas();
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

function onTemaSaved() {
  formTemaOpen.value = false;
  loadTemas();
}

function openItemCreate(tema) {
  itemTemaCtx.value = tema;
  itemCurrent.value = { codigo: tema.codigo };
  itemIsEdit.value = false;
  formItemOpen.value = true;
}

function openItemEdit(row) {
  itemTemaCtx.value = { codigo: row.codigo };
  itemCurrent.value = { ...row };
  itemIsEdit.value = true;
  formItemOpen.value = true;
}

function confirmItemDelete(row) {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Eliminar este ítem?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await itemApi.remove(itemRowKey(row));
      $q.notify({ type: 'positive', message: 'Ítem eliminado' });
      await loadItems(row.codigo, true);
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

async function onItemSaved() {
  const codigo = itemCurrent.value.codigo || itemTemaCtx.value?.codigo || expandedCodigo.value;
  if (codigo) await loadItems(codigo, true);

  if (itemIsEdit.value) {
    formItemOpen.value = false;
    return;
  }

  formItemOpen.value = false;
  itemCurrent.value = { codigo };
  itemIsEdit.value = false;
  await nextTick();
  formItemOpen.value = true;
}

onMounted(loadTemas);
</script>

<style scoped lang="scss">
.temas-page {
  padding: 16px 20px;
  max-width: 1280px;
  margin: 0 auto;
}

.temas-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #5e35b1 0%, #4527a0 55%, #311b92 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(69, 39, 160, 0.22);
}

.temas-hero__main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.temas-hero__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.temas-hero__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.temas-hero__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
}

.temas-hero__subtitle {
  margin: 4px 0 0;
  font-size: 0.78rem;
  opacity: 0.88;
}

.temas-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.temas-hero__chip {
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

.temas-panel {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.temas-panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}

.temas-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.temas-search {
  min-width: 220px;
}

.temas-btn {
  border-radius: 8px;
  font-weight: 500;
}

.temas-table {
  border-radius: 8px;
  overflow: hidden;

  :deep(thead tr:first-child th) {
    background: #f8fafc;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #64748b;
    padding: 5px 8px;
    height: auto;
  }

  :deep(tbody td) {
    padding: 4px 8px;
    font-size: 0.82rem;
    height: auto;
    vertical-align: middle;
  }
}

.temas-table__expand-cell {
  width: 36px;
  min-width: 36px;
  padding: 2px 0 !important;
}

.temas-table__actions-cell {
  width: 72px;
  min-width: 72px;
  padding: 2px 4px !important;
  white-space: nowrap;
}

.temas-table__nombre-cell {
  max-width: 320px;
}

.temas-table__nombre-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}

.temas-table__row {
  cursor: pointer;

  &:hover td {
    background: #f8fafc;
  }

  &--expanded {
    background: #ede7f6 !important;

    td {
      font-weight: 500;
      color: #4527a0;
      border-bottom: none;
    }
  }
}

.temas-table__expand-row {
  background: #f8fafc;

  > td {
    padding: 0 !important;
    border-top: none !important;
  }
}

.items-expand {
  position: relative;
  margin: 0 8px 8px 40px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d1c4e9;
  background: linear-gradient(180deg, #faf8ff 0%, #ffffff 40%);
}

.items-expand__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.items-expand__title {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4527a0;
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

.items-table {
  border-radius: 8px;
  overflow: hidden;
  background: #fff;

  :deep(thead tr:first-child th) {
    background: #ede7f6;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #4527a0;
    padding: 4px 8px;
    height: auto;
  }

  :deep(tbody td) {
    padding: 3px 8px;
    height: auto;
    vertical-align: middle;
  }
}

.temas-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0;
  white-space: nowrap;
}

.temas-badge {
  font-size: 0.7rem;
  padding: 3px 8px;
}
</style>
