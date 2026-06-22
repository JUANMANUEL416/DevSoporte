<template>
  <q-page class="clientes-page">
    <!-- Encabezado -->
    <section class="clientes-hero">
      <div class="clientes-hero__main">
        <div class="clientes-hero__icon">
          <q-icon name="business" size="22px" />
        </div>
        <div>
          <p class="clientes-hero__eyebrow">Configuración</p>
          <h1 class="clientes-hero__title">Clientes</h1>
          <p class="clientes-hero__subtitle">Administre clientes y sus funcionarios asociados.</p>
        </div>
      </div>
      <div class="clientes-hero__meta">
        <span class="clientes-hero__chip">
          <strong>{{ pagCli.rowsNumber }}</strong>
          {{ pagCli.rowsNumber === 1 ? 'cliente' : 'clientes' }}
        </span>
        <span v-if="expandedCodigo" class="clientes-hero__chip clientes-hero__chip--active">
          <q-icon name="groups" size="14px" />
          <strong>{{ currentFuncRows.length }}</strong>
          funcionarios
        </span>
      </div>
    </section>

    <!-- Tabla expandible -->
    <section class="clientes-panel">
      <header class="clientes-panel__header">
        <div>
          <h2 class="clientes-panel__title">Listado de clientes</h2>
          <p class="clientes-panel__desc">Haga clic en una fila para expandir y ver sus funcionarios.</p>
        </div>
        <div class="clientes-panel__actions">
          <q-input
            v-model="searchCli"
            dense
            outlined
            debounce="400"
            placeholder="Buscar cliente..."
            class="clientes-search"
            bg-color="white"
            @update:model-value="onSearchCli"
          >
            <template #prepend><q-icon name="search" color="grey-6" /></template>
          </q-input>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nuevo cliente"
            class="clientes-btn"
            @click="openCliCreate"
          />
        </div>
      </header>

      <q-table
        class="clientes-table"
        :rows="cliRows"
        :columns="cliColumns"
        row-key="codigo"
        :loading="loadingCli"
        v-model:pagination="pagCli"
        :rows-per-page-options="[5, 10, 25]"
        flat
        bordered
        @request="onCliRequest"
      >
        <template #body="props">
          <!-- Fila cliente -->
          <q-tr
            :props="props"
            class="clientes-table__row"
            :class="{ 'clientes-table__row--expanded': expandedCodigo === props.row.codigo }"
            @click="toggleExpand(props.row)"
          >
            <q-td auto-width class="clientes-table__expand-cell" @click.stop="toggleExpand(props.row)">
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="expandedCodigo === props.row.codigo ? 'expand_less' : 'expand_more'"
                color="primary"
              />
            </q-td>
            <q-td auto-width class="clientes-table__actions-cell" @click.stop>
              <div class="clientes-actions">
                <q-btn flat dense round icon="edit" color="primary" @click="openCliEdit(props.row)">
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn flat dense round icon="delete" color="negative" @click="confirmCliDelete(props.row)">
                  <q-tooltip>Eliminar</q-tooltip>
                </q-btn>
              </div>
            </q-td>
            <q-td v-for="col in dataCols(props.cols)" :key="col.name" :props="props">
              <template v-if="col.name === 'contrato'">
                <q-badge
                  v-if="props.row.contrato"
                  :color="contratoColor(props.row.contrato)"
                  :label="props.row.contrato"
                  class="clientes-badge"
                />
                <span v-else class="text-grey-5">—</span>
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>

          <!-- Fila expandida: funcionarios -->
          <q-tr v-if="expandedCodigo === props.row.codigo" class="clientes-table__expand-row">
            <q-td :colspan="cliColumns.length">
              <div class="funcionarios-expand">
                <header class="funcionarios-expand__header">
                  <div>
                    <h3 class="funcionarios-expand__title">
                      <q-icon name="groups" size="18px" class="q-mr-xs" />
                      Funcionarios
                    </h3>
                    <p class="funcionarios-expand__desc">
                      {{ props.row.codigo }} · {{ props.row.nombrecliente }}
                    </p>
                  </div>
                  <q-btn
                    unelevated
                    color="primary"
                    icon="person_add"
                    label="Agregar funcionario"
                    size="sm"
                    class="clientes-btn"
                    @click="openFuncCreate(props.row)"
                  />
                </header>

                <q-inner-loading :showing="isFuncLoading(props.row.codigo)" />

                <q-table
                  v-if="getFuncRows(props.row.codigo).length"
                  class="funcionarios-table"
                  :rows="getFuncRows(props.row.codigo)"
                  :columns="funcColumns"
                  :row-key="funcRowKey"
                  flat
                  bordered
                  dense
                  hide-pagination
                  :pagination="{ rowsPerPage: 0 }"
                >
                  <template #body-cell-estado="cell">
                    <q-td :props="cell">
                      <q-badge
                        :color="cell.row.estado === 'Activo' ? 'positive' : 'grey-6'"
                        :label="cell.row.estado || '—'"
                        class="clientes-badge"
                      />
                    </q-td>
                  </template>
                  <template #body-cell-acciones="cell">
                    <q-td :props="cell">
                      <div class="clientes-actions">
                        <q-btn
                          flat
                          dense
                          round
                          icon="edit"
                          color="primary"
                          @click="openFuncEdit(cell.row)"
                        >
                          <q-tooltip>Editar</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          dense
                          round
                          icon="delete"
                          color="negative"
                          @click="confirmFuncDelete(cell.row)"
                        >
                          <q-tooltip>Eliminar</q-tooltip>
                        </q-btn>
                      </div>
                    </q-td>
                  </template>
                </q-table>

                <div v-else-if="!isFuncLoading(props.row.codigo)" class="funcionarios-expand__empty">
                  <q-icon name="person_off" size="28px" color="grey-4" />
                  <span>Este cliente no tiene funcionarios registrados.</span>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </section>

    <GenericForm
      v-model="formCliOpen"
      :module="cliModule"
      :record="cliCurrent"
      :is-edit="cliIsEdit"
      @saved="onCliSaved"
    />

    <GenericForm
      v-model="formFuncOpen"
      :module="funcModule"
      :record="funcCurrent"
      :is-edit="funcIsEdit"
      @saved="onFuncSaved"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource } from 'src/services/api';
