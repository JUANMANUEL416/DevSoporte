<template>
  <div class="vip-plantilla-field">
    <div class="vip-plantilla-field__head">
      <span class="vip-plantilla-field__label">{{ label }}</span>
      <div class="vip-plantilla-field__actions">
        <q-btn
          flat
          dense
          no-caps
          color="teal-8"
          icon="upload_file"
          label="Subir Word"
          :loading="wordLoading"
          @click="pickWordFile"
        />
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          icon="auto_awesome"
          label="Plantilla predeterminada"
          @click="cargarDefault"
        />
        <q-btn
          flat
          dense
          no-caps
          color="red-8"
          icon="picture_as_pdf"
          label="Vista previa PDF"
          :loading="previewPdfLoading"
          :disable="!codigoCliente"
          @click="previewPdf"
        />
      </div>
    </div>

    <input
      ref="wordInputRef"
      type="file"
      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      class="vip-plantilla-field__file-input"
      @change="onWordSelected"
    />

    <p class="vip-plantilla-field__hint">
      Suba un archivo <strong>.docx</strong> diseñado en Word y reemplace solo las variables
      <code v-pre>{{nombre}}</code>. Use el modo <strong>HTML / Word</strong> para conservar tablas,
      márgenes y formato; el editor visual simplifica el diseño al pegar.
    </p>

    <q-btn-toggle
      v-model="editMode"
      spread
      no-caps
      dense
      toggle-color="primary"
      class="vip-plantilla-field__mode"
      :options="[
        { label: 'HTML / Word', value: 'html', icon: 'description' },
        { label: 'Editor visual', value: 'visual', icon: 'edit_note' },
      ]"
    />

    <div
      v-if="variables.length"
      class="vip-plantilla-field__vars"
      :class="{ 'vip-plantilla-field__vars--dragging': draggingVar }"
    >
      <q-chip
        v-for="v in variables"
        :key="v.key"
        dense
        clickable
        draggable="true"
        color="blue-1"
        text-color="blue-10"
        class="vip-plantilla-field__var-chip"
        :class="{ 'vip-plantilla-field__var-chip--dragging': draggingVar === v.key }"
        :label="variableToken(v.key)"
        @click="insertVariableAtCursor(v.key)"
        @dragstart="onVarDragStart(v.key, $event)"
        @dragend="onVarDragEnd"
      >
        <q-tooltip>
          {{ v.label }} — arrastre al editor o clic para insertar en el cursor
        </q-tooltip>
      </q-chip>
    </div>

    <div v-if="editMode === 'html'" class="vip-plantilla-field__html-layout">
      <div
        class="vip-plantilla-field__html-editor"
        :class="{ 'vip-plantilla-field__html-editor--drop': dropActive }"
        @dragover.prevent="onHtmlDragOver"
        @dragleave="onHtmlDragLeave"
        @drop.prevent="onHtmlDrop"
      >
        <div class="vip-plantilla-field__panel-title">HTML de la plantilla</div>
        <textarea
          ref="htmlTextareaRef"
          class="vip-plantilla-field__textarea"
          :value="modelValue"
          :placeholder="placeholder"
          spellcheck="false"
          @input="onHtmlInput"
          @click="saveHtmlSelection"
          @keyup="saveHtmlSelection"
          @mouseup="saveHtmlSelection"
        />
      </div>
      <div class="vip-plantilla-field__html-preview">
        <div class="vip-plantilla-field__panel-title">Vista previa del diseño</div>
        <iframe
          class="vip-plantilla-field__preview-frame"
          title="Vista previa plantilla"
          sandbox="allow-same-origin"
          :srcdoc="previewSrcdoc"
        />
      </div>
    </div>

    <div
      v-else
      class="vip-plantilla-field__editor-wrap"
      :class="{ 'vip-plantilla-field__editor-wrap--drop': dropActive }"
      @dragover.prevent="onEditorDragOver"
      @dragleave="onEditorDragLeave"
      @drop.prevent="onEditorDrop"
    >
      <q-banner dense rounded class="bg-amber-1 text-amber-10 q-mb-sm">
        El editor visual puede perder tablas y estilos de Word. Prefiera subir el .docx y editar en modo HTML.
      </q-banner>
      <q-editor
        ref="editorRef"
        :model-value="modelValue"
        class="vip-plantilla-field__editor"
        min-height="280px"
        :toolbar="editorToolbar"
        :placeholder="placeholder"
        @update:model-value="emit('update:modelValue', $event)"
        @click="saveEditorSelection"
        @keyup="saveEditorSelection"
        @mouseup="saveEditorSelection"
      />
    </div>

    <PDFViewerComponent
      v-if="pdfDocument"
      ref="pdfRef"
      :document="pdfDocument"
      :document-name="pdfDocumentName"
      @close="pdfDocument = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import mammoth from 'mammoth';
