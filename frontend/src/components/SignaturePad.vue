<template>
  <div class="signature-pad">
    <div class="text-subtitle2 q-mb-sm">{{ titulo }}</div>
    <div ref="frameRef" class="signature-pad__frame" :style="{ width, height }">
      <canvas
        ref="canvasRef"
        class="signature-pad__canvas"
        @mousedown="startDraw"
        @mousemove="draw"
        @mouseup="endDraw"
        @mouseleave="endDraw"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend.prevent="endDraw"
      />
    </div>
    <div class="row q-gutter-sm q-mt-sm justify-end items-center">
      <q-btn
        v-if="allowUpload"
        flat
        icon="upload_file"
        color="primary"
        label="Subir imagen"
        @click="triggerUpload"
      />
      <q-btn flat icon="delete" color="orange" label="Limpiar" @click="clear" />
      <q-btn v-if="showCancel" flat icon="close" color="grey" label="Cancelar" @click="$emit('cancel')" />
      <q-btn unelevated icon="check" color="primary" label="Guardar firma" @click="save" />
    </div>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/jpg"
      class="signature-pad__file-input"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';

const props = defineProps({
  titulo: { type: String, default: 'Diligencie su firma' },
  width: { type: String, default: '100%' },
  height: { type: String, default: '220px' },
  existingImage: { type: String, default: '' },
  showCancel: { type: Boolean, default: true },
  allowUpload: { type: Boolean, default: false },
});

const emit = defineEmits(['save', 'cancel']);

const $q = useQuasar();
const frameRef = ref(null);
const canvasRef = ref(null);
const fileInputRef = ref(null);
let ctx = null;
let drawing = false;
let hasStroke = false;
let resizeObserver = null;
let resizeTimer = null;
let lastSize = { w: 0, h: 0 };

function frameSize() {
  const frame = frameRef.value;
  if (!frame) return null;
  const w = Math.floor(frame.clientWidth);
  const h = Math.floor(frame.clientHeight);
  if (w < 20 || h < 20) return null;
  return { w, h };
}

function setupCanvas() {
  const canvas = canvasRef.value;
  const size = frameSize();
  if (!canvas || !size) return;

  const { w, h } = size;
  if (w === lastSize.w && h === lastSize.h && ctx) return;
  lastSize = { w, h };

  const ratio = window.devicePixelRatio || 1;
  canvas.width = w * ratio;
  canvas.height = h * ratio;

  ctx = canvas.getContext('2d', { alpha: false });
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  hasStroke = false;

  if (props.existingImage) {
    loadImage(props.existingImage, w, h);
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  }
}

function loadImage(src, w, h) {
  if (!ctx || !src) return;
  const img = new Image();
  img.onload = () => {
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    hasStroke = true;
  };
  img.onerror = () => {
    $q.notify({ type: 'negative', message: 'No se pudo cargar la imagen de firma' });
  };
  img.src = src;
}

function scheduleSetup() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    setupCanvas();
  }, 80);
}

function pos(event) {
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function touchPos(event) {
  const t = event.touches[0] || event.changedTouches[0];
  return pos(t);
}

function startDraw(e) {
  drawing = true;
  const p = pos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
}

function draw(e) {
  if (!drawing) return;
  hasStroke = true;
  const p = pos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function endDraw() {
  drawing = false;
}

function onTouchStart(e) {
  drawing = true;
  const p = touchPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
}

function onTouchMove(e) {
  if (!drawing) return;
  hasStroke = true;
  const p = touchPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function clear() {
  lastSize = { w: 0, h: 0 };
  setupCanvas();
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function save() {
  if (!hasStroke) {
    $q.notify({ type: 'warning', message: 'Debe diligenciar la firma antes de guardar' });
    return;
  }
  const data = canvasRef.value.toDataURL('image/png');
  emit('save', data);
}

function triggerUpload() {
  fileInputRef.value?.click();
}

function onFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/^image\/(jpe?g|png)$/i.test(file.type)) {
    $q.notify({ type: 'warning', message: 'Use una imagen PNG o JPG' });
    event.target.value = '';
    return;
  }
  if (file.size > 500000) {
    $q.notify({ type: 'warning', message: 'La imagen no debe superar 500 KB' });
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const size = frameSize();
    if (!size) return;
    loadImage(String(reader.result), size.w, size.h);
  };
  reader.onerror = () => {
    $q.notify({ type: 'negative', message: 'No se pudo leer el archivo' });
  };
  reader.readAsDataURL(file);
}

watch(
  () => props.existingImage,
  () => {
    lastSize = { w: 0, h: 0 };
    scheduleSetup();
  },
);

onMounted(async () => {
  await nextTick();
  scheduleSetup();
  if (frameRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleSetup);
    resizeObserver.observe(frameRef.value);
  }
});

onBeforeUnmount(() => {
  clearTimeout(resizeTimer);
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.signature-pad__frame {
  max-width: 100%;
  border: 1px solid #333;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;
}

.signature-pad__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.signature-pad__file-input {
  display: none;
}
</style>
