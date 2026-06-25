<template>
  <q-page class="devsoporte-page">
    <div class="row items-center q-mb-md">
      <div>
        <div class="page-title">Control de Versiones</div>
        <div class="text-caption text-grey-7">
          Versión en producción: <strong>v{{ resumen.versionActual || '—' }}</strong>
          · En desarrollo: {{ resumen.pendientes }}
          · Listos para publicar: {{ resumen.listosPublicar }}
        </div>
      </div>
      <q-space />
      <q-btn
        v-if="selectedIntegrados.length"
        color="positive"
        icon="publish"
        label="Registrar publicación"
        class="q-mr-sm"
        @click="openPublicar"
      />
      <q-btn color="primary" icon="add" label="Nuevo cambio" @click="openCreate" />
    </div>

    <q-tabs v-model="tab" dense class="text-primary q-mb-md" align="left">
      <q-tab name="cambios" label="Cambios" icon="track_changes" />
      <q-tab name="versiones" label="Versiones publicadas" icon="history" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="cambios" class="q-pa-none">
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroEstado"
              :options="estadoOptions"
              label="Estado"
              dense
              outlined
              emit-value
              map-options
              clearable
              @update:model-value="reloadCambios"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroTipo"
              :options="tipoOptions"
              label="Tipo"
              dense
              outlined
              emit-value
              map-options
              clearable
              @update:model-value="reloadCambios"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="search"
              dense
              outlined
              debounce="400"
              placeholder="Buscar..."
              @update:model-value="reloadCambios"
            >
              <template #append><q-icon name="search" /></template>
            </q-input>
          </div>
        </div>

        <q-table
          :rows="cambios"
          :columns="cambioColumns"
          row-key="consecutivo"
          :loading="loadingCambios"
          flat
          bordered
          selection="multiple"
          v-model:selected="selectedIntegrados"
          :rows-per-page-options="[10, 25, 50]"
        >
          <template #body-cell-tipo="props">
            <q-td :props="props">
              <q-badge :color="tipoColor(props.row.tipo)" :label="props.row.tipo" />
            </q-td>
          </template>
          <template #body-cell-estado="props">
            <q-td :props="props">
              <q-badge :color="estadoColor(props.row.estado)" :label="fmtEstado(props.row.estado)" />
            </q-td>
          </template>
          <template #body-cell-acciones="props">
            <q-td :props="props" class="text-right">
              <q-btn
                v-if="props.row.estado === 'en_desarrollo'"
                flat
                dense
                round
                icon="merge"
                color="teal"
                @click="openIntegrar(props.row)"
              >
                <q-tooltip>Marcar integrado en develop</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="edit" color="primary" @click="openEdit(props.row)">
                <q-tooltip>Editar</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>

      <q-tab-panel name="versiones" class="q-pa-none">
        <q-table
          :rows="versiones"
          :columns="versionColumns"
          row-key="version"
          :loading="loadingVersiones"
          flat
          bordered
          :rows-per-page-options="[10, 25]"
        />
      </q-tab-panel>
    </q-tab-panels>

    <GenericForm
      v-model="formOpen"
      :module="mod"
      :record="current"
      :is-edit="isEdit"
      @saved="onSaved"
    />

    <q-dialog v-model="integrarOpen" persistent>
      <q-card style="min-width: 420px">
        <q-card-section>
          <div class="text-h6">Integrar en develop</div>
          <div class="text-caption">{{ integrarRow?.consecutivo }} — {{ integrarRow?.titulo }}</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="integrarCambios"
            type="textarea"
            autogrow
            outlined
            label="Cambios realizados"
            hint="Resumen de lo implementado antes de merge a develop"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="teal" label="Marcar integrado" :loading="integrando" @click="confirmIntegrar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="publicarOpen" persistent>
      <q-card style="min-width: 480px">
        <q-card-section>
          <div class="text-h6">Registrar publicación</div>
          <div class="text-caption">
            {{ selectedIntegrados.length }} cambio(s) seleccionado(s). Luego haga merge develop → master y
            <code>npm run deploy</code>.
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="publicarVersion" outlined label="Nueva versión (semver)" hint="Ej. 1.2.0" />
          <q-input v-model="publicarResumen" outlined label="Resumen de la versión" />
          <q-input v-model="publicarChangelog" type="textarea" autogrow outlined label="Changelog (opcional)" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="positive" label="Registrar" :loading="publicando" @click="confirmPublicar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import GenericForm from 'src/components/GenericForm.vue';
import { findModule } from 'src/config/modules';
import { controlVersionesApi, useResource } from 'src/services/api';

const $q = useQuasar();
const mod = findModule('control_versiones');
const api = useResource('cambios_desarrollo');
const versionApi = useResource('versiones_publicadas');

const tab = ref('cambios');
const resumen = ref({ versionActual: '', pendientes: 0, listosPublicar: 0 });
const cambios = ref([]);
const versiones = ref([]);
const loadingCambios = ref(false);
const loadingVersiones = ref(false);
const search = ref('');
const filtroEstado = ref(null);
const filtroTipo = ref(null);
const selectedIntegrados = ref([]);

const formOpen = ref(false);
const isEdit = ref(false);
const current = ref(null);

const integrarOpen = ref(false);
const integrarRow = ref(null);
const integrarCambios = ref('');
const integrando = ref(false);

const publicarOpen = ref(false);
const publicarVersion = ref('');
const publicarResumen = ref('');
const publicarChangelog = ref('');
const publicando = ref(false);

