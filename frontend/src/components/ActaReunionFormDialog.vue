<template>
  <q-dialog
    v-model="open"
    persistent
    :maximized="!isEdit"
    class="actreun-form-dialog"
  >
    <q-card class="actreun-form-card" :class="{ 'actreun-form-card--fullscreen': !isEdit }">
      <div class="actreun-form-card__header">
        <div class="actreun-form-card__header-main">
          <q-icon :name="isEdit ? 'edit_note' : 'groups'" size="18px" class="actreun-form-card__header-icon" />
          <div class="actreun-form-card__header-text">
            <span class="actreun-form-card__eyebrow">{{ isEdit ? 'Edición' : 'Nueva acta' }}</span>
            <span class="actreun-form-card__title">Acta de Reunión con el Cliente</span>
          </div>
        </div>
        <div class="actreun-form-card__meta-inline">
          <span class="actreun-form-card__meta-chip">
            <q-icon name="tag" size="14px" />
            {{ consecutivoLabel }}
          </span>
          <q-badge :color="estadoColor" :label="estadoLabel" class="actreun-form-card__badge" />
        </div>
        <q-space />
        <q-btn
          flat
          dense
          round
          icon="close"
          class="actreun-form-card__close"
          v-close-popup
        />
      </div>

      <q-card-section class="actreun-form-card__body">
        <q-form ref="formRef" class="actreun-form">
          <q-card flat bordered class="actreun-section q-mb-md">
            <q-card-section class="actreun-section__head">
              <q-icon name="event" size="18px" color="primary" />
              <div>
                <div class="actreun-section__title">Datos de la reunión</div>
                <div class="actreun-section__subtitle">Cliente, fecha y metadatos del formato IXIMS-REG-026</div>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4">
                  <q-input
                    v-model="form.fecha"
                    label="Fecha de reunión *"
                    type="date"
                    outlined
                    dense
                    stack-label
                    bg-color="white"
                    :rules="[(v) => !!v || 'Requerido']"
                  />
                </div>
                <div class="col-12 col-md-8">
                  <LookupSelect
                    v-model="form.cliente"
                    resource="clientes"
                    value-field="codigo"
                    label-field="nombrecliente"
                    label="Cliente *"
                    required
                  />
                </div>
                <div class="col-12 col-md-4">
                  <q-input v-model="form.codificacion" label="Codificación" outlined dense stack-label bg-color="white" />
                </div>
                <div class="col-12 col-md-4">
                  <q-input v-model="form.vigencia" label="Vigencia" type="date" outlined dense stack-label bg-color="white" />
                </div>
                <div class="col-12 col-md-4">
                  <q-input v-model="form.version" label="Versión" outlined dense stack-label bg-color="white" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered class="actreun-section q-mb-md">
            <q-card-section class="actreun-section__head">
              <q-icon name="description" size="18px" color="primary" />
              <div>
                <div class="actreun-section__title">Motivo y desarrollo</div>
                <div class="actreun-section__subtitle">Contenido principal que aparecerá en el PDF del acta</div>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section>
              <q-editor
                v-model="form.desarrollo"
                class="actreun-form__editor"
                :min-height="isEdit ? '200px' : '240px'"
                :toolbar="editorToolbar"
                placeholder="Describa el motivo y el desarrollo de la reunión..."
              />
            </q-card-section>
          </q-card>

          <template v-if="!isEdit">
            <q-card flat bordered class="actreun-section q-mb-md">
              <q-card-section class="actreun-section__head">
                <q-icon name="assignment_turned_in" size="18px" color="primary" />
                <div>
                  <div class="actreun-section__title">Compromisos adquiridos</div>
                  <div class="actreun-section__subtitle">
                    Marque «Por el cliente» según corresponda. Responsable desde soporte o funcionarios del cliente.
                  </div>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <ActaReunionCompromisosPanel
                  :cliente="form.cliente"
                  :rows="localCompromisos"
                  local-mode
                  @add="onAddCompromiso"
                  @remove="onRemoveCompromiso"
                  @update="onUpdateCompromiso"
                />
              </q-card-section>
            </q-card>

            <q-card flat bordered class="actreun-section">
              <q-card-section class="actreun-section__head">
                <q-icon name="people" size="18px" color="primary" />
                <div>
                  <div class="actreun-section__title">Asistentes a la reunión</div>
                  <div class="actreun-section__subtitle">
                    Registre participantes de IX Colombia o del cliente. Podrá agregar más después de guardar.
                  </div>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <ActaReunionAsistentesPanel
                  :cliente="form.cliente"
                  :rows="localAsistentes"
                  local-mode
                  @add="onAddAsistente"
                  @remove="onRemoveAsistente"
                />
              </q-card-section>
            </q-card>
          </template>
        </q-form>
      </q-card-section>

      <q-card-actions class="actreun-form-card__actions actreun-form-card__actions--left">
        <q-btn
          flat
          no-caps
          label="Cancelar"
          class="actreun-btn actreun-btn--ghost"
          v-close-popup
        />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="save"
          :label="isEdit ? 'Guardar cambios' : 'Guardar acta'"
          class="actreun-btn actreun-btn--primary"
          :loading="saving"
          :disable="isEdit && record.estado && record.estado !== 'Abierta'"
          @click="save"
        />
        <q-space />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useResource } from 'src/services/api';
