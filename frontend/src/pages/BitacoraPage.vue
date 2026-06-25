<template>
  <q-page class="bitacora-page">
    <section class="bit-hero">
      <div class="bit-hero__main">
        <div class="bit-hero__icon">
          <q-icon name="support_agent" size="22px" />
        </div>
        <div>
          <p class="bit-hero__eyebrow">Soporte</p>
          <h1 class="bit-hero__title">Bitácora</h1>
          <p class="bit-hero__subtitle">
            Expanda la semana para ver soportes agrupados por cliente.
          </p>
        </div>
      </div>
      <div class="bit-hero__meta">
        <span v-if="expandedCnsbite" class="bit-hero__chip bit-hero__chip--active">
          Semana <strong>{{ expandedWeekLabel }}</strong>
        </span>
        <span v-if="expandedCnsbite" class="bit-hero__chip">
          <strong>{{ expandedWeekTotal }}</strong>
          {{ expandedWeekTotal === 1 ? 'soporte' : 'soportes' }}
        </span>
      </div>
    </section>

    <q-banner v-if="mailConfigured === false" dense rounded class="bit-alert q-mb-md">
      <template #avatar><q-icon name="mail" color="orange" /></template>
      Correo no configurado en el servidor (SMTP). Configure
      <code>SMTP_HOST</code> y <code>SMTP_USER</code> en el <code>.env</code> del backend.
    </q-banner>

    <section class="bit-filters">
      <div class="bit-filters__row">
        <LookupSelect
          v-model="filterCliente"
          resource="clientes"
          value-field="codigo"
          label-field="nombrecliente"
          label="Cliente"
          clearable
          dense
          class="bit-filters__cliente"
          @update:model-value="onFilterChange"
        />
        <q-input
          v-model="filterFechaini"
          dense
          outlined
          type="date"
          label="Fecha inicial"
          stack-label
          class="bit-filters__date"
          bg-color="white"
          @update:model-value="onFilterChange"
        />
        <q-input
          v-model="filterFechafin"
          dense
          outlined
          type="date"
          label="Fecha final"
          stack-label
          class="bit-filters__date"
          bg-color="white"
          @update:model-value="onFilterChange"
        />
        <q-input
          v-model="filterAno"
          dense
          outlined
          label="Vigencia (año)"
          maxlength="4"
          class="bit-filters__ano"
          bg-color="white"
          @update:model-value="onFilterChange"
        />
        <q-select
          v-model="filterEstado"
          dense
          outlined
          label="Estado"
          :options="estadoOptions"
          emit-value
          map-options
          class="bit-filters__estado"
          bg-color="white"
          @update:model-value="onFilterChange"
        />
        <q-btn flat color="primary" icon="refresh" label="Actualizar" class="bit-btn" @click="reloadAll" />
      </div>
    </section>

    <section class="bit-panel bit-panel--encabezado">
      <header class="bit-panel__header">
        <div>
          <h2 class="bit-panel__title">Semanas de soporte</h2>
        </div>
        <div class="bit-panel__actions">
          <q-input
            v-model="searchBit"
            dense
            outlined
            debounce="400"
            placeholder="Buscar soporte..."
            class="bit-search"
            bg-color="white"
            :disable="!expandedCnsbite"
            @update:model-value="onSearchBit"
          >
            <template #prepend><q-icon name="search" color="grey-6" /></template>
          </q-input>
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nueva semana"
            class="bit-btn"
            @click="openBiteCreate"
          />
        </div>
      </header>

      <q-table
        class="bit-table bit-table--compact"
        :rows="biteRows"
        :columns="biteColumns"
        row-key="cnsbite"
        :loading="loadingBite"
        v-model:pagination="pagBite"
        :rows-per-page-options="[5, 10, 15]"
        flat
        bordered
        @request="onBiteRequest"
      >
        <template #body="props">
          <q-tr
            :props="props"
            class="bit-table__row"
            :class="{ 'bit-table__row--expanded': expandedCnsbite === props.row.cnsbite }"
            @click="toggleWeekExpand(props.row)"
          >
            <q-td auto-width class="bit-table__expand-cell" @click.stop="toggleWeekExpand(props.row)">
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="expandedCnsbite === props.row.cnsbite ? 'expand_less' : 'expand_more'"
                color="primary"
              />
            </q-td>
            <q-td auto-width @click.stop>
              <q-btn flat dense round icon="edit" color="primary" @click="openBiteEdit(props.row)">
                <q-tooltip>Editar encabezado</q-tooltip>
              </q-btn>
            </q-td>
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <template v-if="col.name === 'fechaini' || col.name === 'fechafin'">
                {{ fmtDate(props.row[col.name]) }}
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>

          <q-tr v-if="expandedCnsbite === props.row.cnsbite" class="bit-table__expand-row">
            <q-td :colspan="biteColumns.length">
              <div class="bit-week-expand">
                <header class="bit-week-expand__header">
                  <div>
                    <h3 class="bit-week-expand__title">
                      Semana {{ props.row.idsemana }}
                      <span v-if="props.row.observacion" class="bit-week-expand__sub">· {{ props.row.observacion }}</span>
                    </h3>
                  </div>
                  <q-btn
                    unelevated
                    color="primary"
                    icon="add"
                    label="Agregar soporte"
                    size="sm"
                    class="bit-btn"
                    @click="openBitCreate(props.row.cnsbite)"
                  />
                </header>

                <q-linear-progress v-if="isWeekLoading(props.row.cnsbite)" indeterminate color="primary" class="q-mb-sm" />

                <q-banner
                  v-else-if="!clientGroups(props.row.cnsbite).length"
                  dense
                  rounded
                  class="bit-empty"
                >
                  <template #avatar><q-icon name="inbox" color="primary" /></template>
                  No hay soportes en esta semana. Use <strong>Agregar soporte</strong> para crear el primero.
                </q-banner>

                <div v-else class="bit-client-list">
                  <section
                    v-for="group in clientGroups(props.row.cnsbite)"
                    :key="clientKey(props.row.cnsbite, group.cliente)"
                    class="bit-client-group"
                    :class="{ 'bit-client-group--open': isClienteOpen(props.row.cnsbite, group.cliente) }"
                  >
                    <header
                      class="bit-client-group__header"
                      @click="toggleCliente(props.row.cnsbite, group.cliente)"
                    >
                      <q-btn
                        flat
                        dense
                        round
                        size="sm"
                        :icon="isClienteOpen(props.row.cnsbite, group.cliente) ? 'expand_less' : 'expand_more'"
                        color="primary"
                        @click.stop="toggleCliente(props.row.cnsbite, group.cliente)"
                      />
                      <div class="bit-client-group__info">
                        <strong>{{ group.cliente || '—' }}</strong>
                        <span v-if="group.nombrecliente"> · {{ group.nombrecliente }}</span>
                      </div>
                      <q-badge
                        :color="semanaClienteColor(group.semanaEstado)"
                        :label="group.semanaEstado || 'Abierta'"
                        class="bit-badge"
                      />
                      <q-badge color="indigo-7" class="bit-client-group__count">
                        {{ group.items.length }}
                      </q-badge>
                      <q-space />
                      <q-btn
                        flat
                        dense
                        color="red-8"
                        icon="picture_as_pdf"
                        label="PDF"
                        size="sm"
                        class="bit-btn"
                        :loading="pdfLoadingKey === clientKey(props.row.cnsbite, group.cliente)"
                        @click.stop="openBitacoraPdf(props.row, group)"
                      />
                      <q-btn
                        v-if="!isSemanaClienteCerrada(group.semanaEstado)"
                        flat
                        dense
                        color="positive"
                        icon="lock"
                        label="Cerrar semana"
                        size="sm"
                        class="bit-btn"
                        :loading="cerrarSemanaKey === clientKey(props.row.cnsbite, group.cliente)"
                        @click.stop="openCerrarSemanaCliente(props.row, group)"
                      />
                      <q-btn
                        flat
                        dense
                        color="teal"
                        icon="campaign"
                        label="Reportar"
                        size="sm"
                        class="bit-btn"
                        :disable="!isSemanaClienteCerrada(group.semanaEstado)"
                        :loading="sendingReporteKey === clientKey(props.row.cnsbite, group.cliente)"
                        @click.stop="openReporteSemana(props.row, group)"
                      >
                        <q-tooltip v-if="!isSemanaClienteCerrada(group.semanaEstado)">
                          Cierre la semana del cliente antes de reportar
                        </q-tooltip>
                      </q-btn>
                      <q-btn
                        flat
                        dense
                        color="primary"
                        icon="add"
                        label="Agregar"
                        size="sm"
                        class="bit-btn"
                        :disable="isSemanaClienteCerrada(group.semanaEstado)"
                        @click.stop="openBitCreate(props.row.cnsbite, group.cliente)"
                      />
                    </header>

                    <div v-if="isClienteOpen(props.row.cnsbite, group.cliente)" class="bit-client-group__body">
                      <div
                        v-for="item in group.items"
                        :key="item.cnssoporte"
                        class="bit-soporte"
                        :class="{
                          'bit-soporte--detail-open': expandedCnssoporte === item.cnssoporte,
                          'bit-soporte--locked': isSoporteBloqueado(item, props.row.cnsbite),
                        }"
                      >
                        <div class="bit-soporte__row" @click="toggleSoporteDetail(item.cnssoporte)">
                          <q-btn
                            flat
                            dense
                            round
                            size="sm"
                            :icon="expandedCnssoporte === item.cnssoporte ? 'expand_less' : 'expand_more'"
                            color="primary"
                            @click.stop="toggleSoporteDetail(item.cnssoporte)"
                          />
                          <span class="bit-soporte__id">{{ item.cnssoporte }}</span>
                          <span class="bit-soporte__fecha">{{ fmtDate(item.fecha) }}</span>
                          <span class="bit-soporte__clase">{{ item.clase || '—' }}</span>
                          <q-badge
                            :color="estadoColor(item.estado)"
                            :label="item.estado || '—'"
                            class="bit-badge"
                          />
                          <q-badge
                            v-if="isTerminado(item.estado)"
                            :color="firmaBadgeColor(item)"
                            :label="firmaBadgeLabel(item)"
                            class="bit-badge"
                          />
                          <q-space />
                          <q-chip
                            v-if="isSoporteBloqueado(item, props.row.cnsbite)"
                            dense
                            size="sm"
                            color="grey-3"
                            text-color="grey-8"
                            icon="lock"
                            class="bit-soporte__lock"
                          >
                            {{ hasFirmaAceptacion(item) ? 'Firmado' : 'Cerrado' }}
                          </q-chip>
                          <div v-else class="bit-actions" @click.stop>
                            <q-btn
                              v-if="!isTerminado(item.estado)"
                              flat
                              dense
                              round
                              icon="task_alt"
                              color="positive"
                              @click="openCerrarBit(item)"
                            >
                              <q-tooltip>Cerrar soporte</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="add_photo_alternate"
                              color="deep-orange"
                              :disable="!puedeEditarEvidencias(item, props.row.cnsbite)"
                              @click="openBitEvidencias(item)"
                            >
                              <q-badge
                                v-if="imagenesCount(item) > 0"
                                color="deep-orange-8"
                                text-color="white"
                                floating
                                :label="String(imagenesCount(item))"
                              />
                              <q-tooltip>
                                {{ evidenciasTooltip(item, props.row.cnsbite) }}
                              </q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="edit"
                              color="primary"
                              :disable="!puedeEditarSoporte(item, props.row.cnsbite)"
                              @click="openBitEdit(item)"
                            >
                              <q-tooltip>{{ editTooltip(item, props.row.cnsbite) }}</q-tooltip>
                            </q-btn>
                            <q-btn flat dense round icon="delete" color="negative" @click="confirmBitDelete(item)">
                              <q-tooltip>Eliminar</q-tooltip>
                            </q-btn>
                            <q-btn
                              flat
                              dense
                              round
                              icon="forward_to_inbox"
                              color="teal"
                              :disable="!item.cliente || !isTerminado(item.estado)"
                              :loading="sendingNotifyId === item.cnssoporte"
                              @click="openNotifyBit(item)"
                            >
                              <q-tooltip>
                                {{ !isTerminado(item.estado) ? 'Cierre el soporte antes de enviar' : 'Enviar correo' }}
                              </q-tooltip>
                            </q-btn>
                          </div>
                          <q-tooltip v-if="isSoporteBloqueado(item, props.row.cnsbite)">
                            {{ soporteBloqueoMensaje(item, props.row.cnsbite) }}
                          </q-tooltip>
                        </div>

                        <div v-if="expandedCnssoporte === item.cnssoporte" class="bit-soporte__detail">
                          <div class="bit-detail-meta">
                            <div v-if="item.soporte" class="bit-detail-meta__item">
                              <span class="bit-detail-meta__label">Soporte</span>
                              <span class="bit-detail-meta__value">{{ item.soporte }}</span>
                            </div>
                            <div v-if="item.funcionario" class="bit-detail-meta__item">
                              <span class="bit-detail-meta__label">Funcionario</span>
                              <span class="bit-detail-meta__value">{{ item.funcionario }}</span>
                            </div>
                            <div v-if="item.medio" class="bit-detail-meta__item">
                              <span class="bit-detail-meta__label">Medio</span>
                              <span class="bit-detail-meta__value">{{ item.medio }}</span>
                            </div>
                            <div v-if="item.fechar" class="bit-detail-meta__item">
                              <span class="bit-detail-meta__label">Fecha cierre</span>
                              <span class="bit-detail-meta__value">{{ fmtDate(item.fechar) }}</span>
                            </div>
                            <div v-if="isTerminado(item.estado)" class="bit-detail-meta__item">
                              <span class="bit-detail-meta__label">Firma aceptación</span>
                              <span class="bit-detail-meta__value">
                                {{ hasFirmaAceptacion(item) ? fmtDate(item.firma_fecha) : 'Pendiente' }}
                              </span>
                            </div>
                          </div>
                          <div class="bit-detail-blocks">
                            <article class="bit-detail-block">
                              <h4 class="bit-detail-block__label">Solicitud</h4>
                              <p class="bit-detail-block__text">{{ item.solicitud || '—' }}</p>
                            </article>
                            <article class="bit-detail-block">
                              <h4 class="bit-detail-block__label">Respuesta</h4>
                              <p class="bit-detail-block__text">{{ item.respuesta || '—' }}</p>
                            </article>
                            <article class="bit-detail-block">
                              <h4 class="bit-detail-block__label">Observaciones</h4>
                              <p class="bit-detail-block__text">{{ item.observaciones || '—' }}</p>
                            </article>
                            <article v-if="soporteImagenes(item).length" class="bit-detail-block">
                              <h4 class="bit-detail-block__label">Evidencias</h4>
                              <div class="bit-detail-images">
                                <figure
                                  v-for="(img, imgIdx) in soporteImagenes(item)"
                                  :key="imgIdx"
                                  class="bit-detail-images__item"
                                >
                                  <img :src="img.data" :alt="img.nombre" />
                                  <figcaption>{{ img.nombre }}</figcaption>
                                </figure>
                              </div>
                            </article>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </section>

    <GenericForm
      v-model="formBiteOpen"
      :module="biteModule"
      :record="biteCurrent"
      :is-edit="biteIsEdit"
      :context="semanaLookupContext"
      @saved="onBiteSaved"
    />

    <GenericForm
      v-model="formBitOpen"
      :module="bitModule"
      :record="bitCurrent"
      :is-edit="bitIsEdit"
      :context="bitFormContext"
      @saved="onBitSaved"
    />

    <NotifyRecipientDialog
      v-model="notifyOpen"
      :cliente-codigo="notifyCliente"
      :record-id="notifyRecordId"
      :notify-type="notifyType"
      :title="notifyTitle"
      :sending="sendingNotify"
      @send="onNotifySend"
    />

    <q-dialog v-model="evidenciasOpen" persistent>
      <q-card class="bit-cerrar-dialog" style="min-width: 520px; max-width: 95vw">
        <q-card-section class="bit-cerrar-dialog__header" style="background: linear-gradient(135deg, #ef6c00 0%, #e65100 100%)">
          <div>
            <p class="bit-cerrar-dialog__eyebrow">Evidencias del soporte</p>
            <div class="bit-cerrar-dialog__title">{{ evidenciasRow?.cnssoporte }}</div>
          </div>
          <q-space />
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-none relative-position">
          <p class="bit-cerrar-dialog__hint">
            Estas imágenes se guardan con el soporte y se incluyen automáticamente al enviar el correo (no van en el editor del correo).
          </p>
          <p v-if="!evidenciasLoading" class="bit-cerrar-dialog__hint q-mb-sm">
            Pulse <strong>Agregar</strong>, elija las fotos y luego <strong>Guardar evidencias</strong>. Hasta guardar, no quedan registradas.
          </p>
          <q-inner-loading :showing="evidenciasLoading" label="Cargando imágenes..." />
          <ImageGalleryField
            v-if="evidenciasOpen && !evidenciasLoading"
            :key="evidenciasRow?.cnssoporte"
            v-model="evidenciasImagenes"
            label="Imágenes de soporte"
            hint="Capturas o fotos del trabajo realizado (máx. 5, 1 MB c/u)."
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            color="deep-orange"
            icon="save"
            label="Guardar evidencias"
            :loading="evidenciasSaving"
            @click="saveBitEvidencias"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="cerrarSemanaOpen" persistent>
      <q-card class="bit-cerrar-dialog">
        <q-card-section class="bit-cerrar-dialog__header">
          <div>
            <p class="bit-cerrar-dialog__eyebrow">Cierre semanal por cliente</p>
            <div class="bit-cerrar-dialog__title">
              {{ cerrarSemanaGroup?.nombrecliente || cerrarSemanaGroup?.cliente }}
            </div>
          </div>
          <q-space />
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section v-if="cerrarSemanaOpciones" class="q-pt-none">
          <p class="bit-cerrar-dialog__hint">
            Estado actual:
            <q-badge :color="semanaClienteColor(cerrarSemanaOpciones.estado)" :label="cerrarSemanaOpciones.estado" />
          </p>
          <p v-if="!cerrarSemanaOpciones.puedeCerrar" class="bit-cerrar-dialog__hint">
            {{ cerrarSemanaOpciones.motivoCerrar }}
          </p>
          <p v-else class="bit-cerrar-dialog__hint">
            {{ cerrarSemanaOpciones.totalSoportes }} soporte(s) listos para cerrar la semana de este cliente.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            color="positive"
            icon="lock"
            label="Cerrar semana"
            :disable="!cerrarSemanaOpciones?.puedeCerrar"
            :loading="cerrarSemanaSaving"
            @click="submitCerrarSemanaCliente"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="cerrarOpen" persistent>
      <q-card class="bit-cerrar-dialog">
        <q-card-section class="bit-cerrar-dialog__header">
          <div>
            <p class="bit-cerrar-dialog__eyebrow">Finalizar soporte</p>
            <div class="bit-cerrar-dialog__title">{{ cerrarRow?.cnssoporte }}</div>
          </div>
          <q-space />
          <q-btn flat dense round icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <p v-if="cerrarSemana.fechaini && cerrarSemana.fechafin" class="bit-cerrar-dialog__hint">
            Las fechas deben estar entre {{ cerrarSemana.fechaini }} y {{ cerrarSemana.fechafin }}.
          </p>
          <q-input
            v-model="cerrarFechar"
            label="Fecha cierre"
            type="date"
            outlined
            dense
            stack-label
            class="q-mb-md"
            :min="cerrarSemana.fechaini"
            :max="cerrarSemana.fechafin"
            :rules="[(v) => !!v || 'Requerido', (v) => !v || (v >= cerrarSemana.fechaini && v <= cerrarSemana.fechafin) || 'Fuera de la semana']"
          />
          <q-input
            v-model="cerrarRespuesta"
            label="Respuesta"
            type="textarea"
            autogrow
            outlined
            dense
            :rules="[(v) => !!String(v || '').trim() || 'La respuesta es obligatoria']"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            color="positive"
            icon="task_alt"
            label="Cerrar soporte"
            :loading="cerrarSaving"
            @click="submitCerrarBit"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <PDFViewerComponent
      v-if="pdfDocument"
      ref="pdfRef"
      :document="pdfDocument"
      :document-name="pdfDocumentName"
      @close="pdfDocument = null"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useResource, notificacionApi, bitacoraApi } from 'src/services/api';