import { vipClientesApi } from 'src/services/api';
import PDFViewerComponent from 'components/PDFViewerComponent.vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Plantilla cuenta de cobro' },
  placeholder: { type: String, default: 'Diseñe el formato del documento...' },
  codigoCliente: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const $q = useQuasar();
const editorRef = ref(null);
const htmlTextareaRef = ref(null);
const wordInputRef = ref(null);
const variables = ref([]);
const plantillaDefault = ref('');
const previewPdfLoading = ref(false);
const wordLoading = ref(false);
const pdfDocument = ref(null);
const pdfDocumentName = ref('vista-previa-cxc.pdf');
const pdfRef = ref(null);
const draggingVar = ref('');
const dropActive = ref(false);
const savedRange = ref(null);
const htmlSelection = ref({ start: 0, end: 0 });
const editMode = ref('html');
const documentStyles = ref('');

const editorToolbar = [
  ['bold', 'italic', 'underline'],
  ['unordered', 'ordered'],
  ['quote'],
  ['left', 'center', 'right', 'justify'],
  ['undo', 'redo'],
];

const previewSrcdoc = computed(() => {
  let html = String(props.modelValue || '');
  for (const v of variables.value) {
    const sample = v.ejemplo ?? `[${v.key}]`;
    html = html.replace(new RegExp(`\\{\\{\\s*${v.key}\\s*\\}\\}`, 'gi'), sample);
  }
  if (!html.trim()) {
    html = '<p style="color:#94a3b8">Suba un .docx o escriba HTML con variables {{nombre}}.</p>';
  }
  const styles = documentStyles.value || `
    body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.35; color: #111; margin: 28px 32px; }
    table { border-collapse: collapse; width: 100%; }
    td, th { vertical-align: top; padding: 2px 4px; }
    p { margin: 0 0 8px; }
  `;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>${styles}</style></head><body>
    <div class="vip-doc-sheet">
      <div class="vip-doc-frame">
        <div class="vip-doc-frame__inner">${html}</div>
      </div>
    </div>
  </body></html>`;
});

function looksLikeWordHtml(html) {
  return /<table[\s>]|style\s*=|font-weight|text-align|class\s*=/i.test(String(html || ''));
}

watch(
  () => props.modelValue,
  (val) => {
    if (looksLikeWordHtml(val) && editMode.value === 'visual') {
      editMode.value = 'html';
    }
  },
  { immediate: true },
);

function variableToken(key) {
  return `{{${key}}}`;
}

function pickWordFile() {
  wordInputRef.value?.click();
}

function confirmReplace(onOk) {
  if (!String(props.modelValue || '').trim()) {
    onOk();
    return;
  }
  $q.dialog({
    title: 'Reemplazar plantilla',
    message: 'Se sustituirá la plantilla actual por el contenido del archivo Word. ¿Continuar?',
    cancel: true,
    persistent: true,
  }).onOk(onOk);
}

async function onWordSelected(event) {
  const file = event.target?.files?.[0];
  event.target.value = '';
  if (!file) return;

  if (!/\.docx$/i.test(file.name)) {
    $q.notify({ type: 'warning', message: 'Use un archivo Word .docx (Word 2007 o superior)' });
    return;
  }

  confirmReplace(async () => {
    wordLoading.value = true;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Title'] => p.doc-title:fresh",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "r[style-name='Strong'] => strong",
          ],
        },
      );

      const html = String(result.value || '').trim();
      if (!html) {
        $q.notify({ type: 'warning', message: 'El archivo Word no produjo contenido convertible' });
        return;
      }

      emit('update:modelValue', html);
      editMode.value = 'html';

      const warnings = (result.messages || [])
        .filter((m) => m.type === 'warning')
        .map((m) => m.message)
        .slice(0, 2);
      $q.notify({
        type: 'positive',
        message: 'Plantilla importada desde Word. Inserte las variables {{...}} donde corresponda.',
        caption: warnings.length ? warnings.join(' · ') : undefined,
        timeout: warnings.length ? 6000 : 3500,
      });
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.message || 'No se pudo leer el archivo Word',
      });
    } finally {
      wordLoading.value = false;
    }
  });
}

function onHtmlInput(event) {
  emit('update:modelValue', event.target.value);
  saveHtmlSelection(event.target);
}

function saveHtmlSelection(el = htmlTextareaRef.value) {
  if (!el) return;
  htmlSelection.value = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
}

function insertInTextarea(token) {
  const el = htmlTextareaRef.value;
  const current = String(props.modelValue || '');
  const { start, end } = htmlSelection.value;
  const safeStart = Number.isFinite(start) ? start : current.length;
  const safeEnd = Number.isFinite(end) ? end : safeStart;
  const next = `${current.slice(0, safeStart)}${token}${current.slice(safeEnd)}`;
  emit('update:modelValue', next);
  const cursor = safeStart + token.length;
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(cursor, cursor);
    saveHtmlSelection(el);
  });
}

function getContentEl() {
  const editor = editorRef.value;
  if (!editor) return null;
  if (typeof editor.getContentEl === 'function') return editor.getContentEl();
  return editor.$el?.querySelector?.('[contenteditable="true"]') || null;
}

function saveEditorSelection() {
  const sel = window.getSelection?.();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  const contentEl = getContentEl();
  if (!contentEl || !contentEl.contains(range.commonAncestorContainer)) return;
  savedRange.value = range.cloneRange();
}

function restoreEditorSelection() {
  const contentEl = getContentEl();
  if (!contentEl || !savedRange.value) {
    editorRef.value?.focus?.();
    return false;
  }
  contentEl.focus();
  const sel = window.getSelection();
  if (!sel) return false;
  sel.removeAllRanges();
  sel.addRange(savedRange.value);
  return true;
}

function placeCaretAtPoint(clientX, clientY) {
  const contentEl = getContentEl();
  if (!contentEl) return false;

  contentEl.focus();

  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(clientX, clientY);
    if (range && contentEl.contains(range.commonAncestorContainer)) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      savedRange.value = range.cloneRange();
      return true;
    }
  }

  return restoreEditorSelection();
}

function insertVariableAtCursor(key) {
  const token = variableToken(key);
  if (editMode.value === 'html') {
    insertInTextarea(token);
    return;
  }

  const editor = editorRef.value;
  if (!editor) {
    emit('update:modelValue', `${props.modelValue || ''} ${token}`.trim());
    return;
  }

  restoreEditorSelection();
  editor.focus();
  editor.runCmd('insertHTML', token);
}

function onVarDragStart(key, event) {
  const token = variableToken(key);
  draggingVar.value = key;
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', token);
    event.dataTransfer.effectAllowed = 'copy';
  }
  if (editMode.value === 'html') saveHtmlSelection();
  else saveEditorSelection();
}

function onVarDragEnd() {
  draggingVar.value = '';
  dropActive.value = false;
}

function onHtmlDragOver() {
  dropActive.value = true;
}

function onHtmlDragLeave(event) {
  if (event.currentTarget?.contains?.(event.relatedTarget)) return;
  dropActive.value = false;
}

function onHtmlDrop(event) {
  dropActive.value = false;
  draggingVar.value = '';
  const token = event.dataTransfer?.getData('text/plain') || '';
  if (!token.includes('{{')) return;
  htmlTextareaRef.value?.focus();
  insertInTextarea(token);
}

function onEditorDragOver() {
  dropActive.value = true;
}

function onEditorDragLeave(event) {
  if (event.currentTarget?.contains?.(event.relatedTarget)) return;
  dropActive.value = false;
}

function onEditorDrop(event) {
  dropActive.value = false;
  draggingVar.value = '';

  const token = event.dataTransfer?.getData('text/plain') || '';
  if (!token.includes('{{')) return;

  placeCaretAtPoint(event.clientX, event.clientY);
  editorRef.value?.focus?.();
  editorRef.value?.runCmd('insertHTML', token);
}

function cargarDefault() {
  if (!plantillaDefault.value) return;
  confirmReplace(() => {
    emit('update:modelValue', plantillaDefault.value);
    editMode.value = 'visual';
    $q.notify({ type: 'info', message: 'Plantilla predeterminada cargada' });
  });
}

async function previewPdf() {
  if (!props.codigoCliente) {
    $q.notify({
      type: 'warning',
      message: 'Guarde el cliente primero para previsualizar el PDF con datos de ejemplo',
    });
    return;
  }

  previewPdfLoading.value = true;
  try {
    const res = await vipClientesApi.previewPlantillaPdf(props.codigoCliente, {
      cc_plantilla: props.modelValue,
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const safeName = String(props.codigoCliente || 'cliente').replace(/[^\w-]+/g, '_');
    pdfDocumentName.value = `Vista previa CXC ${safeName}.pdf`;
    pdfDocument.value = blob;
    setTimeout(() => pdfRef.value?.mostrarPDF(), 150);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo generar la vista previa PDF',
    });
  } finally {
    previewPdfLoading.value = false;
  }
}

onMounted(async () => {
  try {
    const data = await vipClientesApi.plantillaVariables();
    variables.value = data.variables || [];
    plantillaDefault.value = data.plantilla_default || '';
    documentStyles.value = data.document_styles || '';
    if (looksLikeWordHtml(props.modelValue)) editMode.value = 'html';
  } catch {
    variables.value = [];
  }
});
</script>

<style scoped lang="scss">
.vip-plantilla-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vip-plantilla-field__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.vip-plantilla-field__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
}

.vip-plantilla-field__actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.vip-plantilla-field__file-input {
  display: none;
}

.vip-plantilla-field__hint {
  margin: 0;
  font-size: 0.76rem;
  color: #64748b;
  line-height: 1.45;

  code {
    padding: 1px 5px;
    border-radius: 4px;
    background: #e2e8f0;
    font-size: 0.74rem;
  }
}

.vip-plantilla-field__mode {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.vip-plantilla-field__vars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  transition: border-color 0.15s ease, background 0.15s ease;

  &--dragging {
    border-color: #1565c0;
    background: #e3f2fd;
  }
}

.vip-plantilla-field__var-chip {
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &--dragging {
    opacity: 0.55;
  }
}

.vip-plantilla-field__html-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  min-height: 340px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.vip-plantilla-field__panel-title {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 6px;
}

.vip-plantilla-field__html-editor,
.vip-plantilla-field__html-preview {
  display: flex;
  flex-direction: column;
  min-height: 320px;
}

.vip-plantilla-field__html-editor--drop {
  box-shadow: inset 0 0 0 2px #1565c0;
  border-radius: 8px;
}

.vip-plantilla-field__textarea {
  flex: 1;
  width: 100%;
  min-height: 300px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #0f172a;
  resize: vertical;
}

.vip-plantilla-field__preview-frame {
  flex: 1;
  width: 100%;
  min-height: 300px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.vip-plantilla-field__editor-wrap {
  border-radius: 8px;
  transition: box-shadow 0.15s ease;

  &--drop {
    box-shadow: inset 0 0 0 2px #1565c0;
  }
}

.vip-plantilla-field__editor {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}
</style>
