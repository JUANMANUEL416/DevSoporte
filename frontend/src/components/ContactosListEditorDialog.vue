<template>
  <q-dialog v-model="open" persistent>
    <q-card class="contactos-editor-dialog">
      <div class="contactos-editor-dialog__header" :class="headerToneClass">
        <div class="contactos-editor-dialog__header-icon">
          <q-icon :name="icon" size="20px" />
        </div>
        <div class="contactos-editor-dialog__header-text">
          <h2 class="contactos-editor-dialog__title">
            {{ title }}
            <span v-if="hint" class="contactos-editor-dialog__hint">{{ hint }}</span>
          </h2>
        </div>
        <q-space />
        <q-btn
          unelevated
          no-caps
          dense
          icon="person_add"
          label="Agregar contacto"
          class="contactos-editor-dialog__add-btn"
          @click="addRow"
        />
        <q-btn flat dense round icon="close" class="contactos-editor-dialog__close" v-close-popup @click="cancel" />
      </div>

      <q-card-section class="contactos-editor-dialog__body">
        <div v-if="!draft.length" class="contactos-editor-dialog__empty">
          No hay contactos. Use «Agregar» para crear uno.
        </div>

        <div v-else class="contactos-editor-dialog__grid">
          <div v-for="(c, idx) in draft" :key="c.id" class="contactos-editor-dialog__card" :class="cardToneClass">
            <q-input
              v-model="c.nombre"
              label="Nombre"
              outlined
              dense
              bg-color="white"
              class="contactos-editor-dialog__field"
            />
            <q-input
              v-model="c.cargo"
              label="Cargo"
              outlined
              dense
              bg-color="white"
              class="contactos-editor-dialog__field"
            />
            <q-input
              v-model="c.email"
              label="Correo"
              type="email"
              outlined
              dense
              bg-color="white"
              class="contactos-editor-dialog__field"
              :rules="emailRules"
            />
            <div class="contactos-editor-dialog__card-footer">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                icon="delete"
                label="Quitar"
                class="contactos-editor-dialog__delete"
                @click="removeRow(idx)"
              />
            </div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions class="contactos-editor-dialog__actions">
        <q-space />
        <q-btn flat no-caps label="Cancelar" class="contactos-editor-dialog__btn-cancel" @click="cancel" />
        <q-btn unelevated no-caps color="primary" label="Aplicar cambios" class="contactos-editor-dialog__btn-save" @click="apply" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { parseContactosJson, buildContactosJson } from 'src/utils/contactosJson';

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  jsonValue: { type: String, default: '' },
  icon: { type: String, default: 'groups' },
  tone: { type: String, default: 'equipo' },
});

const emit = defineEmits(['update:modelValue', 'save']);

const open = ref(false);
const draft = ref([]);

const headerToneClass = computed(() => `contactos-editor-dialog__header--${props.tone}`);
const cardToneClass = computed(() => `contactos-editor-dialog__card--${props.tone}`);

const emailRules = [
  (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Correo inválido',
];

watch(
  () => props.modelValue,
  (val) => {
    open.value = val;
    if (val) {
      draft.value = parseContactosJson(props.jsonValue).map((c) => ({ ...c }));
    }
  },
);

watch(open, (val) => {
  emit('update:modelValue', val);
});

function addRow() {
  draft.value.push({
    id: `c-${Date.now()}`,
    nombre: '',
    cargo: '',
    email: '',
  });
}

function removeRow(idx) {
  draft.value.splice(idx, 1);
}

function cancel() {
  open.value = false;
}

function apply() {
  const { json } = buildContactosJson(draft.value);
  emit('save', json);
  open.value = false;
}
</script>

<style scoped lang="scss">
.contactos-editor-dialog {
  width: 96vw;
  max-width: 1920px;
  min-height: 82vh;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 56px rgba(15, 23, 42, 0.22);
}

.contactos-editor-dialog__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: #fff;

  &--equipo {
    background: linear-gradient(135deg, #ffb300 0%, #f57c00 100%);
  }

  &--cliente {
    background: linear-gradient(135deg, #5c6bc0 0%, #3949ab 100%);
  }
}

.contactos-editor-dialog__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.28);
  flex-shrink: 0;
}

.contactos-editor-dialog__header-text {
  min-width: 0;
  flex: 1;
}

.contactos-editor-dialog__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.contactos-editor-dialog__hint {
  font-size: 0.74rem;
  font-weight: 400;
  opacity: 0.9;

  &::before {
    content: '·';
    margin: 0 6px;
    opacity: 0.7;
  }
}

.contactos-editor-dialog__close {
  color: rgba(255, 255, 255, 0.92);
}

.contactos-editor-dialog__add-btn {
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.95);
  color: #1e293b;

  &:hover {
    background: #fff;
  }
}

.contactos-editor-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  background: linear-gradient(180deg, #f1f5f9 0%, #f8fafc 100%);
  padding: 16px 20px;
}

.contactos-editor-dialog__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.contactos-editor-dialog__card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 10px;
  border-radius: 12px;
  background: #fff;
  min-width: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &--equipo {
    border: 1px solid #ffe082;
    box-shadow: 0 2px 8px rgba(245, 124, 0, 0.08);

    &::before {
      background: linear-gradient(180deg, #ffb300 0%, #ffa000 100%);
    }
  }

  &--cliente {
    border: 1px solid #c5cae9;
    box-shadow: 0 2px 8px rgba(57, 73, 171, 0.08);

    &::before {
      background: linear-gradient(180deg, #5c6bc0 0%, #3949ab 100%);
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: 0;
    width: 4px;
    border-radius: 0 4px 4px 0;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.1);
  }
}

.contactos-editor-dialog__card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 8px;
  padding-left: 8px;
  border-top: 1px solid #f1f5f9;
}

.contactos-editor-dialog__delete {
  color: #ef4444;
  border-radius: 6px;
  opacity: 0.85;
  transition: opacity 0.15s ease, background 0.15s ease;

  &:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.08);
  }
}

.contactos-editor-dialog__field + .contactos-editor-dialog__field {
  margin-top: 8px;
}

.contactos-editor-dialog__field :deep(.q-field__control) {
  border-radius: 8px;
}

.contactos-editor-dialog__field :deep(.q-field--outlined .q-field__control:before) {
  border-color: #cbd5e1;
}

.contactos-editor-dialog__field :deep(.q-field--focused .q-field__control:before) {
  border-color: #1565c0;
}

.contactos-editor-dialog__empty {
  padding: 28px 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  text-align: center;
  font-size: 0.84rem;
  color: #94a3b8;
  background: #fff;
}

.contactos-editor-dialog__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  gap: 8px;
}

.contactos-editor-dialog__btn-cancel {
  border-radius: 8px;
  color: #64748b;
}

.contactos-editor-dialog__btn-save {
  border-radius: 8px;
  padding: 8px 18px;
  font-weight: 500;
}

@media (max-width: 1100px) {
  .contactos-editor-dialog__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .contactos-editor-dialog__grid {
    grid-template-columns: 1fr;
  }
}
</style>
