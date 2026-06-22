<template>
  <q-dialog
    v-model="open"
    persistent
    full-width
    full-height
    class="notify-dialog-shell"
  >
    <q-card class="notify-dialog">
      <div class="notify-dialog__header">
        <div class="notify-dialog__header-text">
          <span class="notify-dialog__title">{{ title }}</span>
          <span v-if="clienteNombre" class="notify-dialog__subtitle">{{ clienteNombre }}</span>
        </div>
        <q-btn flat dense round icon="close" size="sm" class="notify-dialog__close" v-close-popup />
      </div>

      <q-card-section class="notify-dialog__body">
        <q-inner-loading :showing="loading" />

        <template v-if="!loading">
          <q-banner v-if="isActaMode" dense rounded class="notify-dialog__info">
            El acta va <strong>al contacto del cliente (Para)</strong>; el
            <strong>equipo de trabajo en copia (CC)</strong>.
            Se adjunta el <strong>PDF del registro de asistencia</strong>.
          </q-banner>
          <q-banner v-else-if="isBitacoraMode" dense rounded class="notify-dialog__info notify-dialog__info--bitacora">
            El correo va al <strong>funcionario que solicitó el soporte (Para)</strong>; el
            <strong>equipo de la clínica en copia (CC)</strong>.
            Incluye enlace para <strong>firmar la aceptación de la solución</strong>.
          </q-banner>
          <q-banner v-else-if="isSemanaReportMode" dense rounded class="notify-dialog__info notify-dialog__info--bitacora">
            El reporte va al <strong>equipo de trabajo (Para)</strong> con el
            <strong>PDF de la bitácora semanal</strong> adjunto.
          </q-banner>

          <template v-if="isSplitRecipientsMode">
            <div class="notify-dialog__recipients-split">
              <section class="notify-dialog__section">
                <div class="notify-dialog__section-head">
                  <span class="notify-dialog__section-title">
                    <q-icon name="person" size="15px" class="q-mr-xs" />
                    Para
                  </span>
                  <div class="notify-dialog__toolbar">
                    <q-btn flat dense color="primary" label="Todos" @click="selectAllTo" />
                    <q-btn flat dense color="grey-7" label="Ninguno" @click="selectedTo = []" />
                  </div>
                </div>
                <div v-if="contactosTo.length" class="notify-dialog__grid">
                  <label
                    v-for="c in contactosTo"
                    :key="c.id"
                    class="notify-dialog__card notify-dialog__card--to"
                    :class="{ 'notify-dialog__card--selected': selectedTo.includes(c.email) }"
                  >
                    <q-checkbox v-model="selectedTo" :val="c.email" color="primary" dense />
                    <div class="notify-dialog__card-text">
                      <span class="notify-dialog__card-name">{{ c.nombre || c.email }}</span>
                      <span class="notify-dialog__card-meta">{{ c.email }}</span>
                    </div>
                  </label>
                </div>
                <p v-else class="notify-dialog__empty-hint">Sin contactos de cliente.</p>
              </section>

              <section v-if="!isEquipoOnlyMode" class="notify-dialog__section">
                <div class="notify-dialog__section-head">
                  <span class="notify-dialog__section-title">
                    <q-icon name="groups" size="15px" class="q-mr-xs" />
                    Copia (CC)
                  </span>
                  <div class="notify-dialog__toolbar">
                    <q-btn flat dense color="primary" label="Todos" @click="selectAllCc" />
                    <q-btn flat dense color="grey-7" label="Ninguno" @click="selectedCc = []" />
                  </div>
                </div>
                <div v-if="contactosCc.length" class="notify-dialog__grid">
                  <label
                    v-for="c in contactosCc"
                    :key="c.id"
                    class="notify-dialog__card notify-dialog__card--cc"
                    :class="{ 'notify-dialog__card--selected': selectedCc.includes(c.email) }"
                  >
                    <q-checkbox v-model="selectedCc" :val="c.email" color="teal" dense />
                    <div class="notify-dialog__card-text">
                      <span class="notify-dialog__card-name">{{ c.nombre || c.email }}</span>
                      <span class="notify-dialog__card-meta">{{ c.email }}</span>
                    </div>
                  </label>
                </div>
                <p v-else class="notify-dialog__empty-hint">Sin equipo configurado.</p>
              </section>
            </div>
          </template>

          <section v-else class="notify-dialog__section">
            <div class="notify-dialog__section-head">
              <span class="notify-dialog__section-title">Destinatarios</span>
              <div class="notify-dialog__toolbar">
                <q-btn flat dense color="primary" label="Todos" @click="selectAll" />
                <q-btn flat dense color="grey-7" label="Ninguno" @click="selected = []" />
              </div>
            </div>
            <div v-if="allContactos.length" class="notify-dialog__grid">
              <label
                v-for="c in allContactos"
                :key="c.id"
                class="notify-dialog__card"
                :class="{ 'notify-dialog__card--selected': selected.includes(c.email) }"
              >
                <q-checkbox v-model="selected" :val="c.email" color="primary" dense />
                <div class="notify-dialog__card-text">
                  <span class="notify-dialog__card-name">{{ c.nombre || c.email }}</span>
                  <span class="notify-dialog__card-meta">
                    <q-badge v-if="c.manual" dense color="grey-7" label="Manual" class="q-mr-xs" />
                    {{ c.cargo || 'Sin cargo' }} · {{ c.email }}
                  </span>
                </div>
              </label>
            </div>
          </section>

          <div class="notify-dialog__manual row q-col-gutter-sm items-end">
            <div class="col-grow">
              <q-input
                v-model="manualEmail"
                label="Correo manual"
                type="email"
                outlined
                dense
                bg-color="white"
                placeholder="correo@empresa.com"
                @keyup.enter="addManualEmail"
              />
            </div>
            <div v-if="isSplitRecipientsMode" class="col-auto" style="min-width: 130px">
              <q-select
                v-model="manualRol"
                :options="manualRolOptions"
                label="Como"
                outlined
                dense
                bg-color="white"
                emit-value
                map-options
              />
            </div>
            <div class="col-auto">
              <q-btn
                unelevated
                color="primary"
                icon="add"
                label="Agregar"
                no-caps
                dense
                class="notify-dialog__add-btn"
                @click="addManualEmail"
              />
            </div>
          </div>

          <section class="notify-dialog__section">
            <div class="notify-dialog__section-head">
              <span class="notify-dialog__section-title">Contenido del correo</span>
              <q-btn flat dense color="grey-7" label="Restaurar texto" @click="restorePreview" />
            </div>
            <q-input
              v-model="subject"
              label="Asunto"
              outlined
              dense
              bg-color="white"
              class="q-mb-sm"
            />
            <q-input
              v-model="bodyText"
              label="Mensaje"
              type="textarea"
              outlined
              bg-color="white"
              autogrow
              class="notify-dialog__body-input q-mb-sm"
              hint="{{nombre}} = saludo personalizado · Los datos del registro se incluyen en el diseño del correo"
            />
            <div class="notify-dialog__preview-label">Vista previa</div>
            <pre class="notify-dialog__preview">{{ previewSample }}</pre>
          </section>
        </template>
      </q-card-section>

      <q-card-actions class="notify-dialog__actions">
        <q-space />
        <q-btn flat no-caps label="Cancelar" v-close-popup />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="send"
          label="Enviar"
          :loading="sending"
          :disable="!canSend || sending"
          @click="confirmSend"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { clientesApi, notificacionApi, bitacoraApi } from 'src/services/api';