import { api } from 'src/boot/axios';
import { findModule } from 'src/config/modules';
import GenericForm from 'components/GenericForm.vue';
import LookupSelect from 'components/LookupSelect.vue';
import NotifyRecipientDialog from 'components/NotifyRecipientDialog.vue';
import ImageGalleryField from 'components/ImageGalleryField.vue';
import PDFViewerComponent from 'components/PDFViewerComponent.vue';

const $q = useQuasar();
const biteApi = useResource('bitacora_encabezados');
const bitApi = useResource('bitacora');
const biteMod = findModule('bitacora_encabezados');
const bitMod = findModule('bitacora');

const biteModule = computed(() => biteMod);
const bitModule = computed(() => bitMod);

const estadoOptions = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Nuevo', value: 'Nuevo' },
  { label: 'Proceso', value: 'Proceso' },
  { label: 'Terminado', value: 'Terminado' },
];

const biteColumns = computed(() => [
  { name: 'expand', label: '', field: 'expand', align: 'left', style: 'width: 40px' },
  { name: 'acciones', label: '', field: 'acciones', align: 'left', style: 'width: 48px' },
  ...biteMod.columns,
]);

const filterCliente = ref('');
const filterFechaini = ref(monthStartISO());
const filterFechafin = ref(monthEndISO());
const filterAno = ref(String(new Date().getFullYear()));
const filterEstado = ref('Todos');