import { findModule } from 'src/config/modules';
import GenericForm from 'components/GenericForm.vue';

const $q = useQuasar();
const cliApi = useResource('clientes');
const funcApi = useResource('funcionarios');

const mod = findModule('clientes');
const cliModule = computed(() => mod);
const funcModule = computed(() => ({
  resource: mod.detail.resource,
  title: 'Funcionario',
  formCols: mod.detail.formCols,
  idField: mod.detail.idField,
  fields: [
    { name: 'codigo', label: 'Cliente', type: 'text', required: true, fixed: true },
    ...mod.detail.fields,
  ],
}));

const cliColumns = computed(() => [
  { name: 'expand', label: '', field: 'expand', align: 'left', style: 'width: 40px' },
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 88px' },
  ...mod.columns,
]);
const funcColumns = computed(() => [
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 88px' },
  ...mod.detail.columns,
]);

const cliRows = ref([]);
const funcCache = ref({});
const funcLoading = ref({});
const loadingCli = ref(false);
const searchCli = ref('');
const expandedCodigo = ref(null);
const funcClienteCtx = ref(null);
const pagCli = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const formCliOpen = ref(false);
const formFuncOpen = ref(false);
const cliIsEdit = ref(false);
const funcIsEdit = ref(false);
const cliCurrent = ref({});
const funcCurrent = ref({});

const currentFuncRows = computed(() =>
  expandedCodigo.value ? getFuncRows(expandedCodigo.value) : [],
);

function funcRowKey(row) {
  return `${row.codigo}~${row.documento}`;
}

function dataCols(cols) {
  return cols.filter((c) => c.name !== 'acciones' && c.name !== 'expand');
}

function getFuncRows(codigo) {
  return funcCache.value[codigo]?.rows || [];
}

function isFuncLoading(codigo) {
  return !!funcLoading.value[codigo];
}

function contratoColor(contrato) {
  const map = {
    Compra: 'indigo',
    Arriendo: 'teal',
    Mantenimiento: 'orange',
    Eventual: 'blue-grey',
  };
  return map[contrato] || 'primary';
}