const emit = defineEmits(['update:modelValue', 'send']);

const props = defineProps({
  modelValue: Boolean,
  clienteCodigo: { type: String, default: '' },
  recordId: { type: String, default: '' },
  notifyType: { type: String, default: 'bitacora' },
  title: { type: String, default: 'Seleccionar destinatarios' },
  sending: { type: Boolean, default: false },
  incluirEquipoTrabajo: { type: Boolean, default: false },
});

const $q = useQuasar();
const loading = ref(false);
const contactos = ref([]);
const contactosTo = ref([]);
const contactosCc = ref([]);
const manualContactosTo = ref([]);
const manualContactosCc = ref([]);
const manualContactos = ref([]);
const clienteNombre = ref('');
const selected = ref([]);
const selectedTo = ref([]);
const selectedCc = ref([]);
const subject = ref('');
const bodyText = ref('');
const defaultSubject = ref('');
const defaultBody = ref('');
const manualEmail = ref('');
const manualRol = ref('to');

const manualRolOptions = [
  { label: 'Para (cliente)', value: 'to' },
  { label: 'Copia (equipo)', value: 'cc' },
];

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const isActaMode = computed(() => props.notifyType === 'capacitacion');
const isBitacoraMode = computed(() => props.notifyType === 'bitacora');
const isSemanaReportMode = computed(() => props.notifyType === 'bitacora_semana');
const isSplitRecipientsMode = computed(() => isActaMode.value || isBitacoraMode.value || isSemanaReportMode.value);
const isEquipoOnlyMode = computed(() => isSemanaReportMode.value);

