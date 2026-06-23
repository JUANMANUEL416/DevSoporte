<template>
  <q-dialog v-model="open" persistent class="actproy-form-dialog">
    <q-card class="actproy-form-card">
      <div class="actproy-form-card__header">
        <div class="actproy-form-card__header-icon">
          <q-icon :name="isEdit ? 'edit_note' : 'add_circle'" size="22px" />
        </div>
        <div>
          <p class="actproy-form-card__eyebrow">{{ isEdit ? 'Edición' : 'Nuevo informe' }}</p>
          <h2 class="actproy-form-card__title">Informe de Actividades</h2>
        </div>
        <q-space />
        <q-btn flat dense round icon="close" class="actproy-form-card__close" v-close-popup />
      </div>

      <q-card-section class="actproy-form-card__meta">
        <div class="actproy-form-card__meta-item">
          <span class="actproy-form-card__meta-label">Consecutivo</span>
          <span class="actproy-form-card__meta-value">{{ consecutivoLabel }}</span>
        </div>
        <div class="actproy-form-card__meta-item">
          <span class="actproy-form-card__meta-label">Estado</span>
          <q-badge :color="estadoColor" :label="estadoLabel" />
        </div>
      </q-card-section>

      <q-card-section class="actproy-form-card__body">
        <q-form ref="formRef" class="actproy-form">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.fecha"
                label="Fecha de soporte *"
                type="date"
                outlined
                dense
                stack-label
                bg-color="white"
                :rules="[(v) => !!v || 'Requerido']"
              />
            </div>
            <div class="col-12 col-md-4">
              <LookupSelect
                v-model="form.cliente"
                resource="clientes"
                value-field="codigo"
                label-field="nombrecliente"
                label="Proyecto / Cliente *"
                required
                @pick="onClientePick"
              />
            </div>
            <div class="col-12 col-md-4">
              <LookupSelect
                v-model="form.ingeniero"
                resource="soportes"
                value-field="nombre"
                label-field="nombre"
                lookup-code-field="codigo"
                label="Ingeniero de soporte"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="actproy-form__editor-label">Actividades realizadas</div>
              <q-editor
                v-model="form.actividades"
                class="actproy-form__editor"
                min-height="220px"
                :toolbar="editorToolbar"
                placeholder="Describa las actividades realizadas..."
              />
            </div>
            <div class="col-12 col-md-6">
              <div class="actproy-form__editor-label">Actividades pendientes</div>
              <q-editor
                v-model="form.pendientes"
                class="actproy-form__editor"
                min-height="220px"
                :toolbar="editorToolbar"
                placeholder="Describa las actividades pendientes..."
              />
            </div>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions class="actproy-form-card__actions">
        <q-space />
        <q-btn flat label="Cancelar" class="actproy-form-card__btn-cancel" v-close-popup />
        <q-btn
          unelevated
          color="primary"
          icon="save"
          label="Guardar"
          class="actproy-form-card__btn-save"
          :loading="saving"
          @click="save"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useResource } from 'src/services/api';
import LookupSelect from 'components/LookupSelect.vue';

const props = defineProps({
  modelValue: Boolean,
  record: { type: Object, default: () => ({}) },
  isEdit: Boolean,
});
const emit = defineEmits(['update:modelValue', 'saved']);

const $q = useQuasar();
const formRef = ref(null);
const saving = ref(false);
const form = ref(emptyForm());

const editorToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['unordered', 'ordered'],
  ['undo', 'redo'],
  ['removeFormat'],
];

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const consecutivoLabel = computed(() => {
  if (props.isEdit && props.record?.consecutivo) return props.record.consecutivo;
  return 'Se asignará al guardar';
});

const estadoLabel = computed(() => props.record?.estado || 'Abierto');

const estadoColor = computed(() => {
  const e = String(estadoLabel.value || '').toLowerCase();
  if (e === 'cerrado') return 'grey-7';
  return 'blue-7';
});

function emptyForm() {
  return {
    fecha: '',
    cliente: '',
    ciudad: '',
    ingeniero: '',
    actividades: '',
    pendientes: '',
  };
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function onClientePick(row) {
  if (row?.ciudad) form.value.ciudad = row.ciudad;
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return;
    form.value = {
      ...emptyForm(),
      fecha: props.isEdit ? toDateKey(props.record.fecha) : todayISO(),
      cliente: props.record.cliente ?? '',
      ciudad: props.record.ciudad ?? '',
      ingeniero: props.record.ingeniero ?? '',
      actividades: props.record.actividades ?? '',
      pendientes: props.record.pendientes ?? '',
    };
  },
);

async function save() {
  const valid = await formRef.value?.validate();
  if (!valid) return;

  saving.value = true;
  try {
    const api = useResource('actividades_proyecto');
    const payload = { ...form.value };
    let saved;
    if (props.isEdit) {
      saved = await api.update(props.record.consecutivo, payload);
    } else {
      saved = await api.create(payload);
    }
    $q.notify({ type: 'positive', message: 'Registro guardado' });
    emit('saved', saved);
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al guardar' });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="scss">
.actproy-form-card {
  width: 960px;
  max-width: 96vw;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18);
}

.actproy-form-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
  color: #fff;
}

.actproy-form-card__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.actproy-form-card__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.actproy-form-card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.2;
}

.actproy-form-card__close {
  color: rgba(255, 255, 255, 0.9);
}

.actproy-form-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px 32px;
  padding: 12px 20px;
  background: #eef2ff;
  border-bottom: 1px solid #dbeafe;
}

.actproy-form-card__meta-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.actproy-form-card__meta-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.actproy-form-card__meta-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: #1e293b;
}

.actproy-form-card__body {
  padding: 20px;
  background: #f8fafc;
}

.actproy-form__editor-label {
  margin-bottom: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #475569;
}

.actproy-form__editor {
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.actproy-form__editor :deep(.q-editor__content) {
  min-height: 220px;
  font-size: 0.9rem;
  line-height: 1.55;
}

.actproy-form-card__actions {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  gap: 8px;
}

.actproy-form-card__btn-cancel {
  border-radius: 8px;
  color: #64748b;
}

.actproy-form-card__btn-save {
  border-radius: 8px;
  padding: 8px 20px;
  font-weight: 500;
}
</style>