const expandedCnsbite = ref(null);
const openClienteKey = ref('');
const expandedCnssoporte = ref(null);
const searchBit = ref('');

const biteRows = ref([]);
const loadingBite = ref(false);
const pagBite = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const weekBita = reactive({});
const bitaDetailCache = reactive({});

const formBiteOpen = ref(false);
const biteIsEdit = ref(false);
const biteCurrent = ref({});

const formBitOpen = ref(false);
const bitIsEdit = ref(false);
const bitCurrent = ref({});
const bitCreateCnsbite = ref('');

const mailConfigured = ref(null);
const notifyOpen = ref(false);
const notifyType = ref('bitacora');
const notifyTitle = ref('Enviar registro de soporte');
const notifyCliente = ref('');
const notifyRecordId = ref('');
const notifyCnsbite = ref('');
const sendingNotify = ref(false);
const sendingNotifyId = ref('');
const evidenciasOpen = ref(false);
const evidenciasRow = ref(null);
const evidenciasImagenes = ref('');
const evidenciasLoading = ref(false);
const evidenciasSaving = ref(false);
const sendingReporteKey = ref('');

const cerrarSemanaOpen = ref(false);
const cerrarSemanaRow = ref(null);
const cerrarSemanaGroup = ref(null);
const cerrarSemanaOpciones = ref(null);
const cerrarSemanaSaving = ref(false);
const cerrarSemanaKey = ref('');