const allContactos = computed(() => [...contactos.value, ...manualContactos.value]);

const allContactosTo = computed(() => [...contactosTo.value, ...manualContactosTo.value]);

const canSend = computed(() => {
  if (!subject.value.trim() || !bodyText.value.trim()) return false;
  if (isSplitRecipientsMode.value) return selectedTo.value.length > 0;
  return selected.value.length > 0;
});

const previewSample = computed(() => {
  const nombre = previewNombre.value;
  const body = bodyText.value.replace(/\{\{nombre\}\}/g, nombre);
  if (isActaMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(sin destinatarios)';
    const copia = [...contactosCc.value, ...manualContactosCc.value]
      .filter((c) => selectedCc.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(ninguno)';
    return `Para: ${para}\nCopia (CC): ${copia}\n\nAsunto: ${subject.value}\n\n${body}`;
  }
  if (isBitacoraMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(sin funcionario con email)';
    const copia = [...contactosCc.value, ...manualContactosCc.value]
      .filter((c) => selectedCc.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(ninguno)';
    return `Para: ${para}\nCopia (CC): ${copia}\n\nAsunto: ${subject.value}\n\n${body}\n\n(Incluye botón: Firma aceptación de la solución)`;
  }
  if (isSemanaReportMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(sin equipo con email)';
    return `Para: ${para}\n\nAsunto: ${subject.value}\n\n${body}\n\n(Adjunto: PDF bitácora semanal)`;
  }
  const first = allContactos.value.find((c) => selected.value.includes(c.email)) || { nombre: '' };
  const n = first.nombre || 'estimado(a)';
  return `Para: ${selected.value.join(', ') || '(ninguno)'}\n\nAsunto: ${subject.value}\n\n${body.replace(/\{\{nombre\}\}/g, n)}`;
});

const previewNombre = computed(() => {
  if (isSplitRecipientsMode.value) {
    const first = allContactosTo.value.find((c) => selectedTo.value.includes(c.email));
    return first?.nombre || clienteNombre.value || 'estimado(a)';
  }
  const first = allContactos.value.find((c) => selected.value.includes(c.email));
  return first?.nombre || 'estimado(a)';
});

watch(
  () => props.modelValue,
  async (val) => {
    if (!val || !props.clienteCodigo || !props.recordId) return;
    loading.value = true;
    selected.value = [];
    selectedTo.value = [];
    selectedCc.value = [];
    manualContactos.value = [];
    manualContactosTo.value = [];
    manualContactosCc.value = [];
    manualEmail.value = '';
    manualRol.value = 'to';
    try {
      let preview;
      if (isSemanaReportMode.value) {
        const [destData, previewData] = await Promise.all([
          clientesApi.destinatarios(props.clienteCodigo),
          bitacoraApi.previewReporteSemana(props.recordId, props.clienteCodigo),
        ]);
        clienteNombre.value = destData.nombrecliente || props.clienteCodigo;
        preview = previewData;
        contactosTo.value = (destData.equipoConEmail || []).map((c, i) => ({
          ...c,
          id: `to-${i}-${c.email}`,
        }));
        contactosCc.value = [];
        selectedTo.value = contactosTo.value.map((c) => c.email);
        selectedCc.value = [];
        defaultSubject.value = preview.subject || '';
        defaultBody.value = preview.body || '';
        subject.value = preview.subject || '';
        bodyText.value = preview.body || '';
        if (!contactosTo.value.length) {
          $q.notify({
            type: 'warning',
            message: 'El equipo no tiene correos registrados. Agregue uno manualmente en Para.',
          });
        }
        return;
      }

      const previewFn = isActaMode.value
        ? notificacionApi.previewCapacitacion
        : notificacionApi.previewBitacora;

      const [destData, previewRes] = await Promise.all([
        clientesApi.destinatarios(props.clienteCodigo),
        previewFn(props.recordId),
      ]);
      preview = previewRes;

      clienteNombre.value = destData.nombrecliente || props.clienteCodigo;
      defaultSubject.value = preview.subject || '';
      defaultBody.value = preview.body || '';
      subject.value = preview.subject || '';
      bodyText.value = preview.body || '';

      if (isActaMode.value) {
        contactosTo.value = (destData.contactosConEmail || []).map((c, i) => ({
          ...c,
          id: `to-${i}-${c.email}`,
        }));
        contactosCc.value = (destData.equipoConEmail || []).map((c, i) => ({
          ...c,
          id: `cc-${i}-${c.email}`,
        }));
        selectedTo.value = contactosTo.value.map((c) => c.email);
        selectedCc.value = contactosCc.value.map((c) => c.email);
      } else if (isBitacoraMode.value) {
        contactosTo.value = preview.funcionario?.email
          ? [{
            id: `func-${preview.funcionario.email}`,
            email: preview.funcionario.email,
            nombre: preview.funcionario.nombre || preview.funcionario.email,
            cargo: 'Funcionario solicitante',
          }]
          : [];
        contactosCc.value = (destData.equipoConEmail || []).map((c, i) => ({
          ...c,
          id: `cc-${i}-${c.email}`,
        }));
        selectedTo.value = contactosTo.value.map((c) => c.email);
        selectedCc.value = contactosCc.value.map((c) => c.email);
        if (!contactosTo.value.length) {
          $q.notify({
            type: 'warning',
            message: 'El funcionario no tiene correo registrado. Agregue uno manualmente en Para.',
          });
        }
      } else {
        contactos.value = (destData.conEmail || []).map((c, i) => ({
          ...c,
          id: `c-${i}-${c.email}`,
        }));
        selected.value = contactos.value.map((c) => c.email);
      }
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.error || 'No se pudo cargar el formulario de envío',
      });
      open.value = false;
    } finally {
      loading.value = false;
    }
  },
);

