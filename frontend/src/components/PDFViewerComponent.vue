<template>
  <q-dialog v-model="open" transition-show="flip-down" transition-hide="flip-up" full-width @hide="onHide">
    <q-card class="bg-grey-9 text-white" style="border-radius: 10px">
      <q-bar class="bg-primary krytitlebar">
        <q-btn-toggle
          v-model="viewMode"
          push
          glossy
          no-caps
          toggle-color="secondary"
          dense
          :options="[
            { label: 'Paginado', value: 'paged', icon: 'article' },
            { label: 'Scroll', value: 'scroll', icon: 'view_agenda' },
          ]"
        />

        <q-separator vertical inset class="q-mx-sm" />

        <q-breadcrumbs
          v-if="numPages && viewMode === 'paged'"
          active-color="white"
          style="font-size: 16px"
        >
          <q-breadcrumbs-el :label="String(currentPage)" icon="description" />
          <q-breadcrumbs-el :label="String(numPages)" />
        </q-breadcrumbs>

        <div v-if="numPages && viewMode === 'scroll'" class="text-body2">
          <q-icon name="description" size="sm" class="q-mr-xs" />
          {{ numPages }} {{ numPages === 1 ? 'página' : 'páginas' }}
        </div>

        <q-btn-group push class="q-ml-sm" v-if="viewMode === 'paged'">
          <q-btn icon="keyboard_arrow_up" :disable="currentPage <= 1" @click="currentPage--" />
          <q-btn icon="keyboard_arrow_down" :disable="currentPage >= numPages" @click="currentPage++" />
        </q-btn-group>

        <q-separator vertical inset class="q-mx-sm" />

        <q-btn-group push>
          <q-btn icon="zoom_in" @click="scale += 0.1">
            <q-tooltip>Acercar</q-tooltip>
          </q-btn>
          <q-btn icon="zoom_out" :disable="scale <= 0.3" @click="scale -= 0.1">
            <q-tooltip>Alejar</q-tooltip>
          </q-btn>
        </q-btn-group>

        <q-space />

        <q-btn flat round dense icon="save_alt" @click="download">
          <q-tooltip>Descargar</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="print" @click="print">
          <q-tooltip>Imprimir</q-tooltip>
        </q-btn>
        <q-btn flat round dense icon="close" v-close-popup>
          <q-tooltip>Cerrar</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section v-if="loading" class="text-center">
        <q-spinner-ball color="white" size="2em" />
      </q-card-section>

      <q-card-section v-if="viewMode === 'paged'" class="text-center">
        <div class="text-caption text-grey-4 q-mb-xs">
          Página {{ currentPage }} de {{ numPages || '…' }}
        </div>
        <canvas :id="canvasId" v-show="open && !loading" />
      </q-card-section>

      <q-card-section
        v-if="viewMode === 'scroll'"
        class="text-center q-pa-none"
        style="height: calc(100vh - 80px)"
      >
        <q-scroll-area style="height: 100%; width: 100%" v-show="open && !loading">
          <div v-for="pageNum in numPages" :key="pageNum" class="q-pa-xs">
            <div class="text-caption text-grey-4">Página {{ pageNum }} de {{ numPages }}</div>
            <canvas :id="`${canvasId}-page-${pageNum}`" />
          </div>
        </q-scroll-area>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { uid } from 'quasar';
import { markRaw, ref, shallowRef, watch } from 'vue';
import pdfjsLib from 'src/utils/pdfjs-setup';

const props = defineProps({
  document: { type: [Blob, Object], default: null },
  documentName: { type: String, default: 'documento.pdf' },
  escalaInicial: { type: Number, default: 1.5 },
  modeView: { type: String, default: 'scroll' },
});

const emit = defineEmits(['close']);

const canvasId = `pdf-viewer-${uid()}`;
const open = ref(false);
const scale = ref(props.escalaInicial);
const pdf = shallowRef(null);
const objectUrl = ref(null);
const numPages = ref(0);
const currentPage = ref(1);
const loading = ref(false);
const viewMode = ref(props.modeView);

function revokeUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = null;
  }
}

async function getBlob() {
  if (props.document instanceof Blob) return props.document;
  if (typeof props.document?.output === 'function') {
    return props.document.output('blob');
  }
  throw new Error('Documento PDF no válido');
}

async function loadPdf() {
  loading.value = true;
  revokeUrl();
  pdf.value = null;
  numPages.value = 0;

  try {
    const blob = await getBlob();
    objectUrl.value = URL.createObjectURL(blob);
    const task = pdfjsLib.getDocument(objectUrl.value);
    const doc = await task.promise;
    pdf.value = markRaw(doc);
    numPages.value = doc.numPages;
    currentPage.value = 1;

    if (viewMode.value === 'paged') {
      await renderPage();
    } else {
      setTimeout(() => renderAllPages(), 80);
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function renderPage() {
  if (!pdf.value) return;
  loading.value = true;
  const page = await pdf.value.getPage(currentPage.value);
  const viewport = page.getViewport({ scale: scale.value });
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    loading.value = false;
    return;
  }
  const ctx = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: ctx, viewport }).promise;
  loading.value = false;
}

async function renderAllPages() {
  if (!pdf.value) return;
  loading.value = true;
  try {
    for (let n = 1; n <= pdf.value.numPages; n += 1) {
      const page = await pdf.value.getPage(n);
      const viewport = page.getViewport({ scale: scale.value });
      const canvas = document.getElementById(`${canvasId}-page-${n}`);
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: ctx, viewport }).promise;
    }
  } finally {
    loading.value = false;
  }
}

async function print() {
  const blob = await getBlob();
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 1000);
  };
}

async function download() {
  const blob = await getBlob();
  const url = URL.createObjectURL(blob);
  let name = props.documentName || 'documento.pdf';
  if (!name.toLowerCase().endsWith('.pdf')) name += '.pdf';
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function mostrarPDF() {
  open.value = true;
}

function cerrarDialog() {
  open.value = false;
}

function onHide() {
  revokeUrl();
  pdf.value = null;
  emit('close');
}

watch(open, (val) => {
  if (val) loadPdf();
});

watch(currentPage, () => {
  if (viewMode.value === 'paged' && open.value) renderPage();
});

watch(scale, () => {
  if (!open.value || !pdf.value) return;
  if (viewMode.value === 'paged') renderPage();
  else setTimeout(() => renderAllPages(), 80);
});

watch(viewMode, (mode) => {
  if (!open.value || !pdf.value) return;
  if (mode === 'paged') renderPage();
  else setTimeout(() => renderAllPages(), 80);
});

defineExpose({ mostrarPDF, cerrarDialog, print, download });
</script>

<style scoped>
.krytitlebar {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