const pdfDocument = ref(null);
const pdfDocumentName = ref('bitacora.pdf');
const pdfRef = ref(null);
const pdfLoadingKey = ref('');

const cerrarOpen = ref(false);
const cerrarRow = ref(null);
const cerrarRespuesta = ref('');
const cerrarFechar = ref('');
const cerrarSaving = ref(false);
const cerrarSemana = ref({ fechaini: '', fechafin: '' });

function weekForCnsbite(cnsbite) {
  return biteRows.value.find((r) => r.cnsbite === cnsbite);
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

function defaultFechaInWeek(week) {
  if (!week?.fechaini || !week?.fechafin) return todayISO();
  const min = toDateKey(week.fechaini);
  const max = toDateKey(week.fechafin);
  const today = todayISO();
  if (today >= min && today <= max) return today;
  return min;
}

function isTerminado(estado) {
  return String(estado || '').toLowerCase() === 'terminado';
}

function isSemanaClienteCerrada(estado) {
  return String(estado || '').toLowerCase() === 'cerrada';
}

function semanaClienteColor(estado) {
  const map = { Abierta: 'primary', Cerrada: 'positive' };
  return map[estado] || 'grey';
}

function hasFirmaAceptacion(item) {
  return Boolean(item?.firma && String(item.firma).trim()) || Boolean(item?.firma_fecha);
}

function puedeEditarEvidencias(item, cnsbite) {
  if (isSoporteBloqueado(item, cnsbite)) return false;
  if (hasFirmaAceptacion(item)) return false;
  return true;
}

function imagenesCount(item) {
  const n = Number(item?.imagenes_count);
  if (Number.isFinite(n) && n > 0) return n;
  return soporteImagenes(item).length;
}

function evidenciasTooltip(item, cnsbite) {
  if (hasFirmaAceptacion(item)) return 'Ya firmado; no se pueden cambiar las imágenes';
  if (isSoporteBloqueado(item, cnsbite)) return soporteBloqueoMensaje(item, cnsbite);
  const n = imagenesCount(item);
  if (n > 0) return `${n} imagen${n === 1 ? '' : 'es'} guardada${n === 1 ? '' : 's'} — clic para ver o editar`;
  return 'Sin imágenes — agregar evidencias del trabajo (van en el correo al enviar)';
}

function puedeEditarSoporte(item, cnsbite) {
  if (isSoporteBloqueado(item, cnsbite)) return false;
  return !isTerminado(item.estado);
}

function editTooltip(item, cnsbite) {
  if (isSoporteBloqueado(item, cnsbite)) return soporteBloqueoMensaje(item, cnsbite);
  if (isTerminado(item.estado)) return 'Use el botón naranja para imágenes; el soporte ya está cerrado';
  return 'Editar soporte (incluye imágenes al final del formulario)';
}

function isSoporteBloqueado(item, cnsbite) {
  if (hasFirmaAceptacion(item)) return true;
  const estados = weekBita[cnsbite]?.estados || {};
  return Boolean(item?.cliente && isSemanaClienteCerrada(estados[item.cliente]?.estado));
}

function soporteBloqueoMensaje(item, cnsbite) {
  if (hasFirmaAceptacion(item)) return 'Soporte firmado; no se permiten cambios';
  if (isSoporteBloqueado(item, cnsbite)) return 'Semana del cliente cerrada';
  return '';
}

function firmaBadgeColor(item) {
  return hasFirmaAceptacion(item) ? 'positive' : 'orange';
}

function firmaBadgeLabel(item) {
  return hasFirmaAceptacion(item) ? 'Firmado' : 'Sin firma';
}

const bitFormContext = computed(() => {
  const cnsbite = bitCreateCnsbite.value || expandedCnsbite.value || '';
  const week = weekForCnsbite(cnsbite);
  return {
    cnsbite,
    semanaFechaini: week?.fechaini ? toDateKey(week.fechaini) : '',
    semanaFechafin: week?.fechafin ? toDateKey(week.fechafin) : '',
  };
});

const semanaLookupContext = computed(() => ({
  fechaini: monthStartISO(),
  fechafin: monthEndISO(),
}));

const expandedWeekLabel = computed(() => {
  const row = biteRows.value.find((r) => r.cnsbite === expandedCnsbite.value);
  return row?.idsemana || expandedCnsbite.value || '';
});

const expandedWeekTotal = computed(() => {
  if (!expandedCnsbite.value) return 0;
  return weekBita[expandedCnsbite.value]?.rows?.length || 0;
});

function monthStartISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function monthEndISO(date = new Date()) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const y = last.getFullYear();
  const m = String(last.getMonth() + 1).padStart(2, '0');
  const day = String(last.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseImagenesSoporte(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clientKey(cnsbite, cliente) {
  return `${cnsbite}~${cliente || '_'}`;
}

function fmtDate(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString('es-CO');
}

function estadoColor(estado) {
  const val = String(estado || '').toLowerCase();
  if (val.includes('termin')) return 'positive';
  if (val.includes('proces')) return 'warning';
  if (val.includes('nuevo')) return 'info';
  if (val.includes('cerr') || val.includes('soluc') || val.includes('atend')) return 'positive';
  if (val.includes('pend') || val.includes('abiert')) return 'warning';
  return 'primary';
}

function groupByCliente(rows, estados = {}) {
  const map = new Map();
  for (const row of rows) {
    const code = row.cliente || '';
    if (!map.has(code)) {
      map.set(code, {
        cliente: code,
        nombrecliente: row.nombrecliente || '',
        semanaEstado: estados[code]?.estado || 'Abierta',
        items: [],
      });
    }
    map.get(code).items.push(row);
  }
  return Array.from(map.values()).sort((a, b) => {
    const la = (a.nombrecliente || a.cliente || '').toLowerCase();
    const lb = (b.nombrecliente || b.cliente || '').toLowerCase();
    return la.localeCompare(lb, 'es');
  });
}

function clientGroups(cnsbite) {
  const cache = weekBita[cnsbite];
  if (!cache?.rows?.length) return [];
  return groupByCliente(cache.rows, cache.estados || {});
}

function isWeekLoading(cnsbite) {
  return Boolean(weekBita[cnsbite]?.loading);
}

function isClienteOpen(cnsbite, cliente) {
  return openClienteKey.value === clientKey(cnsbite, cliente);
}

function biteListParams() {
  const params = {
    page: pagBite.value.page,
    limit: pagBite.value.rowsPerPage,
  };
  if (filterFechaini.value) params.fechaini = filterFechaini.value;
  if (filterFechafin.value) params.fechafin = filterFechafin.value;
  if (filterAno.value) params.ano = filterAno.value;
  return params;
}

function bitListParams(cnsbite) {
  const params = {
    q: searchBit.value,
    page: 1,
    limit: 200,
    cnsbite,
  };
  if (filterCliente.value) params.cliente = filterCliente.value;
  if (filterEstado.value && filterEstado.value !== 'Todos') params.estado = filterEstado.value;
  return params;
}

async function loadEncabezados() {
  loadingBite.value = true;
  try {
    const res = await biteApi.list(biteListParams());
    biteRows.value = res.data;
    pagBite.value.rowsNumber = res.total;

    if (expandedCnsbite.value && !res.data.some((r) => r.cnsbite === expandedCnsbite.value)) {
      expandedCnsbite.value = null;
      openClienteKey.value = '';
      expandedCnssoporte.value = null;
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar semanas' });
  } finally {
    loadingBite.value = false;
  }
}

async function loadWeekBita(cnsbite) {
  if (!cnsbite) return;

  if (!weekBita[cnsbite]) {
    weekBita[cnsbite] = { loading: false, rows: [], estados: {} };
  }
  weekBita[cnsbite].loading = true;

  try {
    const [res, estadoRes] = await Promise.all([
      bitApi.list(bitListParams(cnsbite)),
      bitacoraApi.clientesEstado(cnsbite),
    ]);
    weekBita[cnsbite].rows = res.data;
    const estados = {};
    for (const row of estadoRes.data || []) {
      estados[row.cliente] = row;
    }
    weekBita[cnsbite].estados = estados;

    if (
      expandedCnssoporte.value
      && !res.data.some((r) => r.cnssoporte === expandedCnssoporte.value)
    ) {
      expandedCnssoporte.value = null;
    }

    if (openClienteKey.value && !openClienteKey.value.startsWith(`${cnsbite}~`)) {
      openClienteKey.value = '';
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cargar soportes' });
  } finally {
    weekBita[cnsbite].loading = false;
  }
}

function toggleWeekExpand(row) {
  if (expandedCnsbite.value === row.cnsbite) {
    expandedCnsbite.value = null;
    openClienteKey.value = '';
    expandedCnssoporte.value = null;
    return;
  }

  expandedCnsbite.value = row.cnsbite;
  openClienteKey.value = '';
  expandedCnssoporte.value = null;
  loadWeekBita(row.cnsbite);
}

function toggleCliente(cnsbite, cliente) {
  const key = clientKey(cnsbite, cliente);
  openClienteKey.value = openClienteKey.value === key ? '' : key;
}

function toggleSoporteDetail(cnssoporte) {
  if (expandedCnssoporte.value === cnssoporte) {
    expandedCnssoporte.value = null;
    return;
  }
  expandedCnssoporte.value = cnssoporte;
  if (!bitaDetailCache[cnssoporte]) {
    bitApi.get(cnssoporte)
      .then((full) => { bitaDetailCache[cnssoporte] = full; })
      .catch(() => { bitaDetailCache[cnssoporte] = null; });
  }
}

function soporteImagenes(item) {
  const cached = bitaDetailCache[item.cnssoporte];
  return parseImagenesSoporte(cached?.imagenes_soporte ?? item.imagenes_soporte);
}

function onFilterChange() {
  pagBite.value.page = 1;
  openClienteKey.value = '';
  expandedCnssoporte.value = null;
  Object.keys(weekBita).forEach((k) => delete weekBita[k]);
  loadEncabezados().then(() => {
    if (expandedCnsbite.value) loadWeekBita(expandedCnsbite.value);
  });
}

function reloadAll() {
  onFilterChange();
}

function onSearchBit() {
  expandedCnssoporte.value = null;
  if (expandedCnsbite.value) loadWeekBita(expandedCnsbite.value);
}

function onBiteRequest(req) {
  pagBite.value.page = req.pagination.page;
  pagBite.value.rowsPerPage = req.pagination.rowsPerPage;
  loadEncabezados();
}

function openBiteCreate() {
  biteCurrent.value = {};
  biteIsEdit.value = false;
  formBiteOpen.value = true;
}

function openBiteEdit(row) {
  biteCurrent.value = { ...row };
  biteIsEdit.value = true;
  formBiteOpen.value = true;
}

function onBiteSaved(saved) {
  formBiteOpen.value = false;
  loadEncabezados().then(() => {
    if (saved?.cnsbite) {
      expandedCnsbite.value = saved.cnsbite;
      loadWeekBita(saved.cnsbite);
    }
  });
}

function defaultClienteForCreate(cnsbite, explicitCliente) {
  if (explicitCliente) return explicitCliente;
  if (openClienteKey.value.startsWith(`${cnsbite}~`)) {
    const code = openClienteKey.value.slice(cnsbite.length + 1);
    return code === '_' ? '' : code;
  }
  return filterCliente.value || '';
}

function openBitCreate(cnsbite, explicitCliente = '') {
  if (!cnsbite) {
    $q.notify({ type: 'warning', message: 'Expanda una semana primero' });
    return;
  }

  const cliente = defaultClienteForCreate(cnsbite, explicitCliente);
  const week = weekForCnsbite(cnsbite);
  const estados = weekBita[cnsbite]?.estados || {};
  if (cliente && isSemanaClienteCerrada(estados[cliente]?.estado)) {
    $q.notify({ type: 'warning', message: 'La semana de este cliente está cerrada' });
    return;
  }
  bitCreateCnsbite.value = cnsbite;
  bitCurrent.value = {
    cnsbite,
    fecha: defaultFechaInWeek(week),
    ...(cliente ? { cliente } : {}),
  };
  bitIsEdit.value = false;
  formBitOpen.value = true;
}

async function openBitEdit(row) {
  if (isSoporteBloqueado(row, row.cnsbite || expandedCnsbite.value)) {
    $q.notify({ type: 'warning', message: soporteBloqueoMensaje(row, row.cnsbite || expandedCnsbite.value) });
    return;
  }
  if (isTerminado(row.estado)) {
    $q.notify({ type: 'warning', message: 'El soporte está cerrado y no se puede editar' });
    return;
  }
  bitCreateCnsbite.value = row.cnsbite || expandedCnsbite.value || '';
  bitIsEdit.value = true;
  try {
    bitCurrent.value = await bitApi.get(row.cnssoporte);
  } catch {
    bitCurrent.value = { ...row };
  }
  formBitOpen.value = true;
}

async function openBitEvidencias(row) {
  const cnsbite = row.cnsbite || expandedCnsbite.value;
  if (!puedeEditarEvidencias(row, cnsbite)) {
    $q.notify({ type: 'warning', message: evidenciasTooltip(row, cnsbite) });
    return;
  }
  evidenciasRow.value = row;
  evidenciasImagenes.value = '';
  evidenciasLoading.value = true;
  evidenciasOpen.value = true;
  try {
    const full = await bitApi.get(row.cnssoporte);
    evidenciasImagenes.value = full.imagenes_soporte || '';
    evidenciasRow.value = { ...row, ...full };
  } catch {
    evidenciasImagenes.value = row.imagenes_soporte || '';
  } finally {
    evidenciasLoading.value = false;
  }
}

async function saveBitEvidencias() {
  if (!evidenciasRow.value?.cnssoporte) return;
  evidenciasSaving.value = true;
  try {
    await bitApi.update(evidenciasRow.value.cnssoporte, {
      imagenes_soporte: evidenciasImagenes.value || '',
    });
    delete bitaDetailCache[evidenciasRow.value.cnssoporte];
    evidenciasOpen.value = false;
    $q.notify({ type: 'positive', message: 'Evidencias guardadas' });
    const cnsbite = evidenciasRow.value.cnsbite || expandedCnsbite.value;
    if (cnsbite) await loadWeekBita(cnsbite);
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al guardar evidencias' });
  } finally {
    evidenciasSaving.value = false;
  }
}

function openCerrarBit(row) {
  if (isSoporteBloqueado(row, row.cnsbite || expandedCnsbite.value)) {
    $q.notify({ type: 'warning', message: soporteBloqueoMensaje(row, row.cnsbite || expandedCnsbite.value) });
    return;
  }
  if (isTerminado(row.estado)) {
    $q.notify({ type: 'warning', message: 'El soporte ya está cerrado' });
    return;
  }
  const week = weekForCnsbite(row.cnsbite || expandedCnsbite.value);
  cerrarRow.value = row;
  cerrarRespuesta.value = '';
  cerrarSemana.value = {
    fechaini: week?.fechaini ? toDateKey(week.fechaini) : '',
    fechafin: week?.fechafin ? toDateKey(week.fechafin) : '',
  };
  cerrarFechar.value = defaultFechaInWeek(week);
  cerrarOpen.value = true;
}

async function submitCerrarBit() {
  if (!cerrarRow.value?.cnssoporte) return;
  if (!String(cerrarRespuesta.value || '').trim()) {
    $q.notify({ type: 'warning', message: 'La respuesta es obligatoria' });
    return;
  }
  const { fechaini, fechafin } = cerrarSemana.value;
  if (fechaini && fechafin && (cerrarFechar.value < fechaini || cerrarFechar.value > fechafin)) {
    $q.notify({ type: 'warning', message: 'La fecha de cierre debe estar dentro de la semana' });
    return;
  }

  cerrarSaving.value = true;
  try {
    await bitacoraApi.cerrar(cerrarRow.value.cnssoporte, {
      respuesta: cerrarRespuesta.value.trim(),
      fechar: cerrarFechar.value,
    });
    $q.notify({ type: 'positive', message: 'Soporte cerrado' });
    cerrarOpen.value = false;
    if (cerrarRow.value.cnsbite) await loadWeekBita(cerrarRow.value.cnsbite);
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al cerrar soporte' });
  } finally {
    cerrarSaving.value = false;
  }
}

function confirmBitDelete(row) {
  if (isSoporteBloqueado(row, row.cnsbite || expandedCnsbite.value)) {
    $q.notify({ type: 'warning', message: soporteBloqueoMensaje(row, row.cnsbite || expandedCnsbite.value) });
    return;
  }
  $q.dialog({
    title: 'Confirmar',
    message: '¿Eliminar el registro seleccionado?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await bitApi.remove(row.cnssoporte);
      $q.notify({ type: 'positive', message: 'Registro eliminado' });
      if (expandedCnssoporte.value === row.cnssoporte) expandedCnssoporte.value = null;
      if (row.cnsbite) await loadWeekBita(row.cnsbite);
    } catch (err) {
      $q.notify({ type: 'negative', message: err.response?.data?.error || 'Error al eliminar' });
    }
  });
}

function onBitSaved(saved) {
  formBitOpen.value = false;
  if (saved?.cnssoporte) delete bitaDetailCache[saved.cnssoporte];
  const cnsbite = bitCreateCnsbite.value || expandedCnsbite.value || saved?.cnsbite;
  const cliente = saved?.cliente || bitCurrent.value?.cliente;
  if (cnsbite) {
    expandedCnsbite.value = cnsbite;
    loadWeekBita(cnsbite).then(() => {
      if (cliente) openClienteKey.value = clientKey(cnsbite, cliente);
    });
  }
}

async function loadMailStatus() {
  try {
    const { data } = await api.get('/health');
    mailConfigured.value = Boolean(data.mailConfigured);
  } catch {
    mailConfigured.value = null;
  }
}

function openNotifyBit(row) {
  if (isSoporteBloqueado(row, row.cnsbite || expandedCnsbite.value)) {
    $q.notify({ type: 'warning', message: soporteBloqueoMensaje(row, row.cnsbite || expandedCnsbite.value) });
    return;
  }
  if (!row.cliente) {
    $q.notify({ type: 'warning', message: 'El registro no tiene cliente asignado' });
    return;
  }
  if (!isTerminado(row.estado)) {
    $q.notify({ type: 'warning', message: 'Debe cerrar el soporte antes de enviar el correo' });
    return;
  }
  notifyType.value = 'bitacora';
  notifyTitle.value = 'Enviar registro de soporte';
  notifyCnsbite.value = '';
  notifyRecordId.value = row.cnssoporte;
  notifyCliente.value = row.cliente;
  notifyOpen.value = true;
}

async function openCerrarSemanaCliente(weekRow, group) {
  if (!weekRow?.cnsbite || !group?.cliente) return;
  cerrarSemanaRow.value = weekRow;
  cerrarSemanaGroup.value = group;
  cerrarSemanaOpciones.value = null;
  cerrarSemanaOpen.value = true;
  try {
    cerrarSemanaOpciones.value = await bitacoraApi.semanaClienteEstadoOpciones(weekRow.cnsbite, group.cliente);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo validar el cierre de semana',
    });
    cerrarSemanaOpen.value = false;
  }
}

async function submitCerrarSemanaCliente() {
  if (!cerrarSemanaRow.value?.cnsbite || !cerrarSemanaGroup.value?.cliente) return;
  const key = clientKey(cerrarSemanaRow.value.cnsbite, cerrarSemanaGroup.value.cliente);
  cerrarSemanaSaving.value = true;
  cerrarSemanaKey.value = key;
  try {
    await bitacoraApi.cerrarSemanaCliente(cerrarSemanaRow.value.cnsbite, cerrarSemanaGroup.value.cliente);
    cerrarSemanaOpen.value = false;
    $q.notify({ type: 'positive', message: 'Semana del cliente cerrada' });
    await loadWeekBita(cerrarSemanaRow.value.cnsbite);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo cerrar la semana',
    });
  } finally {
    cerrarSemanaSaving.value = false;
    cerrarSemanaKey.value = '';
  }
}