function selectAll() {
  selected.value = allContactos.value.map((c) => c.email);
}

function selectAllTo() {
  selectedTo.value = allContactosTo.value.map((c) => c.email);
}

function selectAllCc() {
  selectedCc.value = [...contactosCc.value, ...manualContactosCc.value].map((c) => c.email);
}

function restorePreview() {
  subject.value = defaultSubject.value;
  bodyText.value = defaultBody.value;
}

function addManualEmail() {
  const email = String(manualEmail.value || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $q.notify({ type: 'warning', message: 'Ingrese un correo válido' });
    return;
  }

  if (isSplitRecipientsMode.value) {
    const lists = manualRol.value === 'cc'
      ? [...contactosCc.value, ...manualContactosCc.value]
      : [...contactosTo.value, ...manualContactosTo.value];
    const selectedList = manualRol.value === 'cc' ? selectedCc : selectedTo;
    const exists = lists.some((c) => c.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      if (!selectedList.value.includes(email)) selectedList.value.push(email);
      manualEmail.value = '';
      return;
    }
    const entry = {
      id: `m-${Date.now()}`,
      email,
      nombre: email,
      cargo: 'Manual',
      manual: true,
    };
    if (manualRol.value === 'cc') {
      manualContactosCc.value.push(entry);
      selectedCc.value.push(email);
    } else {
      manualContactosTo.value.push(entry);
      selectedTo.value.push(email);
    }
  } else {
    const exists = allContactos.value.some((c) => c.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      if (!selected.value.includes(email)) selected.value.push(email);
      manualEmail.value = '';
      return;
    }
    manualContactos.value.push({
      id: `m-${Date.now()}`,
      email,
      nombre: email,
      cargo: 'Manual',
      manual: true,
    });
    selected.value.push(email);
  }
  manualEmail.value = '';
}

