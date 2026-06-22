<template>
  <q-dialog v-model="open" persistent class="generic-form-dialog">
    <q-card class="generic-form-card" :style="cardStyle">
      <div class="generic-form-card__header">
        <div class="generic-form-card__header-icon">
          <q-icon :name="isEdit ? 'edit_note' : 'add_circle'" size="22px" />
        </div>
        <div>
          <p class="generic-form-card__eyebrow">{{ isEdit ? 'Edición' : 'Nuevo registro' }}</p>
          <h2 class="generic-form-card__title">{{ module.title }}</h2>
        </div>
        <q-space />
        <q-btn flat dense round icon="close" class="generic-form-card__close" v-close-popup />
      </div>

      <q-card-section class="generic-form-card__body scroll">
        <q-form ref="formRef" class="generic-form">
          <div class="row q-col-gutter-md">
            <div v-for="f in visibleFields" :key="f.name" :class="fieldColClass(f)">
              <q-input
                v-if="f.type === 'textarea'"
                v-model="form[f.name]"
                :label="f.label"
                type="textarea"
                autogrow
                outlined
                dense
                class="generic-form__field"
                bg-color="white"
              />
              <LookupSelect
                v-else-if="f.type === 'lookup'"
                v-model="form[f.name]"
                :resource="f.lookupResource"
                :value-field="f.lookupValue || 'codigo'"
                :label-field="f.lookupLabel || 'nombrecliente'"
                :lookup-code-field="f.lookupCodeField || ''"
                :label="f.label"
                :required="f.required"
                :disable="isFieldDisabled(f)"
                :extra-params="lookupParams(f)"
                class="generic-form__field"
                @pick="(row) => onLookupPick(f, row)"
              />
              <ContactosDialogField
                v-else-if="f.type === 'contactosDialog'"
                v-model="form[f.name]"
                :label="f.label"
                :hint="f.dialogHint || ''"
                :icon="f.dialogIcon || 'groups'"
                :tone="f.tone || 'equipo'"
                :legacy-email="f.syncEmail ? form.email : ''"
                :legacy-nombre="f.syncEmail ? form.nombrecliente : ''"
                @update:email="(v) => { if (f.syncEmail) form.email = v; }"
              />
              <q-select
                v-else-if="f.type === 'select'"
                v-model="form[f.name]"
                :label="f.label"
                :options="f.options || []"
                outlined
                dense
                clearable
                class="generic-form__field"
                bg-color="white"
                :disable="isFieldDisabled(f)"
              />
              <q-input
                v-else-if="f.type === 'email'"
                v-model="form[f.name]"
                :label="f.label"
                type="email"
                outlined
                dense
                class="generic-form__field"
                bg-color="white"
                :disable="isFieldDisabled(f)"
                :rules="emailRules(f)"
              />
              <q-input
                v-else-if="f.type === 'number'"
                v-model.number="form[f.name]"
                :label="f.label"
                type="number"
                outlined
                dense
                class="generic-form__field"
                bg-color="white"
                :disable="isFieldDisabled(f)"
                :rules="f.required ? [(v) => v !== '' && v != null || 'Requerido'] : []"
              />
              <q-input
                v-else-if="f.type === 'date'"
                v-model="form[f.name]"
                :label="dateFieldLabel(f)"
                type="date"
                outlined
                dense
                stack-label
                class="generic-form__field"
                bg-color="white"
                :disable="isFieldDisabled(f)"
                :min="dateBounds(f).min"
                :max="dateBounds(f).max"
                :rules="dateRules(f)"
              />
              <q-input
                v-else
                v-model="form[f.name]"
                :label="f.label"
                outlined
                dense
                class="generic-form__field"
                bg-color="white"
                :disable="isFieldDisabled(f)"
                :rules="f.required ? [(v) => !!v || 'Requerido'] : []"
              />
            </div>
          </div>
        </q-form>
      </q-card-section>

      <q-card-actions class="generic-form-card__actions">
        <q-space />
        <q-btn flat label="Cancelar" class="generic-form-card__btn-cancel" v-close-popup />
        <q-btn
          unelevated
          color="primary"
          icon="save"
          label="Guardar"
          class="generic-form-card__btn-save"
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
import ContactosDialogField from 'components/ContactosDialogField.vue';