function openReporteSemana(weekRow, group) {
  if (!weekRow?.cnsbite || !group?.cliente) return;
  if (!isSemanaClienteCerrada(group.semanaEstado)) {
    $q.notify({ type: 'warning', message: 'Cierre la semana del cliente antes de reportar' });
    return;
  }
  notifyType.value = 'bitacora_semana';
  notifyTitle.value = 'Reportar soportes al equipo';
  notifyCnsbite.value = weekRow.cnsbite;
  notifyRecordId.value = weekRow.cnsbite;
  notifyCliente.value = group.cliente;
  notifyOpen.value = true;
}

async function onNotifySend(payload) {
  if (!notifyRecordId.value) return;
  sendingNotify.value = true;
  if (notifyType.value === 'bitacora_semana') {
    sendingReporteKey.value = clientKey(notifyCnsbite.value, notifyCliente.value);
  } else {
    sendingNotifyId.value = notifyRecordId.value;
  }
  try {
    const data = notifyType.value === 'bitacora_semana'
      ? await bitacoraApi.enviarReporteSemana(notifyCnsbite.value, notifyCliente.value, payload)
      : await notificacionApi.bitacora(notifyRecordId.value, payload);
    notifyOpen.value = false;
    if (data.sent > 0) {
      const pdfNote = data.pdfAttached ? ' con PDF adjunto' : '';
      $q.notify({
        type: 'positive',
        icon: 'mail',
        message: notifyType.value === 'bitacora_semana'
          ? `Reporte enviado al equipo${pdfNote}`
          : `${data.sent} correo(s) enviado(s)`,
      });
    } else {
      $q.notify({ type: 'warning', message: data.error || 'No se envió ningún correo' });
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'Error al enviar la notificación',
    });
  } finally {
    sendingNotify.value = false;
    sendingNotifyId.value = '';
    sendingReporteKey.value = '';
  }
}