async function loadClientes() {
  loadingCli.value = true;
  try {
    const res = await cliApi.list({
      q: searchCli.value,
      page: pagCli.value.page,
      limit: pagCli.value.rowsPerPage,
    });
    cliRows.value = res.data;
    pagCli.value.rowsNumber = res.total;

    if (expandedCodigo.value && !res.data.some((r) => r.codigo === expandedCodigo.value)) {
      expandedCodigo.value = null;
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar clientes' });
  } finally {
    loadingCli.value = false;
  }
}

async function loadFuncionarios(codigo, force = false) {
  if (!force && funcCache.value[codigo]) return;

  funcLoading.value = { ...funcLoading.value, [codigo]: true };
  try {
    const res = await funcApi.list({ codigo, limit: 200 });
    funcCache.value = {
      ...funcCache.value,
      [codigo]: { rows: res.data },
    };
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar funcionarios' });
  } finally {
    funcLoading.value = { ...funcLoading.value, [codigo]: false };
  }
}

function toggleExpand(row) {
  if (expandedCodigo.value === row.codigo) {
    expandedCodigo.value = null;
    return;
  }
  expandedCodigo.value = row.codigo;
  loadFuncionarios(row.codigo);
}

function onSearchCli() {
  pagCli.value.page = 1;
  expandedCodigo.value = null;
  loadClientes();
}

function onCliRequest(req) {
  pagCli.value.page = req.pagination.page;
  pagCli.value.rowsPerPage = req.pagination.rowsPerPage;
  loadClientes();
}

function openCliCreate() {
  cliCurrent.value = {};
  cliIsEdit.value = false;
  formCliOpen.value = true;
}

function openCliEdit(row) {
  cliCurrent.value = { ...row };
  cliIsEdit.value = true;
  formCliOpen.value = true;
}

function confirmCliDelete(row) {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Eliminar este cliente y sus funcionarios?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await cliApi.remove(row.codigo);
      if (expandedCodigo.value === row.codigo) expandedCodigo.value = null;
      const nextCache = { ...funcCache.value };
      delete nextCache[row.codigo];
      funcCache.value = nextCache;
      $q.notify({ type: 'positive', message: 'Cliente eliminado' });
      loadClientes();
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

function onCliSaved() {
  formCliOpen.value = false;
  loadClientes();
}

function openFuncCreate(cliente) {
  funcClienteCtx.value = cliente;
  funcCurrent.value = { codigo: cliente.codigo };
  funcIsEdit.value = false;
  formFuncOpen.value = true;
}

function openFuncEdit(row) {
  funcClienteCtx.value = { codigo: row.codigo };
  funcCurrent.value = { ...row };
  funcIsEdit.value = true;
  formFuncOpen.value = true;
}

function confirmFuncDelete(row) {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Eliminar este funcionario?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await funcApi.remove(funcRowKey(row));
      $q.notify({ type: 'positive', message: 'Funcionario eliminado' });
      await loadFuncionarios(row.codigo, true);
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

function onFuncSaved() {
  formFuncOpen.value = false;
  const codigo = funcCurrent.value.codigo || funcClienteCtx.value?.codigo || expandedCodigo.value;
  if (codigo) loadFuncionarios(codigo, true);
}

onMounted(loadClientes);
</script>

<style scoped lang="scss">
.clientes-page {
  padding: 16px 20px;
  max-width: 1280px;
  margin: 0 auto;
}

.clientes-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3949ab 0%, #303f9f 55%, #1a237e 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(48, 63, 159, 0.22);
}

.clientes-hero__main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.clientes-hero__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.clientes-hero__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.clientes-hero__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
}

.clientes-hero__subtitle {
  margin: 4px 0 0;
  font-size: 0.78rem;
  opacity: 0.88;
}

.clientes-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.clientes-hero__chip {
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

.clientes-panel {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.clientes-panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.clientes-panel__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e293b;
}

.clientes-panel__desc {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: #64748b;
}

.clientes-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.clientes-search {
  min-width: 220px;
}

.clientes-btn {
  border-radius: 8px;
  font-weight: 500;
}

.clientes-table {
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

.clientes-table__expand-cell {
  width: 40px;
  padding-right: 0 !important;
}

.clientes-table__actions-cell {
  width: 88px;
  padding-right: 4px !important;
}

.clientes-table__row {
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #f1f5f9;
  }

  &--expanded {
    background: #eef0fb !important;

    td {
      font-weight: 500;
      color: #1e293b;
      border-bottom: none;
    }
  }
}

.clientes-table__expand-row {
  background: #f8fafc;

  > td {
    padding: 0 !important;
    border-top: none !important;
  }
}

.funcionarios-expand {
  position: relative;
  margin: 0 12px 12px 48px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #c5cae9;
  background: linear-gradient(180deg, #fafbff 0%, #ffffff 40%);
}

.funcionarios-expand__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.funcionarios-expand__title {
  display: flex;
  align-items: center;
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: #3949ab;
}

.funcionarios-expand__desc {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.funcionarios-expand__empty {
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

.funcionarios-table {
  border-radius: 8px;
  overflow: hidden;
  background: #fff;

  :deep(thead tr:first-child th) {
    background: #eef0fb;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #5c6bc0;
  }
}

.clientes-badge {
  font-size: 0.7rem;
  padding: 3px 8px;
}

.clientes-actions {
  display: inline-flex;
  gap: 2px;
}

@media (max-width: 599px) {
  .clientes-page {
    padding: 12px;
  }

  .clientes-hero {
    padding: 12px 14px;
  }

  .clientes-panel {
    padding: 12px;
  }

  .clientes-search {
    width: 100%;
    min-width: 0;
  }

  .clientes-panel__actions {
    width: 100%;
  }

  .funcionarios-expand {
    margin-left: 8px;
    margin-right: 4px;
  }
}
</style>