function confirmSend() {
  if (!canSend.value) return;
  if (isSplitRecipientsMode.value) {
    emit('send', {
      emails: allContactosTo.value
        .filter((c) => selectedTo.value.includes(c.email))
        .map((c) => c.email),
      extraEmails: manualContactosTo.value
        .filter((c) => selectedTo.value.includes(c.email))
        .map((c) => c.email),
      ccEmails: [...contactosCc.value, ...manualContactosCc.value]
        .filter((c) => selectedCc.value.includes(c.email))
        .map((c) => c.email),
      subject: subject.value.trim(),
      body: bodyText.value,
    });
    return;
  }
  emit('send', {
    emails: contactos.value.filter((c) => selected.value.includes(c.email)).map((c) => c.email),
    extraEmails: manualContactos.value
      .filter((c) => selected.value.includes(c.email))
      .map((c) => c.email),
    subject: subject.value.trim(),
    body: bodyText.value,
  });
}
</script>

<style scoped lang="scss">
.notify-dialog-shell :deep(.q-dialog__inner) {
  padding: 8px;
}

.notify-dialog {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
}

.notify-dialog__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 14px;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
  color: #fff;
}

.notify-dialog__header-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.notify-dialog__title {
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.2;
}

.notify-dialog__subtitle {
  font-size: 0.78rem;
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notify-dialog__close {
  color: rgba(255, 255, 255, 0.92);
}

.notify-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  background: #f8fafc;
  padding: 12px 16px;
}

.notify-dialog__info {
  flex-shrink: 0;
  border: 1px solid #bbdefb;
  background: #e3f2fd;
  color: #0d47a1;

  &--bitacora {
    border-color: #80cbc4;
    background: #e0f2f1;
    color: #00695c;
  }
}

.notify-dialog__section {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.notify-dialog__recipients-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.notify-dialog__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.notify-dialog__section-title {
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
}

.notify-dialog__toolbar {
  display: flex;
  gap: 2px;
}

.notify-dialog__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.notify-dialog__card {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &--selected {
    background: #fff;
  }

  &--to.notify-dialog__card--selected {
    border-color: #1565c0;
  }

  &--cc.notify-dialog__card--selected {
    border-color: #00897b;
  }
}

.notify-dialog__card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.notify-dialog__card-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notify-dialog__card-meta {
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.3;
  word-break: break-all;
}

.notify-dialog__empty-hint {
  margin: 0;
  font-size: 0.76rem;
  color: #94a3b8;
  font-style: italic;
}

.notify-dialog__manual {
  flex-shrink: 0;
}

.notify-dialog__add-btn {
  border-radius: 8px;
}

.notify-dialog__body-input :deep(textarea) {
  min-height: 88px;
  font-family: inherit;
  font-size: 0.88rem;
  line-height: 1.5;
}

.notify-dialog__preview-label {
  margin-bottom: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.notify-dialog__preview {
  margin: 0;
  padding: 10px 12px;
  max-height: 180px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: auto;
}

.notify-dialog__actions {
  flex-shrink: 0;
  padding: 8px 14px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

@media (max-width: 768px) {
  .notify-dialog__recipients-split {
    grid-template-columns: 1fr;
  }

  .notify-dialog__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .notify-dialog-shell :deep(.q-dialog__inner) {
    padding: 4px;
  }
}
</style>
