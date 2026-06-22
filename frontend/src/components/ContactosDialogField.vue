<template>
  <div class="contactos-dialog-field" :class="toneClass">
    <div class="contactos-dialog-field__head">
      <q-icon :name="icon" size="20px" />
      <div>
        <div class="contactos-dialog-field__title">{{ label }}</div>
        <div class="contactos-dialog-field__summary">{{ summary }}</div>
      </div>
    </div>
    <q-btn
      unelevated
      no-caps
      color="primary"
      icon="edit"
      label="Gestionar"
      class="contactos-dialog-field__btn"
      @click="dialogOpen = true"
    />

    <ContactosListEditorDialog
      v-model="dialogOpen"
      :title="label"
      :hint="hint"
      :icon="icon"
      :tone="tone"
      :json-value="modelValue"
      @save="onSave"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ContactosListEditorDialog from 'components/ContactosListEditorDialog.vue';
import { parseContactosJson, buildContactosJson } from 'src/utils/contactosJson';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  icon: { type: String, default: 'groups' },
  tone: { type: String, default: 'equipo' },
  legacyEmail: { type: String, default: '' },
  legacyNombre: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'update:email']);

const dialogOpen = ref(false);

const summary = computed(() => {
  const list = parseContactosJson(props.modelValue, props.legacyEmail, props.legacyNombre);
  if (!list.length) return 'Sin contactos';
  if (list.length === 1) return list[0].nombre || list[0].email || '1 contacto';
  return `${list.length} contactos`;
});

const toneClass = computed(() => `contactos-dialog-field--${props.tone}`);

function onSave(json) {
  emit('update:modelValue', json);
  if (props.tone === 'equipo') {
    const { firstEmail } = buildContactosJson(
      json ? JSON.parse(json) : [],
    );
    emit('update:email', firstEmail);
  }
}
</script>

<style scoped lang="scss">
.contactos-dialog-field {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 132px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;

  &--equipo {
    background: linear-gradient(180deg, #fffdf7 0%, #ffffff 100%);
    border-color: #ffe082;
  }

  &--cliente {
    background: linear-gradient(180deg, #fafbff 0%, #ffffff 100%);
    border-color: #c5cae9;
  }
}

.contactos-dialog-field__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
}

.contactos-dialog-field__title {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1e293b;
}

.contactos-dialog-field__summary {
  margin-top: 4px;
  font-size: 0.76rem;
  color: #64748b;
}

.contactos-dialog-field__btn {
  align-self: flex-start;
  border-radius: 8px;
}
</style>