import LookupSelect from 'components/LookupSelect.vue';
import ActaReunionCompromisosPanel from 'components/ActaReunionCompromisosPanel.vue';
import ActaReunionAsistentesPanel from 'components/ActaReunionAsistentesPanel.vue';

const props = defineProps({
  modelValue: Boolean,
  record: { type: Object, default: () => ({}) },
  isEdit: Boolean,
});
const emit = defineEmits(['update:modelValue', 'saved']);

const $q = useQuasar();
const api = useResource('actas_reunion');
const compApi = useResource('actas_reunion_compromisos');
const asisApi = useResource('actas_reunion_asistentes');
const formRef = ref(null);
const saving = ref(false);
const localCompromisos = ref([]);
const localAsistentes = ref([]);

const editorToolbar = [
  ['bold', 'italic', 'underline'],
  ['unordered', 'ordered'],
  ['removeFormat'],
];

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const form = ref(emptyForm());

function emptyForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    fecha: today,
    cliente: '',
    codificacion: 'IXIMS-REG-026',
    vigencia: '2012-11-29',
    version: '1',
    desarrollo: '',
  };
}

function toDateInput(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toISOString().slice(0, 10);
}

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return;
    localCompromisos.value = [];
    localAsistentes.value = [];
    if (props.isEdit && props.record?.consecutivo) {
      form.value = {
        fecha: toDateInput(props.record.fecha),
        cliente: props.record.cliente || '',
        codificacion: props.record.codificacion || 'IXIMS-REG-026',
        vigencia: toDateInput(props.record.vigencia) || '2012-11-29',
        version: props.record.version || '1',
        desarrollo: props.record.desarrollo || '',
      };
    } else {
      form.value = emptyForm();
    }
  },
);

const consecutivoLabel = computed(() =>
  props.isEdit && props.record?.consecutivo ? props.record.consecutivo : '(automático)',
);
const estadoLabel = computed(() => props.record?.estado || 'Abierta');
const estadoColor = computed(() => (estadoLabel.value === 'Abierta' ? 'primary' : 'positive'));

function onAddCompromiso(row) {
  localCompromisos.value = [...localCompromisos.value, row];
}

function onRemoveCompromiso(row) {
  localCompromisos.value = localCompromisos.value.filter((r) => r._localId !== row._localId);
}