const props = defineProps({
  modelValue: Boolean,
  module: { type: Object, required: true },
  record: { type: Object, default: () => ({}) },
  isEdit: Boolean,
  context: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['update:modelValue', 'saved']);

const $q = useQuasar();
const formRef = ref(null);
const form = ref({});
const saving = ref(false);

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const cardStyle = computed(() => {
  const cols = props.module.formCols || 1;
  if (cols >= 3) return { minWidth: '720px', maxWidth: '95vw' };
  return { minWidth: '480px', maxWidth: '90vw' };
});

const pkFields = computed(() => {
  const id = props.module.idField;
  return Array.isArray(id) ? id : [id];
});

const visibleFields = computed(() =>
  props.module.fields.filter(
    (f) => !f.hidden && !(f.hideOnCreate && !props.isEdit),
  ),
);

function lookupParams(f) {
  const params = { ...(f.lookupExtraParams || {}) };
  if (f.lookupContextKeys) {
    for (const [param, ctxKey] of Object.entries(f.lookupContextKeys)) {
      const fromContext = props.context?.[ctxKey];
      const fromForm = form.value[ctxKey];
      const val = fromContext !== undefined && fromContext !== '' ? fromContext : fromForm;
      if (val !== undefined && val !== '') {
        params[param] = val;
      }
    }
  }
  return params;
}

function onLookupPick(f, row) {
  if (!f.fillFrom || !row) return;
  for (const [target, source] of Object.entries(f.fillFrom)) {
    form.value[target] = row[source] ?? '';
  }
}

function isPk(name) {
  return pkFields.value.includes(name);
}

function isFieldDisabled(f) {
  if (f.fixed || f.disabled) return true;
  if (f.lookupRequires && !form.value[f.lookupRequires]) return true;
  return props.isEdit && isPk(f.name);
}

function emailRules(f) {
  const rules = [(v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido'];
  if (f.required) rules.unshift((v) => !!v || 'Requerido');
  return rules;
}

function dateBounds(f) {
  if (!f.dateContextKeys || !props.context) return { min: undefined, max: undefined };
  const min = props.context[f.dateContextKeys.min];
  const max = props.context[f.dateContextKeys.max];
  return {
    min: min ? toDateKey(min) : undefined,
    max: max ? toDateKey(max) : undefined,
  };
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

function dateFieldLabel(f) {
  const { min, max } = dateBounds(f);
  if (min && max) return `${f.label} (${min} — ${max})`;
  return f.label;
}

function dateRules(f) {
  const rules = [];
  if (f.required) rules.push((v) => !!v || 'Requerido');
  const { min, max } = dateBounds(f);
  if (min && max) {
    rules.push((v) => !v || (v >= min && v <= max) || `Debe estar entre ${min} y ${max}`);
  }
  return rules;
}

function fieldColClass(f) {
  if (f.type === 'textarea') return 'col-12';
  if (f.type === 'contactosDialog') return 'col-12 col-md-6';
  const cols = props.module.formCols || 1;
  const span = f.colSpan || 1;
  if (cols === 4) {
    const md = Math.min(12, 3 * span);
    return `col-12 col-sm-6 col-md-${md}`;
  }
  if (cols === 3) {
    const md = Math.min(12, 4 * span);
    return `col-12 col-sm-6 col-md-${md}`;
  }
  return 'col-12';
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      const base = {};
      for (const f of props.module.fields) {
        if (f.hidden) continue;
        if (f.type === 'date') {
          if (props.record[f.name]) {
            base[f.name] = toDateKey(props.record[f.name]);
          } else if (!props.isEdit && (f.defaultToday || f.default === 'today')) {
            base[f.name] = todayISO();
          } else {
            base[f.name] = '';
          }
        } else if (f.type === 'select' && !props.isEdit && f.default && props.record[f.name] === undefined) {
          base[f.name] = f.default;
        } else {
          base[f.name] = props.record[f.name] ?? '';
        }
      }
      form.value = base;
    }
  },
);

watch(
  () => form.value.cliente,
  (val, prev) => {
    if (prev && val !== prev) {
      for (const f of props.module.fields) {
        if (f.lookupRequires === 'cliente' && f.name !== 'cliente') {
          form.value[f.name] = '';
        }
      }
    }
  },
);

async function save() {
  const valid = await formRef.value.validate();
  if (!valid) return;

  saving.value = true;
  try {
    const api = useResource(props.module.resource);
    const payload = { ...form.value };
    let saved;
    if (props.isEdit) {
      const id = pkFields.value.map((f) => props.record[f]).join('~');
      saved = await api.update(id, payload);
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
.generic-form-card {
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18);
}

.generic-form-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
  color: #fff;
}

.generic-form-card__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.generic-form-card__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.generic-form-card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.2;
}

.generic-form-card__close {
  color: rgba(255, 255, 255, 0.9);
}

.generic-form-card__body {
  max-height: 70vh;
  padding: 20px;
  background: #f8fafc;
}

.generic-form__field :deep(.q-field__control) {
  border-radius: 8px;
}

.generic-form__field :deep(.q-field--outlined .q-field__control:before) {
  border-color: #cbd5e1;
}

.generic-form__field :deep(.q-field--focused .q-field__control:before) {
  border-color: #1565c0;
}

.generic-form-card__actions {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  gap: 8px;
}

.generic-form-card__btn-cancel {
  border-radius: 8px;
  color: #64748b;
}

.generic-form-card__btn-save {
  border-radius: 8px;
  padding: 8px 20px;
  font-weight: 500;
}
</style>