async function openBitacoraPdf(weekRow, group) {
  if (!weekRow?.cnsbite || !group?.cliente) {
    $q.notify({ type: 'warning', message: 'Seleccione un cliente con soportes' });
    return;
  }
  if (!group.items?.length) {
    $q.notify({ type: 'warning', message: 'No hay soportes para generar el PDF' });
    return;
  }

  const key = clientKey(weekRow.cnsbite, group.cliente);
  pdfLoadingKey.value = key;
  try {
    const res = await bitacoraApi.semanaPdf(weekRow.cnsbite, group.cliente);
    if (res.data?.type === 'application/json') {
      const text = await res.data.text();
      const err = JSON.parse(text);
      throw new Error(err.error || 'Error al generar el PDF');
    }
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const acronym = String(group.cliente || group.nombrecliente || 'CLIENTE')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s/g, '')
      .slice(0, 6)
      .toUpperCase();
    pdfDocumentName.value = `SOPORTE SEMANA ${weekRow.idsemana || weekRow.cnsbite} ${acronym}.pdf`;
    pdfDocument.value = blob;
    setTimeout(() => pdfRef.value?.mostrarPDF(), 150);
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || err.response?.data?.error || 'Error al generar el PDF',
    });
  } finally {
    pdfLoadingKey.value = '';
  }
}