function onUpdateCompromiso(row) {
  localCompromisos.value = localCompromisos.value.map((r) =>
    (r._localId && r._localId === row._localId) ? { ...r, ...row } : r,
  );
}

function onAddAsistente(row) {
  localAsistentes.value = [...localAsistentes.value, row];
}

function onRemoveAsistente(row) {
  localAsistentes.value = localAsistentes.value.filter((r) => r._localId !== row._localId);
}

async function persistDetalle(consecutivo) {
  let item = 1;
  for (const c of localCompromisos.value) {
    await compApi.create({
      consecutivo,
      item: item++,
      lado: c.lado,
      compromiso: c.compromiso,
      responsable: c.responsable,
      fecha_inicio: c.fecha_inicio || null,
      fecha_entrega: c.fecha_entrega || null,
    });
  }
  item = 1;
  for (const a of localAsistentes.value) {
    await asisApi.create({
      consecutivo,
      item: item++,
      lado: a.lado,
      nombre: a.nombre,
      cargo: a.cargo || '',
      documento: a.documento || null,
      ...(a._soporteCodigo ? { _soporteCodigo: a._soporteCodigo } : {}),
      ...(a.lado === 'cliente' && a.documento ? { _funcionarioDocumento: a.documento } : {}),
    });
  }
}

async function save() {
  const ok = await formRef.value?.validate();
  if (!ok) return;
  saving.value = true;
  try {
    const payload = { ...form.value };
    if (props.isEdit) {
      await api.update(props.record.consecutivo, payload);
      $q.notify({ type: 'positive', message: 'Acta actualizada' });
    } else {
      const created = await api.create(payload);
      const consecutivo = created.consecutivo;
      if (localCompromisos.value.length || localAsistentes.value.length) {
        await persistDetalle(consecutivo);
      }
      $q.notify({ type: 'positive', message: 'Acta creada' });
    }
    emit('saved');
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al guardar' });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.actreun-form-card {
  width: min(980px, 96vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
}

.actreun-form-card--fullscreen {
  width: 100%;
  max-height: 100vh;
  height: 100vh;
  border-radius: 0;
}

.actreun-form-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  min-height: 52px;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
  color: #fff;
  flex-shrink: 0;
}

.actreun-form-card__header-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.actreun-form-card__header-icon {
  opacity: 0.95;
}

.actreun-form-card__header-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.actreun-form-card__eyebrow {
  font-size: 10px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.actreun-form-card__title {
  font-size: 15px;
  font-weight: 600;
}

.actreun-form-card__meta-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.actreun-form-card__meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
}

.actreun-form-card__badge {
  font-size: 10px;
}

.actreun-form-card__close {
  color: #fff;
}

.actreun-form-card__body {
  overflow-y: auto;
  flex: 1;
  padding: 16px 20px;
  background: #f4f6f9;
}

.actreun-form-card--fullscreen .actreun-form-card__body {
  padding: 20px 28px 24px;
}

.actreun-section {
  border-radius: 10px !important;
  border-color: #dce3eb !important;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.actreun-section__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px !important;
}

.actreun-section__title {
  font-size: 13px;
  font-weight: 600;
  color: #263238;
}

.actreun-section__subtitle {
  font-size: 11px;
  color: #78909c;
  margin-top: 2px;
}

.actreun-form__editor {
  border: 1px solid #dce3eb;
  border-radius: 8px;
  overflow: hidden;
}

.actreun-form-card__actions {
  padding: 12px 20px;
  border-top: 1px solid #e8edf2;
  background: #fff;
  flex-shrink: 0;
  gap: 10px;
}

.actreun-form-card__actions--left {
  justify-content: flex-start;
}

.actreun-btn {
  min-width: 120px;
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.01em;
}

.actreun-btn--ghost {
  color: #546e7a;
  border: 1px solid #cfd8dc;
}

.actreun-btn--ghost:hover {
  background: #f5f7fa;
}

.actreun-btn--primary {
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.28);
}
</style>