const estadoOptions = [
  { label: 'En desarrollo', value: 'en_desarrollo' },
  { label: 'Integrado', value: 'integrado' },
  { label: 'Publicado', value: 'publicado' },
];

const tipoOptions = [
  { label: 'Feature', value: 'feature' },
  { label: 'Fix', value: 'fix' },
  { label: 'Hotfix', value: 'hotfix' },
];

const cambioColumns = [
  { name: 'consecutivo', label: 'Código', field: 'consecutivo', align: 'left', sortable: true },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'titulo', label: 'Título', field: 'titulo', align: 'left', sortable: true },
  { name: 'rama', label: 'Rama Git', field: 'rama', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'f_inicio', label: 'Inicio', field: 'f_inicio', align: 'left', format: fmtDate },
  { name: 'f_terminacion', label: 'Fin', field: 'f_terminacion', align: 'left', format: fmtDate },
  { name: 'version', label: 'Versión', field: 'version', align: 'left' },
  { name: 'acciones', label: '', field: 'acciones', align: 'right' },
];

const versionColumns = [
  { name: 'version', label: 'Versión', field: 'version', align: 'left', sortable: true },
  { name: 'fecha', label: 'Fecha', field: 'fecha', align: 'left', format: fmtDate },
  { name: 'resumen', label: 'Resumen', field: 'resumen', align: 'left' },
  { name: 'usuario', label: 'Usuario', field: 'usuario', align: 'left' },
];

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('es-CO');
}

function fmtEstado(v) {
  const map = {
    en_desarrollo: 'En desarrollo',
    integrado: 'Integrado',
    publicado: 'Publicado',
  };
  return map[v] || v;
}

function tipoColor(tipo) {
  if (tipo === 'feature') return 'primary';
  if (tipo === 'fix') return 'orange';
  if (tipo === 'hotfix') return 'negative';
  return 'grey';
}

function estadoColor(estado) {
  if (estado === 'en_desarrollo') return 'blue-grey';
  if (estado === 'integrado') return 'teal';
  if (estado === 'publicado') return 'positive';
  return 'grey';
}

async function loadResumen() {
  resumen.value = await controlVersionesApi.resumen();
}

async function reloadCambios() {
  loadingCambios.value = true;
  try {
    const params = {};
    if (search.value) params.q = search.value;
    if (filtroEstado.value) params.estado = filtroEstado.value;
    if (filtroTipo.value) params.tipo = filtroTipo.value;
    const data = await api.list(params);
    cambios.value = data.data || [];
    selectedIntegrados.value = selectedIntegrados.value.filter((s) => s.estado === 'integrado');
  } finally {
    loadingCambios.value = false;
  }
}

async function reloadVersiones() {
  loadingVersiones.value = true;
  try {
    const data = await versionApi.list({ limit: 100 });
    versiones.value = data.data || [];
  } finally {
    loadingVersiones.value = false;
  }
}

function openCreate() {
  isEdit.value = false;
  current.value = { tipo: 'feature', estado: 'en_desarrollo', titulo: '', descripcion: '' };
  formOpen.value = true;
}

function openEdit(row) {
  isEdit.value = true;
  current.value = { ...row };
  formOpen.value = true;
}

function openIntegrar(row) {
  integrarRow.value = row;
  integrarCambios.value = row.cambios || '';
  integrarOpen.value = true;
}

async function confirmIntegrar() {
  integrando.value = true;
  try {
    await controlVersionesApi.integrar(integrarRow.value.consecutivo, {
      cambios: integrarCambios.value,
    });
    integrarOpen.value = false;
    $q.notify({ type: 'positive', message: 'Cambio marcado como integrado' });
    await Promise.all([loadResumen(), reloadCambios()]);
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al integrar' });
  } finally {
    integrando.value = false;
  }
}

function openPublicar() {
  const onlyIntegrados = selectedIntegrados.value.filter((r) => r.estado === 'integrado');
  if (!onlyIntegrados.length) {
    $q.notify({ type: 'warning', message: 'Seleccione cambios en estado integrado' });
    return;
  }
  publicarVersion.value = suggestNextVersion(resumen.value.versionActual);
  publicarResumen.value = onlyIntegrados.map((r) => r.titulo).join('; ');
  publicarChangelog.value = onlyIntegrados
    .map((r) => `- ${r.titulo}: ${r.cambios || r.descripcion || ''}`)
    .join('\n');
  publicarOpen.value = true;
}

function suggestNextVersion(current) {
  const m = String(current || '0.0.0').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return '';
  return `${m[1]}.${Number(m[2]) + 1}.0`;
}

async function confirmPublicar() {
  publicando.value = true;
  try {
    await controlVersionesApi.publicar({
      version: publicarVersion.value.trim(),
      resumen: publicarResumen.value.trim(),
      changelog: publicarChangelog.value.trim(),
      consecutivos: selectedIntegrados.value.map((r) => r.consecutivo),
    });
    publicarOpen.value = false;
    selectedIntegrados.value = [];
    $q.notify({ type: 'positive', message: 'Publicación registrada en el historial' });
    await Promise.all([loadResumen(), reloadCambios(), reloadVersiones()]);
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al publicar' });
  } finally {
    publicando.value = false;
  }
}

async function onSaved() {
  await Promise.all([loadResumen(), reloadCambios()]);
}

onMounted(async () => {
  await loadResumen();
  await Promise.all([reloadCambios(), reloadVersiones()]);
});
</script>