onMounted(() => {
  loadEncabezados();
  loadMailStatus();
});
</script>

<style scoped lang="scss">
.bitacora-page {
  padding: 16px 20px;
  max-width: 1280px;
  margin: 0 auto;
}

.bit-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #5c6bc0 0%, #3949ab 55%, #283593 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(57, 73, 171, 0.22);
}

.bit-hero__main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.bit-hero__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.bit-hero__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.bit-hero__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
}

.bit-hero__subtitle {
  margin: 4px 0 0;
  font-size: 0.78rem;
  opacity: 0.88;
}

.bit-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bit-hero__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.75rem;
  white-space: nowrap;

  strong {
    font-weight: 700;
  }

  &--active {
    background: rgba(255, 255, 255, 0.28);
    border: 1px solid rgba(255, 255, 255, 0.35);
  }
}

.bit-alert,
.bit-empty {
  border-radius: 10px;
}

.bit-alert {
  border: 1px solid #ffcc80;
}

.bit-empty {
  border: 1px solid #c5cae9;
  background: #f8fafc;
}

.bit-filters {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.bit-filters__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}

.bit-filters__cliente {
  min-width: 220px;
  flex: 1 1 220px;
}

.bit-filters__date {
  width: 150px;
}

.bit-filters__ano {
  width: 110px;
}

