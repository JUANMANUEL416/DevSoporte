<template>
  <div class="image-gallery-field">
    <div class="image-gallery-field__header">
      <div>
        <div class="image-gallery-field__label">{{ label }}</div>
        <p v-if="hint" class="image-gallery-field__hint">{{ hint }}</p>
      </div>
      <q-btn
        flat
        dense
        color="primary"
        icon="add_photo_alternate"
        label="Agregar"
        :disable="disabled || items.length >= maxCount"
        @click="pickFiles"
      />
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      class="image-gallery-field__input"
      @change="onFilesSelected"
    />

    <div v-if="!items.length" class="image-gallery-field__empty">
      Sin imágenes. Puede adjuntar capturas o fotos del trabajo realizado (máx. {{ maxCount }}, 1 MB c/u).
    </div>

    <div v-else class="image-gallery-field__grid">
      <figure v-for="(item, index) in items" :key="index" class="image-gallery-field__item">
        <img :src="item.data" :alt="item.nombre" class="image-gallery-field__thumb" />
        <figcaption class="image-gallery-field__caption">{{ item.nombre }}</figcaption>
        <q-btn
          flat
          dense
          round
          size="sm"
          color="negative"
          icon="close"
          class="image-gallery-field__remove"
          :disable="disabled"
          @click="removeAt(index)"
        />
      </figure>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useQuasar } from 'quasar';

const props = defineProps({
  modelValue: { type: [String, Array], default: '' },
  label: { type: String, default: 'Imágenes de soporte' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  maxCount: { type: Number, default: 5 },
  maxBytes: { type: Number, default: 1024 * 1024 },
});

const emit = defineEmits(['update:modelValue']);

const $q = useQuasar();
const fileInput = ref(null);
const items = ref([]);

function parseValue(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function emitValue() {
  emit('update:modelValue', items.value.length ? JSON.stringify(items.value) : '');
}

watch(
  () => props.modelValue,
  (val) => {
    items.value = parseValue(val);
  },
  { immediate: true },
);

function pickFiles() {
  if (props.disabled) return;
  fileInput.value?.click();
}

function removeAt(index) {
  items.value = items.value.filter((_, i) => i !== index);
  emitValue();
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      nombre: file.name,
      tipo: file.type,
      data: reader.result,
    });
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function onFilesSelected(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;

  const remaining = props.maxCount - items.value.length;
  if (remaining <= 0) {
    $q.notify({ type: 'warning', message: `Máximo ${props.maxCount} imágenes` });
    return;
  }

  const toAdd = files.slice(0, remaining);
  for (const file of toAdd) {
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      $q.notify({ type: 'warning', message: `${file.name}: use JPG, PNG o WebP` });
      continue;
    }
    if (file.size > props.maxBytes) {
      $q.notify({ type: 'warning', message: `${file.name}: supera 1 MB` });
      continue;
    }
    try {
      const item = await readFile(file);
      items.value.push(item);
    } catch {
      $q.notify({ type: 'negative', message: `Error al cargar ${file.name}` });
    }
  }

  emitValue();
}
</script>

<style scoped>
.image-gallery-field {
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
}

.image-gallery-field__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.image-gallery-field__label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.image-gallery-field__hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
}

.image-gallery-field__input {
  display: none;
}

.image-gallery-field__empty {
  font-size: 13px;
  color: #64748b;
  padding: 8px 0;
}

.image-gallery-field__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.image-gallery-field__item {
  position: relative;
  margin: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

.image-gallery-field__thumb {
  display: block;
  width: 100%;
  height: 110px;
  object-fit: cover;
}

.image-gallery-field__caption {
  padding: 6px 8px;
  font-size: 11px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-gallery-field__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(255, 255, 255, 0.92);
}
</style>
