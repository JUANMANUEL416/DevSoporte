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
          <section v-if="isCronogramaMode" class="notify-dialog__section">
            <div class="notify-dialog__section-head">
              <span class="notify-dialog__section-title">Tipo de PDF adjunto</span>
            </div>
            <q-option-group
              v-model="cronogramaTipo"
              :options="cronogramaTipoOptions"
              color="primary"
              inline
              dense
              @update:model-value="reloadCronogramaPreview"
            />
            <q-checkbox
              v-if="cronogramaTipo === 'seguimiento'"
              v-model="conSoportes"
              class="q-mt-sm"
              label="Con soportes (adjuntar actas de capacitación cerradas)"
            />
          </section>

          <section v-if="isVipCuentaCobroMode" class="notify-dialog__section">
            <q-banner dense rounded class="bg-orange-1 text-orange-10 q-mb-sm">
              <strong>Enviado desde:</strong> {{ remitenteCxc || 'Configure SMTP_FROM_CXC en el servidor' }}
              <div class="text-caption q-mt-xs">
                Remitente distinto al correo de soporte/bitácora (SMTP_FROM).
              </div>
            </q-banner>
            <div class="notify-dialog__section-head">
              <span class="notify-dialog__section-title">Documentos adjuntos</span>
            </div>
            <p class="notify-dialog__empty-hint q-mb-sm">
              La cuenta de cobro en PDF se adjunta automáticamente. Agregue aquí otros PDF si debe enviarlos con el correo.
            </p>
            <q-file
              v-model="adjuntosCxc"
              label="Adjuntos adicionales (PDF)"
              outlined
              dense
              multiple
              append
              counter
              hide-bottom-space
              max-files="10"
              max-total-size="15728640"
              accept=".pdf,application/pdf"
              @rejected="onCxcFilesRejected"
            >
              <template #prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>
          </section>

          <template v-if="isSplitRecipientsMode">
            <div class="notify-dialog__recipients-split">
              <section
                class="notify-dialog__section"
                :class="{ 'notify-dialog__section--drop-active': dragOverZone === 'to' }"
                @dragover.prevent="onDragOver('to')"
                @dragleave="onDragLeave('to')"
                @drop.prevent="onDrop('to', $event)"
              >
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
                <div v-if="displayContactosTo.length" class="notify-dialog__grid">
                  <div
                    v-for="c in displayContactosTo"
                    :key="c.id"
                    class="notify-dialog__card notify-dialog__card--to"
                    :class="{
                      'notify-dialog__card--selected': selectedTo.includes(c.email),
                      'notify-dialog__card--dragging': draggingEmail === c.email,
                    }"
                    draggable="!isEquipoOnlyMode"
                    @dragstart="onDragStart(c, 'to', $event)"
                    @dragend="onDragEnd"
                  >
                    <q-checkbox v-model="selectedTo" :val="c.email" color="primary" dense @click.stop />
                    <div class="notify-dialog__card-text">
                      <span class="notify-dialog__card-line">
                        <q-badge v-if="c.manual" dense color="grey-7" label="M" class="q-mr-xs" />
                        <q-badge v-if="c.agenda" dense color="teal-7" label="A" class="q-mr-xs" />
                        {{ contactCardLabel(c) }}
                        <q-tooltip v-if="showEmailTooltip(c)">{{ c.email }}</q-tooltip>
                      </span>
                    </div>
                    <q-btn
                      v-if="!isEquipoOnlyMode"
                      flat
                      dense
                      round
                      size="xs"
                      icon="arrow_forward"
                      color="grey-7"
                      class="notify-dialog__move-btn"
                      @click.stop="moveContact(c, 'to', 'cc')"
                    >
                      <q-tooltip>Mover a CC</q-tooltip>
                    </q-btn>
                  </div>
                </div>
                <p v-else class="notify-dialog__empty-hint">Sin contactos en Para. Arrastre aquí o agregue manualmente.</p>
              </section>

              <section
                v-if="!isEquipoOnlyMode"
                class="notify-dialog__section"
                :class="{ 'notify-dialog__section--drop-active': dragOverZone === 'cc' }"
                @dragover.prevent="onDragOver('cc')"
                @dragleave="onDragLeave('cc')"
                @drop.prevent="onDrop('cc', $event)"
              >
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
                <div v-if="displayContactosCc.length" class="notify-dialog__grid">
                  <div
                    v-for="c in displayContactosCc"
                    :key="c.id"
                    class="notify-dialog__card notify-dialog__card--cc"
                    :class="{
                      'notify-dialog__card--selected': selectedCc.includes(c.email),
                      'notify-dialog__card--dragging': draggingEmail === c.email,
                    }"
                    draggable="!isEquipoOnlyMode"
                    @dragstart="onDragStart(c, 'cc', $event)"
                    @dragend="onDragEnd"
                  >
                    <q-checkbox v-model="selectedCc" :val="c.email" color="teal" dense @click.stop />
                    <div class="notify-dialog__card-text">
                      <span class="notify-dialog__card-line">
                        <q-badge v-if="c.manual" dense color="grey-7" label="M" class="q-mr-xs" />
                        <q-badge v-if="c.agenda" dense color="teal-7" label="A" class="q-mr-xs" />
                        {{ contactCardLabel(c) }}
                        <q-tooltip v-if="showEmailTooltip(c)">{{ c.email }}</q-tooltip>
                      </span>
                    </div>
                    <q-btn
                      flat
                      dense
                      round
                      size="xs"
                      icon="arrow_back"
                      color="grey-7"
                      class="notify-dialog__move-btn"
                      @click.stop="moveContact(c, 'cc', 'to')"
                    >
                      <q-tooltip>Mover a Para</q-tooltip>
                    </q-btn>
                  </div>
                </div>
                <p v-else class="notify-dialog__empty-hint">Sin contactos en CC. Arrastre aquí desde Para.</p>
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
                  <span class="notify-dialog__card-line">
                    <q-badge v-if="c.manual" dense color="grey-7" label="M" class="q-mr-xs" />
                    <q-badge v-if="c.agenda" dense color="teal-7" label="A" class="q-mr-xs" />
                    {{ contactCardLabel(c) }}
                    <q-tooltip v-if="showEmailTooltip(c)">{{ c.email }}</q-tooltip>
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
            <div v-if="isSplitRecipientsMode && !isEquipoOnlyMode" class="col-auto" style="min-width: 130px">
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
            <div v-if="showAgendaButton" class="col-auto">
              <q-btn
                outline
                dense
                no-caps
                color="teal"
                icon="contacts"
                label="Agenda"
                class="notify-dialog__agenda-btn"
                @click="abrirAgendaDialog"
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
              hint="{{nombre}} = saludo personalizado (incluye tratamiento Doctor/Sra.) · Los datos del registro se incluyen en el diseño del correo"
            />

            <q-banner
              v-if="isBitacoraMode && funcionarioSolicitante && !funcionarioSolicitante.tratamiento"
              dense
              rounded
              class="notify-dialog__info notify-dialog__info--bitacora q-mb-sm"
            >
              El funcionario no tiene <strong>Tratamiento</strong> (Doctor, Doctora, Sra., etc.).
              Configúrelo en Clientes → Funcionarios para personalizar el saludo.
            </q-banner>

            <section v-if="isBitacoraMode && imagenesSoporte.length" class="notify-dialog__section q-mb-sm">
              <div class="notify-dialog__section-head">
                <span class="notify-dialog__section-title">
                  <q-icon name="photo_library" size="15px" class="q-mr-xs" />
                  Imágenes de soporte ({{ imagenesSoporte.length }})
                </span>
              </div>
              <p class="notify-dialog__images-hint">
                Miniaturas en el cuerpo del correo; las imágenes completas van adjuntas. Puede quitar alguna antes de enviar.
              </p>
              <div class="notify-dialog__images-list">
                <article
                  v-for="(img, index) in imagenesSoporte"
                  :key="`${img.nombre}-${index}`"
                  class="notify-dialog__image-row"
                >
                  <img :src="img.data" :alt="img.nombre" class="notify-dialog__image-thumb" />
                  <div class="notify-dialog__image-meta">
                    <div class="notify-dialog__image-name">{{ img.nombre }}</div>
                  </div>
                  <q-btn
                    flat
                    dense
                    no-caps
                    color="negative"
                    icon="delete_outline"
                    label="Quitar"
                    :loading="removingImagenIndex === index"
                    @click="removeImagenSoporte(index)"
                  />
                </article>
              </div>
            </section>

            <section v-if="isFirmasSemanaMode && firmasGruposPreview.length" class="notify-dialog__section q-mb-sm">
              <div class="notify-dialog__section-head">
                <span class="notify-dialog__section-title">
                  <q-icon name="groups" size="15px" class="q-mr-xs" />
                  PDF y enlaces por funcionario
                </span>
              </div>
              <div class="notify-dialog__grid">
                <article
                  v-for="(g, index) in firmasGruposPreview"
                  :key="`${g.funcionario}-${index}`"
                  class="notify-dialog__card notify-dialog__card--selected"
                >
                  <div class="notify-dialog__card-text">
                    <span class="notify-dialog__card-line">{{ g.funcionario }}</span>
                    <span class="notify-dialog__card-meta">
                      {{ g.totalSoportes }} soporte(s) · {{ g.pendientesFirma }} pendiente(s) · {{ g.pdfNombre }}
                    </span>
                  </div>
                </article>
              </div>
            </section>

            <section v-if="(isFirmasSemanaMode || isActreunFirmasMode) && firmasOmitidosPreview.length" class="notify-dialog__section q-mb-sm">
              <q-banner dense rounded class="bg-orange-1 text-orange-10">
                <div class="text-weight-medium q-mb-xs">No se enviará a {{ firmasOmitidosPreview.length }} destinatario(s):</div>
                <div
                  v-for="(o, idx) in firmasOmitidosPreview"
                  :key="`omit-${o.item || o.funcionarioKey || idx}`"
                  class="text-caption"
                >
                  {{ o.nombre || o.funcionario || '—' }} — {{ o.motivo || 'Sin datos' }}
                </div>
              </q-banner>
            </section>

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

    <q-dialog v-model="agendaOpen">
      <q-card class="notify-agenda">
        <div class="notify-agenda__header">
          <q-icon name="contacts" size="18px" />
          <span>Agenda de contactos</span>
          <q-space />
          <q-btn flat dense round size="sm" icon="close" color="white" v-close-popup />
        </div>

        <q-card-section class="q-pt-sm">
          <q-input
            v-model="agendaFilter"
            label="Buscar nombre, correo o empresa"
            outlined
            dense
            clearable
            debounce="200"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </q-card-section>

        <q-card-section class="q-pt-none notify-agenda__list">
          <q-inner-loading :showing="loadingAgenda">
            <q-spinner color="primary" size="32px" />
          </q-inner-loading>

          <div v-if="!loadingAgenda && !agendaFiltrados.length" class="text-center text-grey-6 q-pa-md">
            No hay contactos activos en la agenda.
          </div>

          <q-list v-else bordered separator class="rounded-borders">
            <q-item v-for="c in agendaFiltrados" :key="c.codigo" tag="label">
              <q-item-section avatar>
                <q-checkbox v-model="agendaSelected" :val="c.codigo" dense color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ c.nombre }}</q-item-label>
                <q-item-label caption>
                  {{ c.email }}
                  <span v-if="c.cargo"> · {{ c.cargo }}</span>
                  <span v-if="c.empresa"> · {{ c.empresa }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge
                  :color="c.categoria === 'equipo' ? 'teal' : c.categoria === 'cliente' ? 'blue' : 'grey'"
                  :label="fmtAgendaCategoria(c.categoria)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right" class="notify-agenda__actions">
          <q-btn
            v-if="!isEquipoOnlyMode"
            flat
            no-caps
            label="Equipo → CC"
            color="teal"
            @click="agregarEquipoAgendaCc"
          />
          <q-btn
            v-if="!isEquipoOnlyMode"
            flat
            no-caps
            label="Agregar a CC"
            color="primary"
            @click="agregarAgendaSeleccion('cc')"
          />
          <q-btn unelevated no-caps label="Agregar a Para" color="primary" @click="agregarAgendaSeleccion('to')" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import {
  clientesApi,
  notificacionApi,
  bitacoraApi,
  actproyApi,
  actreunApi,
  vipClientesApi,
  vipCuentasCobroApi,
  agendaContactosApi,
  useResource,
} from 'src/services/api';
import { formatNombreConTratamiento } from 'src/utils/saludo';
import { fmtAgendaCategoria } from 'src/config/modules';

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
const draggingEmail = ref('');
const dragOverZone = ref('');
const dragPayload = ref(null);
const funcionarioSolicitante = ref(null);
const imagenesSoporte = ref([]);
const removingImagenIndex = ref(-1);
const firmasGruposPreview = ref([]);
const firmasOmitidosPreview = ref([]);
const bitApi = useResource('bitacora');
const agendaOpen = ref(false);
const agendaFilter = ref('');
const agendaRows = ref([]);
const agendaSelected = ref([]);
const loadingAgenda = ref(false);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const manualRolOptions = [
  { label: 'Para (cliente)', value: 'to' },
  { label: 'Copia (equipo)', value: 'cc' },
];

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const isActaMode = computed(() => props.notifyType === 'capacitacion');
const isCronogramaMode = computed(() => props.notifyType === 'cronograma');
const isBitacoraMode = computed(() => props.notifyType === 'bitacora');
const isSemanaReportMode = computed(() => props.notifyType === 'bitacora_semana');
const isFirmasSemanaMode = computed(() => props.notifyType === 'bitacora_firmas_semana');
const isActproyMode = computed(() => props.notifyType === 'actproy');
const isActreunMode = computed(() => props.notifyType === 'actreun');
const isActreunFirmasMode = computed(() => props.notifyType === 'actreun_firmas');
const isVipCuentaCobroMode = computed(() => props.notifyType === 'vip_cuenta_cobro');
const isSplitRecipientsMode = computed(() =>
  isActaMode.value
  || isCronogramaMode.value
  || isBitacoraMode.value
  || isSemanaReportMode.value
  || isFirmasSemanaMode.value
  || isActproyMode.value
  || isActreunMode.value
  || isActreunFirmasMode.value
  || isVipCuentaCobroMode.value,
);
const cronogramaTipo = ref('programacion');
const conSoportes = ref(false);
const adjuntosCxc = ref([]);
const pdfCxcFilename = ref('');
const remitenteCxc = ref('');
const cronogramaTipoOptions = [
  { label: 'Programación', value: 'programacion' },
  { label: 'Seguimiento', value: 'seguimiento' },
];
const isEquipoOnlyMode = computed(() =>
  isSemanaReportMode.value || isFirmasSemanaMode.value || isActreunMode.value || isActreunFirmasMode.value,
);

/** Agenda disponible en envíos con destinatarios editables (informe, actas, bitácora, etc.). */
const showAgendaButton = computed(() => !isActreunFirmasMode.value);

const agendaFiltrados = computed(() => {
  const term = String(agendaFilter.value || '').trim().toLowerCase();
  if (!term) return agendaRows.value;
  return agendaRows.value.filter((c) => {
    const hay = `${c.nombre || ''} ${c.email || ''} ${c.empresa || ''} ${c.cargo || ''}`.toLowerCase();
    return hay.includes(term);
  });
});

const allContactos = computed(() => [...contactos.value, ...manualContactos.value]);

const allContactosTo = computed(() => [...contactosTo.value, ...manualContactosTo.value]);

const displayContactosTo = computed(() => allContactosTo.value);

const displayContactosCc = computed(() => [...contactosCc.value, ...manualContactosCc.value]);

const canSend = computed(() => {
  if (!subject.value.trim() || !bodyText.value.trim()) return false;
  if (isSplitRecipientsMode.value) return selectedTo.value.length > 0;
  return selected.value.length > 0;
});

const previewSample = computed(() => {
  const nombre = previewNombre.value;
  const body = bodyText.value.replace(/\{\{nombre\}\}/g, nombre);
  if (isCronogramaMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(sin destinatarios)';
    const copia = [...contactosCc.value, ...manualContactosCc.value]
      .filter((c) => selectedCc.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(ninguno)';
    const tipoLabel = cronogramaTipo.value === 'seguimiento' ? 'seguimiento' : 'programación';
    const soportesNote = cronogramaTipo.value === 'seguimiento' && conSoportes.value
      ? '\n\n(Adjuntos extra: actas de capacitación cerradas vinculadas al cronograma)'
      : '';
    return `Para: ${para}\nCopia (CC): ${copia}\n\nAsunto: ${subject.value}\n\n${body}\n\n(Adjunto: PDF cronograma — ${tipoLabel})${soportesNote}`;
  }
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
  if (isActproyMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(sin destinatarios)';
    const copia = [...contactosCc.value, ...manualContactosCc.value]
      .filter((c) => selectedCc.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(ninguno)';
    return `Para: ${para}\nCopia (CC): ${copia}\n\nAsunto: ${subject.value}\n\n${body}\n\n(Adjunto: PDF informe firmado)`;
  }
  if (isActreunMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(sin equipo con email)';
    return `Para: ${para}\n\nAsunto: ${subject.value}\n\n${body}\n\n(Adjunto: PDF acta de reunión firmada)`;
  }
  if (isVipCuentaCobroMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(sin destinatarios)';
    const copia = [...contactosCc.value, ...manualContactosCc.value]
      .filter((c) => selectedCc.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(ninguno)';
    const extraNote = adjuntosCxc.value.length
      ? `\n\n(Adjuntos extra: ${adjuntosCxc.value.map((f) => f.name).join(', ')})`
      : '';
    return `Para: ${para}\nCopia (CC): ${copia}\n\nAsunto: ${subject.value}\n\n${body}\n\n(Adjunto: ${pdfCxcFilename.value || 'PDF cuenta de cobro'})${extraNote}`;
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
    return `Para: ${para}\nCopia (CC): ${copia}\n\nAsunto: ${subject.value}\n\n${body}${imagenesPreviewNote.value}\n\n(Enlace compartido: al abrirlo se pide documento; solo el funcionario solicitante puede firmar.)`;
  }
  if (isSemanaReportMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => c.email)
      .join(', ') || '(sin equipo con email)';
    return `Para: ${para}\n\nAsunto: ${subject.value}\n\n${body}\n\n(Adjunto: PDF bitácora semanal)`;
  }
  if (isFirmasSemanaMode.value) {
    const para = allContactosTo.value
      .filter((c) => selectedTo.value.includes(c.email))
      .map((c) => `${c.nombre || c.email} <${c.email}>`)
      .join('\n      ') || '(sin funcionarios con correo)';
    const omitNote = firmasOmitidosPreview.value.length
      ? `\n\nOmitidos (${firmasOmitidosPreview.value.length}):\n${firmasOmitidosPreview.value.map((o) =>
        `- ${o.funcionario || '—'}: ${o.motivo || 'Sin datos'}`,
      ).join('\n')}`
      : '';
    const gruposNote = firmasGruposPreview.value.length
      ? `\n\nPDF personal por funcionario:\n${firmasGruposPreview.value.map((g) =>
        `- ${g.funcionario}${g.email ? ` <${g.email}>` : ''}: ${g.pendientesFirma} pendiente(s)`,
      ).join('\n')}`
      : '';
    return `Para:\n      ${para}\n\nAsunto: ${subject.value}\n\n${body}${gruposNote}${omitNote}\n\n(Cada funcionario recibe su PDF y un enlace personal de firma.)`;
  }
  if (isActreunFirmasMode.value) {
    const seleccionados = allContactosTo.value.filter((c) => selectedTo.value.includes(c.email));
    const para = seleccionados
      .map((c) => `${c.nombre || c.email} <${c.email}>`)
      .join('\n      ') || '(sin asistentes con correo)';
    const omitNote = firmasOmitidosPreview.value.length
      ? `\n\nOmitidos (${firmasOmitidosPreview.value.length}):\n${firmasOmitidosPreview.value.map((o) =>
        `- ${o.nombre || '—'}: ${o.motivo || 'Sin datos'}`,
      ).join('\n')}`
      : '';
    return `Para:\n      ${para}\n\nAsunto: ${subject.value}\n\n${body}${omitNote}\n\n(Adjunto: PDF del acta para revisar compromisos y acuerdos)\n(Cada correo incluye un enlace personal de firma; se pedirá el número de documento.)`;
  }
  const first = allContactos.value.find((c) => selected.value.includes(c.email)) || { nombre: '' };
  const n = first.nombre || 'estimado(a)';
  return `Para: ${selected.value.join(', ') || '(ninguno)'}\n\nAsunto: ${subject.value}\n\n${body.replace(/\{\{nombre\}\}/g, n)}`;
});

const previewNombre = computed(() => {
  if (isBitacoraMode.value && funcionarioSolicitante.value) {
    return funcionarioSolicitante.value.displayName
      || formatNombreConTratamiento(
        funcionarioSolicitante.value.tratamiento,
        funcionarioSolicitante.value.nombre,
      );
  }
  if (isSplitRecipientsMode.value) {
    const first = allContactosTo.value.find((c) => selectedTo.value.includes(c.email));
    return first?.nombre || clienteNombre.value || 'estimado(a)';
  }
  const first = allContactos.value.find((c) => selected.value.includes(c.email));
  return first?.nombre || 'estimado(a)';
});

const imagenesPreviewNote = computed(() => {
  if (!isBitacoraMode.value || !imagenesSoporte.value.length) return '';
  return `\n\n(Evidencias: ${imagenesSoporte.value.length} miniatura(s) en el cuerpo + adjuntos en tamaño completo)`;
});

async function loadCronogramaPreviewData() {
  const [destData, previewRes] = await Promise.all([
    clientesApi.destinatarios(props.clienteCodigo),
    notificacionApi.previewCronograma(props.recordId, cronogramaTipo.value),
  ]);
  clienteNombre.value = destData.nombrecliente || props.clienteCodigo;
  defaultSubject.value = previewRes.subject || '';
  defaultBody.value = previewRes.body || '';
  subject.value = previewRes.subject || '';
  bodyText.value = previewRes.body || '';
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
  if (!contactosTo.value.length) {
    $q.notify({
      type: 'warning',
      message: 'El cliente no tiene contactos con correo. Agregue uno manualmente en Para.',
    });
  }
}

async function reloadCronogramaPreview() {
  if (!props.modelValue || !isCronogramaMode.value || !props.clienteCodigo || !props.recordId) return;
  loading.value = true;
  try {
    await loadCronogramaPreviewData();
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo cargar la vista previa del cronograma',
    });
  } finally {
    loading.value = false;
  }
}

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
    cronogramaTipo.value = 'programacion';
    conSoportes.value = false;
    adjuntosCxc.value = [];
    pdfCxcFilename.value = '';
    remitenteCxc.value = '';
    funcionarioSolicitante.value = null;
    imagenesSoporte.value = [];
    removingImagenIndex.value = -1;
    firmasGruposPreview.value = [];
    firmasOmitidosPreview.value = [];
    agendaOpen.value = false;
    agendaFilter.value = '';
    agendaRows.value = [];
    agendaSelected.value = [];
    try {
      let preview;
      if (isCronogramaMode.value) {
        await loadCronogramaPreviewData();
        return;
      }
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

      if (isFirmasSemanaMode.value) {
        const previewData = await bitacoraApi.previewFirmasSemana(props.recordId, props.clienteCodigo);
        clienteNombre.value = previewData.nombrecliente || props.clienteCodigo;
        firmasGruposPreview.value = Array.isArray(previewData.grupos) ? previewData.grupos : [];
        firmasOmitidosPreview.value = Array.isArray(previewData.omitidos)
          ? previewData.omitidos.map((o) => ({
            ...o,
            nombre: o.funcionario || o.nombre,
          }))
          : [];
        contactosTo.value = (previewData.enviables || []).map((p, i) => ({
          id: `func-${p.funcionarioKey || i}`,
          email: p.email,
          nombre: p.funcionario || p.email,
          cargo: p.cargo || 'Funcionario solicitante',
          documento: p.documento,
          funcionarioKey: p.funcionarioKey,
        }));
        contactosCc.value = [];
        selectedTo.value = contactosTo.value.map((c) => c.email);
        selectedCc.value = [];
        defaultSubject.value = previewData.subject || '';
        defaultBody.value = previewData.body || '';
        subject.value = previewData.subject || '';
        bodyText.value = previewData.body || '';
        if (!contactosTo.value.length) {
          $q.notify({
            type: 'warning',
            message: firmasOmitidosPreview.value.length
              ? 'Ningún funcionario pendiente tiene correo y documento válidos. Revise Clientes → Funcionarios.'
              : 'No hay firmas pendientes por enviar.',
          });
        }
        return;
      }

      if (isActproyMode.value) {
        const [destData, previewData] = await Promise.all([
          clientesApi.destinatarios(props.clienteCodigo),
          actproyApi.previewInforme(props.recordId),
        ]);
        clienteNombre.value = destData.nombrecliente || props.clienteCodigo;
        defaultSubject.value = previewData.subject || '';
        defaultBody.value = previewData.body || '';
        subject.value = previewData.subject || '';
        bodyText.value = previewData.body || '';
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
        if (!contactosTo.value.length) {
          $q.notify({
            type: 'warning',
            message: 'El cliente no tiene contactos con correo. Agregue uno manualmente en Para.',
          });
        }
        return;
      }

      if (isActreunMode.value) {
        const [destData, previewData] = await Promise.all([
          clientesApi.destinatarios(props.clienteCodigo),
          actreunApi.previewActa(props.recordId),
        ]);
        clienteNombre.value = destData.nombrecliente || props.clienteCodigo;
        defaultSubject.value = previewData.subject || '';
        defaultBody.value = previewData.body || '';
        subject.value = previewData.subject || '';
        bodyText.value = previewData.body || '';
        contactosTo.value = (destData.equipoConEmail || []).map((c, i) => ({
          ...c,
          id: `to-${i}-${c.email}`,
        }));
        contactosCc.value = [];
        selectedTo.value = contactosTo.value.map((c) => c.email);
        selectedCc.value = [];
        if (!contactosTo.value.length) {
          $q.notify({
            type: 'warning',
            message: 'El equipo no tiene correos registrados. Agregue uno manualmente en Para.',
          });
        }
        return;
      }

      if (isActreunFirmasMode.value) {
        const previewData = await actreunApi.previewFirmas(props.recordId);
        clienteNombre.value = previewData.nombrecliente || props.clienteCodigo;
        defaultSubject.value = previewData.subject || '';
        defaultBody.value = previewData.body || '';
        subject.value = previewData.subject || '';
        bodyText.value = previewData.body || '';
        firmasOmitidosPreview.value = Array.isArray(previewData.omitidos) ? previewData.omitidos : [];
        contactosTo.value = (previewData.enviables || []).map((p, i) => ({
          id: `asis-${p.item}-${i}`,
          email: p.email,
          nombre: p.nombre || p.email,
          cargo: p.cargo || (p.lado === 'cliente' ? 'Cliente' : 'IX Colombia'),
          item: p.item,
          documento: p.documento,
        }));
        contactosCc.value = [];
        selectedTo.value = contactosTo.value.map((c) => c.email);
        selectedCc.value = [];
        if (!contactosTo.value.length) {
          $q.notify({
            type: 'warning',
            message: firmasOmitidosPreview.value.length
              ? 'Ningún asistente pendiente tiene correo y documento válidos.'
              : 'No hay firmas pendientes por enviar.',
          });
        }
        return;
      }

      if (isVipCuentaCobroMode.value) {
        const [destData, previewData] = await Promise.all([
          vipClientesApi.destinatarios(props.clienteCodigo),
          vipCuentasCobroApi.previewNotificacion(props.recordId),
        ]);
        clienteNombre.value = destData.nombrecliente || props.clienteCodigo;
        pdfCxcFilename.value = previewData.pdfFilename || '';
        remitenteCxc.value = previewData.remitente || '';
        defaultSubject.value = previewData.subject || '';
        defaultBody.value = previewData.body || '';
        subject.value = previewData.subject || '';
        bodyText.value = previewData.body || '';
        contactosTo.value = (destData.contactosConEmail || destData.conEmail || []).map((c, i) => ({
          ...c,
          id: `to-${i}-${c.email}`,
        }));
        contactosCc.value = [];
        selectedTo.value = contactosTo.value.map((c) => c.email);
        selectedCc.value = [];
        if (!contactosTo.value.length) {
          $q.notify({
            type: 'warning',
            message: 'Indique el email destino en el cliente VIP o agregue un destinatario manual en Para.',
          });
        }
        if (previewData.mailConfigured === false) {
          $q.notify({
            type: 'warning',
            message: 'Configure SMTP_FROM_CXC en el servidor (.env) para el remitente de cuentas de cobro.',
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
        funcionarioSolicitante.value = preview.funcionario || null;
        imagenesSoporte.value = Array.isArray(preview.imagenes) ? [...preview.imagenes] : [];
        const paraMap = new Map();
        const addPara = (c, cargo) => {
          const email = String(c?.email || '').trim();
          if (!email) return;
          const key = email.toLowerCase();
          if (paraMap.has(key)) return;
          const nombreDisplay = c.displayName
            || formatNombreConTratamiento(c.tratamiento, c.nombre || email);
          paraMap.set(key, {
            id: `para-${key}`,
            email,
            nombre: nombreDisplay,
            cargo: cargo || c.cargo || '',
          });
        };
        if (preview.funcionario?.email) {
          addPara(preview.funcionario, 'Funcionario solicitante');
        }
        for (const c of destData.contactosConEmail || []) addPara(c, c.cargo || 'Contacto cliente');
        for (const c of destData.equipoConEmail || []) addPara(c, c.cargo || 'Equipo');
        contactosTo.value = [...paraMap.values()];
        contactosCc.value = [];
        selectedTo.value = contactosTo.value.map((c) => c.email);
        selectedCc.value = [];
        if (!contactosTo.value.length) {
          $q.notify({
            type: 'warning',
            message: 'No hay contactos con correo. Agregue destinatarios manualmente en Para.',
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

function contactCardLabel(c) {
  const name = String(c?.nombre || '').trim();
  const email = String(c?.email || '').trim();
  const doc = String(c?.documento || '').trim();
  if (name && doc) return `${name} · Doc. ${doc}`;
  if (name && name.toLowerCase() !== email.toLowerCase()) return name;
  return email;
}

function showEmailTooltip(c) {
  const name = String(c?.nombre || '').trim();
  const email = String(c?.email || '').trim();
  return Boolean(name && email && name.toLowerCase() !== email.toLowerCase());
}

function selectAllTo() {
  selectedTo.value = allContactosTo.value.map((c) => c.email);
}

function selectAllCc() {
  selectedCc.value = displayContactosCc.value.map((c) => c.email);
}

function removeFromZone(email, zone) {
  const key = email.toLowerCase();
  if (zone === 'to') {
    contactosTo.value = contactosTo.value.filter((c) => c.email.toLowerCase() !== key);
    manualContactosTo.value = manualContactosTo.value.filter((c) => c.email.toLowerCase() !== key);
    selectedTo.value = selectedTo.value.filter((e) => e.toLowerCase() !== key);
  } else {
    contactosCc.value = contactosCc.value.filter((c) => c.email.toLowerCase() !== key);
    manualContactosCc.value = manualContactosCc.value.filter((c) => c.email.toLowerCase() !== key);
    selectedCc.value = selectedCc.value.filter((e) => e.toLowerCase() !== key);
  }
}

function existsInZone(email, zone) {
  const key = email.toLowerCase();
  const list = zone === 'to' ? displayContactosTo.value : displayContactosCc.value;
  return list.some((c) => c.email.toLowerCase() === key);
}

function moveContact(contact, fromZone, toZone) {
  if (fromZone === toZone || isEquipoOnlyMode.value) return;
  const email = contact.email;
  if (existsInZone(email, toZone)) {
    $q.notify({ type: 'info', message: 'Ese correo ya está en la columna destino' });
    return;
  }
  const wasSelected = fromZone === 'to'
    ? selectedTo.value.includes(email)
    : selectedCc.value.includes(email);
  removeFromZone(email, fromZone);
  const entry = {
    ...contact,
    id: `${toZone}-${Date.now()}-${email}`,
  };
  if (toZone === 'to') {
    if (contact.manual) manualContactosTo.value.push(entry);
    else contactosTo.value.push(entry);
    if (wasSelected && !selectedTo.value.includes(email)) selectedTo.value.push(email);
  } else {
    if (contact.manual) manualContactosCc.value.push(entry);
    else contactosCc.value.push(entry);
    if (wasSelected && !selectedCc.value.includes(email)) selectedCc.value.push(email);
  }
}

function onDragStart(contact, fromZone, event) {
  if (isEquipoOnlyMode.value) return;
  draggingEmail.value = contact.email;
  dragPayload.value = { contact, fromZone };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', contact.email);
  }
}

function onDragEnd() {
  draggingEmail.value = '';
  dragOverZone.value = '';
  dragPayload.value = null;
}

function onDragOver(zone) {
  if (isEquipoOnlyMode.value || !dragPayload.value) return;
  dragOverZone.value = zone;
}

function onDragLeave(zone) {
  if (dragOverZone.value === zone) dragOverZone.value = '';
}

function onDrop(toZone, event) {
  if (isEquipoOnlyMode.value) return;
  dragOverZone.value = '';
  const payload = dragPayload.value;
  if (!payload) return;
  moveContact(payload.contact, payload.fromZone, toZone);
  onDragEnd();
  event.stopPropagation();
}

function restorePreview() {
  subject.value = defaultSubject.value;
  bodyText.value = defaultBody.value;
}

async function removeImagenSoporte(index) {
  if (!props.recordId || index < 0 || index >= imagenesSoporte.value.length) return;
  removingImagenIndex.value = index;
  try {
    const next = imagenesSoporte.value.filter((_, i) => i !== index);
    await bitApi.update(props.recordId, {
      imagenes_soporte: next.length ? JSON.stringify(next) : '',
    });
    imagenesSoporte.value = next;
    $q.notify({ type: 'positive', message: 'Imagen quitada del soporte' });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo quitar la imagen',
    });
  } finally {
    removingImagenIndex.value = -1;
  }
}

function agendaEntryFromRow(c) {
  return {
    id: `ag-${c.codigo}`,
    codigo: c.codigo,
    email: c.email,
    nombre: c.nombre,
    cargo: c.cargo || 'Agenda',
    empresa: c.empresa,
    categoria: c.categoria,
    agenda: true,
    manual: true,
  };
}

function existsInSplitZone(email, zone) {
  const key = String(email || '').toLowerCase();
  if (!key) return false;
  if (zone === 'cc') {
    return [...contactosCc.value, ...manualContactosCc.value].some(
      (c) => String(c.email || '').toLowerCase() === key,
    );
  }
  if (isSplitRecipientsMode.value) {
    return [...contactosTo.value, ...manualContactosTo.value].some(
      (c) => String(c.email || '').toLowerCase() === key,
    );
  }
  return allContactos.value.some((c) => String(c.email || '').toLowerCase() === key);
}

function addAgendaContacts(contacts, zone) {
  let added = 0;
  const targetZone = isEquipoOnlyMode.value || !isSplitRecipientsMode.value ? 'to' : zone;
  for (const c of contacts) {
    const email = String(c.email || '').trim();
    if (!EMAIL_RE.test(email)) continue;

    if (!isSplitRecipientsMode.value) {
      const exists = allContactos.value.some((x) => x.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        if (!selected.value.includes(email)) selected.value.push(email);
        continue;
      }
      manualContactos.value.push(agendaEntryFromRow(c));
      selected.value.push(email);
      added += 1;
      continue;
    }

    if (existsInSplitZone(email, targetZone)) {
      const selectedList = targetZone === 'cc' ? selectedCc : selectedTo;
      if (!selectedList.value.includes(email)) selectedList.value.push(email);
      continue;
    }
    const entry = agendaEntryFromRow(c);
    if (targetZone === 'cc') {
      manualContactosCc.value.push(entry);
      if (!selectedCc.value.includes(email)) selectedCc.value.push(email);
    } else {
      manualContactosTo.value.push(entry);
      if (!selectedTo.value.includes(email)) selectedTo.value.push(email);
    }
    added += 1;
  }
  return added;
}

async function loadAgendaRows() {
  loadingAgenda.value = true;
  try {
    agendaRows.value = await agendaContactosApi.listActivos();
  } catch {
    agendaRows.value = [];
  } finally {
    loadingAgenda.value = false;
  }
}

async function abrirAgendaDialog() {
  agendaSelected.value = [];
  agendaFilter.value = '';
  agendaOpen.value = true;
  await loadAgendaRows();
}

function agregarAgendaSeleccion(zone) {
  const picked = agendaRows.value.filter((c) => agendaSelected.value.includes(c.codigo));
  if (!picked.length) {
    $q.notify({ type: 'warning', message: 'Seleccione al menos un contacto' });
    return;
  }
  const added = addAgendaContacts(picked, zone);
  agendaOpen.value = false;
  $q.notify({
    type: 'positive',
    message: `${added || picked.length} contacto(s) agregados a ${zone === 'cc' && !isEquipoOnlyMode.value ? 'CC' : 'Para'}`,
  });
}

function agregarEquipoAgendaCc() {
  const equipo = agendaRows.value.filter((c) => c.categoria === 'equipo');
  if (!equipo.length) {
    $q.notify({ type: 'warning', message: 'No hay contactos de equipo en la agenda' });
    return;
  }
  const added = addAgendaContacts(equipo, 'cc');
  agendaOpen.value = false;
  $q.notify({ type: 'positive', message: `${added || equipo.length} contacto(s) del equipo en CC` });
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

function onCxcFilesRejected(rejected) {
  const reason = rejected[0]?.failedPropValidation;
  const msg = reason === 'max-total-size'
    ? 'Los adjuntos superan el límite total (15 MB).'
    : reason === 'max-files'
      ? 'Máximo 10 adjuntos.'
      : 'Adjunto no permitido.';
  $q.notify({ type: 'warning', message: msg });
}

function confirmSend() {
  if (!canSend.value) return;
  if (isSplitRecipientsMode.value) {
    const payload = {
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
    };
    if (isCronogramaMode.value) payload.tipo = cronogramaTipo.value;
    if (isCronogramaMode.value && cronogramaTipo.value === 'seguimiento') {
      payload.conSoportes = conSoportes.value;
    }
    if (isVipCuentaCobroMode.value) {
      emit('send', { payload, files: adjuntosCxc.value || [] });
      return;
    }
    if (isActreunFirmasMode.value) {
      payload.items = allContactosTo.value
        .filter((c) => selectedTo.value.includes(c.email) && c.item != null)
        .map((c) => c.item);
    }
    emit('send', payload);
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

.notify-dialog__drag-hint {
  margin: 0;
  padding: 6px 10px;
  font-size: 0.76rem;
  color: #64748b;
  background: #fff;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}

.notify-dialog__section {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &--drop-active {
    border-color: #1565c0;
    box-shadow: inset 0 0 0 2px rgba(21, 101, 192, 0.15);
    background: #f8fbff;
  }
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
  margin-bottom: 5px;
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
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 5px;
}

.notify-dialog__card {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  min-height: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fafafa;
  cursor: grab;
  transition: border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
  user-select: none;

  :deep(.q-checkbox) {
    margin-top: 0;
  }

  :deep(.q-checkbox__inner) {
    font-size: 28px;
  }

  &:active {
    cursor: grabbing;
  }

  &--dragging {
    opacity: 0.45;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

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

.notify-dialog__move-btn {
  flex-shrink: 0;
  margin-left: auto;
  align-self: center;
  min-width: 22px;
  min-height: 22px;
}

.notify-dialog__card-text {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  flex: 1;
}

.notify-dialog__card-line {
  font-size: 0.66rem;
  font-weight: 500;
  color: #334155;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notify-dialog__card-name {
  font-size: 0.68rem;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.notify-dialog__card-meta {
  font-size: 0.62rem;
  color: #64748b;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.notify-dialog__images-hint {
  margin: 0 0 8px;
  font-size: 0.76rem;
  color: #64748b;
}

.notify-dialog__images-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notify-dialog__image-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.notify-dialog__image-thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.notify-dialog__image-meta {
  flex: 1;
  min-width: 0;
}

.notify-dialog__image-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notify-dialog__actions {
  flex-shrink: 0;
  padding: 8px 14px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.notify-dialog__agenda-btn {
  min-height: 40px;
}

.notify-agenda {
  min-width: min(560px, 96vw);
  max-width: 96vw;
}

.notify-agenda__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
}

.notify-agenda__list {
  position: relative;
  max-height: min(420px, 55vh);
  overflow: auto;
  min-height: 120px;
}

.notify-agenda__actions {
  flex-wrap: wrap;
  gap: 4px;
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