.bit-filters__estado {
  width: 140px;
}

.bit-panel {
  padding: 16px;
  margin-bottom: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);

  &--encabezado {
    border-color: #c5cae9;
  }
}

.bit-panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.bit-panel__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #3949ab;
}

.bit-panel__hint {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: #64748b;
}

.bit-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.bit-search {
  min-width: 220px;
}

.bit-btn {
  border-radius: 8px;
  font-weight: 500;
}

.bit-table {
  border-radius: 8px;
  overflow: hidden;

  :deep(thead tr:first-child th) {
    background: #f8fafc;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #64748b;
  }

  :deep(tbody td) {
    font-size: 0.85rem;
    color: #334155;
  }

  &--compact :deep(tbody td) {
    font-size: 0.8rem;
  }
}

.bit-table__expand-cell {
  width: 40px;
  padding-right: 0 !important;
}

.bit-table__row {
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: #f1f5f9;
  }

  &--expanded {
    background: #e8eaf6 !important;

    td {
      font-weight: 500;
      color: #283593;
      border-bottom: none;
    }
  }
}

.bit-table__expand-row {
  background: #f8fafc;

  > td {
    padding: 0 !important;
    border-top: none !important;
  }
}

.bit-week-expand {
  margin: 0 6px 8px 32px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #c5cae9;
  background: linear-gradient(180deg, #fafbff 0%, #ffffff 50%);
}

.bit-week-expand__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
}

.bit-week-expand__title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #3949ab;
}

.bit-week-expand__sub {
  font-weight: 400;
  color: #64748b;
}

.bit-client-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bit-client-group {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;

  &--open {
    border-color: #c5cae9;
    box-shadow: 0 2px 8px rgba(57, 73, 171, 0.08);
  }
}

.bit-client-group__header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  cursor: pointer;
  background: #f8fafc;

  &:hover {
    background: #eef2ff;
  }
}

.bit-client-group--open .bit-client-group__header {
  background: #e8eaf6;
}

.bit-client-group__info {
  font-size: 0.84rem;
  color: #334155;
}

.bit-client-group__count {
  font-size: 0.68rem;
}

.bit-client-group__body {
  border-top: 1px solid #e2e8f0;
}

.bit-soporte {
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }

  &--detail-open {
    background: #fafbff;
  }

  &--locked {
    background: #f8fafc;
  }
}

.bit-soporte__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 4px;
  cursor: pointer;

  &:hover {
    background: #f8fafc;
  }
}

.bit-soporte__id {
  font-weight: 600;
  font-size: 0.8rem;
  color: #3949ab;
  min-width: 88px;
}

.bit-soporte__fecha {
  font-size: 0.78rem;
  color: #64748b;
  min-width: 72px;
}

.bit-soporte__clase {
  font-size: 0.78rem;
  color: #475569;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bit-soporte__detail {
  padding: 0 8px 8px 28px;
}

.bit-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.bit-detail-meta__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2ff;
  border: 1px solid #c5cae9;
  font-size: 0.76rem;
}

.bit-detail-meta__label {
  font-weight: 600;
  color: #5c6bc0;
}

.bit-detail-meta__value {
  color: #334155;
}

.bit-detail-blocks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.bit-detail-block {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  min-height: 72px;
}

.bit-detail-block__label {
  margin: 0 0 6px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.bit-detail-block__text {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

.bit-detail-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.bit-detail-images__item {
  margin: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.bit-detail-images__item img {
  display: block;
  width: 100%;
  height: 88px;
  object-fit: cover;
}

.bit-detail-images__item figcaption {
  padding: 4px 6px;
  font-size: 0.68rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bit-actions {
  display: inline-flex;
  gap: 2px;
}

.bit-badge {
  font-size: 0.7rem;
  padding: 3px 8px;
}

.bit-cerrar-dialog {
  min-width: 420px;
  max-width: 95vw;
  border-radius: 12px;
}

.bit-cerrar-dialog__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
  color: #fff;
}

.bit-cerrar-dialog__eyebrow {
  margin: 0 0 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.9;
}

.bit-cerrar-dialog__title {
  font-size: 1rem;
  font-weight: 700;
}

.bit-cerrar-dialog__hint {
  margin: 0 0 12px;
  font-size: 0.78rem;
  color: #64748b;
}

@media (max-width: 900px) {
  .bit-detail-blocks {
    grid-template-columns: 1fr;
  }

  .bit-soporte__row {
    flex-wrap: wrap;
  }
}

@media (max-width: 599px) {
  .bitacora-page {
    padding: 12px;
  }

  .bit-hero {
    padding: 12px 14px;
  }

  .bit-panel {
    padding: 12px;
  }

  .bit-search,
  .bit-filters__cliente {
    width: 100%;
    min-width: 0;
  }

  .bit-panel__actions,
  .bit-filters__row {
    width: 100%;
  }

  .bit-filters__date,
  .bit-filters__ano,
  .bit-filters__estado {
    width: 100%;
  }

  .bit-week-expand {
    margin-left: 4px;
    margin-right: 0;
  }
}
</style>
