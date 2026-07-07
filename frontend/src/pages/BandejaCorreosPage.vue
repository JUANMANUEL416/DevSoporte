<template>
  <q-page class="bandeja-page q-pa-md">
    <!-- ----------------------- Bandeja (historial) ----------------------- -->
    <q-card flat bordered class="bandeja-card">
      <div class="bandeja-card__header">
        <q-icon name="mark_email_read" size="22px" />
        <span>Bandeja de correos</span>
        <q-space />
        <q-btn
          unelevated
          no-caps
          color="white"
          text-color="primary"
          icon="description"
          label="Plantilla y firma"
          class="q-mr-sm"
          @click="abrirPlantilla"
        />
        <q-btn
          unelevated
          no-caps
          color="white"
          text-color="primary"
          icon="add"
          label="Nuevo"
          @click="abrirNuevo"
        />
        <q-btn flat dense round icon="refresh" color="white" @click="reload" :loading="loadingTable">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>

      <q-card-section class="bandeja-filtros row q-col-gutter-sm items-end">
        <div class="col-12 col-md">
          <q-input v-model="filtros.q" label="Buscar (asunto, correo, cliente)" outlined dense clearable debounce="350" @update:model-value="reload">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-6 col-md-auto" style="min-width: 150px">
          <q-select
            v-model="filtros.exito"
            :options="estadoOptions"
            label="Estado"
            outlined
            dense
            emit-value
            map-options
            @update:model-value="reload"
          />
        </div>
        <div class="col-6 col-md-auto" style="min-width: 160px">
          <q-select
            v-model="filtros.contexto"
            :options="contextoOptions"
            label="Origen"
            outlined
            dense
            emit-value
            map-options
            @update:model-value="reload"
          />
        </div>
      </q-card-section>

      <q-table
        flat
        :rows="rows"
        :columns="columns"
        row-key="id"
        v-model:pagination="pagination"
        :loading="loadingTable"
        :rows-per-page-options="[10, 25, 50]"
        @request="onRequest"
        @row-click="(e, row) => verDetalle(row)"
        class="bandeja-table"
      >
        <template #body-cell-exito="props">
          <q-td :props="props">
            <q-chip
              dense
              :color="props.row.exito ? 'green-1' : 'red-1'"
              :text-color="props.row.exito ? 'green-9' : 'red-9'"
              :icon="props.row.exito ? 'check_circle' : 'error'"
              :label="props.row.exito ? 'Enviado' : 'Falló'"
            />
          </q-td>
        </template>
        <template #body-cell-contexto="props">
          <q-td :props="props">
            <q-badge :color="contextoColor(props.row.contexto)" :label="contextoLabel(props.row.contexto)" />
          </q-td>
        </template>
        <template #body-cell-acciones="props">
          <q-td :props="props" @click.stop>
            <q-btn
              v-if="puedeReenviar(props.row)"
              flat
              dense
              round
              color="primary"
              icon="forward"
              @click="abrirReenviar(props.row)"
            >
              <q-tooltip>Reenviar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center text-grey-6 q-pa-md">Sin correos registrados.</div>
        </template>
      </q-table>
    </q-card>

    <!-- ----------------------- Redacción (Nuevo) ----------------------- -->
    <q-dialog v-model="composeOpen" persistent full-width class="bandeja-compose-shell">
      <q-card class="bandeja-compose">
        <div class="bandeja-card__header bandeja-card__header--compact">
          <q-icon name="edit_note" size="18px" />
          <span>{{ composeMode === 'reenviar' ? 'Reenviar correo' : 'Nuevo correo' }}</span>
          <q-space />
          <q-btn flat dense round size="sm" icon="close" color="white" :disable="sending" v-close-popup />
        </div>

        <div class="bandeja-compose__body">
          <section
            v-if="composeMode === 'reenviar' && reenviarAdjuntosRequeridos.length"
            class="bandeja-compose__adjuntos-req"
          >
            <div class="bandeja-compose__adjuntos-req-head">
              <q-icon name="attach_file" size="16px" />
              <span>Adjuntos requeridos para reenviar</span>
            </div>
            <p class="bandeja-compose__adjuntos-req-hint">
              Debe adjuntar cada archivo con el <strong>mismo nombre y extensión</strong> del correo original.
            </p>
            <div
              v-for="(req, index) in reenviarAdjuntosRequeridos"
              :key="`${req.filename}-${index}`"
              class="bandeja-compose__adjunto-req-row"
              :class="{ 'bandeja-compose__adjunto-req-row--ok': req.file }"
            >
              <div class="bandeja-compose__adjunto-req-meta">
                <q-icon
                  :name="req.file ? 'check_circle' : 'radio_button_unchecked'"
                  :color="req.file ? 'positive' : 'grey-6'"
                  size="18px"
                />
                <span class="bandeja-compose__adjunto-req-name">{{ req.filename }}</span>
              </div>
              <q-file
                :model-value="req.file"
                outlined
                dense
                hide-bottom-space
                :label="req.file ? req.file.name : 'Seleccionar archivo'"
                class="bandeja-compose__adjunto-req-file"
                @update:model-value="(f) => onReenviarAdjuntoSelected(index, f)"
              >
                <template #prepend>
                  <q-icon name="upload_file" />
                </template>
                <template v-if="req.file" #append>
                  <q-btn flat dense round icon="close" @click.stop="quitarReenviarAdjunto(index)" />
                </template>
              </q-file>
            </div>
          </section>

          <div class="bandeja-compose__recipients-row">
            <div class="bandeja-compose__top-row">
              <q-select
                v-model="cliente"
                :options="clienteOptions"
                label="Cliente (opcional)"
                outlined
                dense
                clearable
                emit-value
                map-options
                use-input
                hide-bottom-space
                input-debounce="200"
                options-dense
                class="bandeja-compose__cliente"
                @filter="filterClientes"
                @update:model-value="onClienteChange"
                :loading="loadingClientes"
              />

              <div class="bandeja-compose__manual">
                <q-input
                  v-model="manualEmail"
                  class="bandeja-compose__manual-email"
                  label="Correo manual"
                  type="email"
                  outlined
                  dense
                  hide-bottom-space
                  placeholder="correo@empresa.com"
                  @keyup.enter="addManualEmail"
                />
                <q-select
                  v-model="manualRol"
                  class="bandeja-compose__manual-rol"
                  :options="manualRolOptions"
                  label="Como"
                  outlined
                  dense
                  hide-bottom-space
                  emit-value
                  map-options
                />
                <q-btn
                  unelevated
                  dense
                  no-caps
                  color="primary"
                  icon="add"
                  label="Agregar"
                  class="bandeja-compose__manual-add"
                  @click="addManualEmail"
                />
                <q-btn
                  outline
                  dense
                  no-caps
                  color="teal"
                  icon="contacts"
                  label="Agenda"
                  class="bandeja-compose__agenda-btn"
                  @click="abrirAgendaDialog"
                />
                <q-btn
                  flat
                  dense
                  no-caps
                  color="grey-7"
                  icon="open_in_new"
                  label="Gestionar"
                  @click="irAgendaContactos"
                />
              </div>
            </div>

            <div class="bandeja-compose__recipients">
              <section
                class="bandeja-compose__recipient-col"
                :class="{ 'bandeja-compose__recipient-col--drop-active': dragOverZone === 'to' }"
                @dragover.prevent="onDragOver('to')"
                @dragleave="onDragLeave('to')"
                @drop.prevent="onDrop('to', $event)"
              >
                <div class="bandeja-compose__recipient-head">
                  <span class="bandeja-compose__recipient-title">
                    <q-icon name="person" size="14px" class="q-mr-xs" />
                    Para *
                  </span>
                  <div class="bandeja-compose__recipient-toolbar">
                    <q-btn flat dense color="primary" label="Todos" @click="selectAllTo" />
                    <q-btn flat dense color="grey-7" label="Ninguno" @click="selectedTo = []" />
                  </div>
                </div>
                <div v-if="displayContactosTo.length" class="bandeja-compose__recipient-grid">
                  <div
                    v-for="c in displayContactosTo"
                    :key="c.id"
                    class="bandeja-compose__recipient-card bandeja-compose__recipient-card--to"
                    :class="{
                      'bandeja-compose__recipient-card--selected': selectedTo.includes(c.email),
                      'bandeja-compose__recipient-card--dragging': draggingEmail === c.email,
                    }"
                    draggable="true"
                    @dragstart="onDragStart(c, 'to', $event)"
                    @dragend="onDragEnd"
                  >
                    <q-checkbox v-model="selectedTo" :val="c.email" color="primary" dense @click.stop />
                    <span class="bandeja-compose__recipient-line">
                      <q-badge v-if="c.manual" dense color="grey-7" label="M" class="q-mr-xs" />
                      <q-badge v-if="c.agenda" dense color="teal-7" label="A" class="q-mr-xs" />
                      {{ contactCardLabel(c) }}
                      <q-tooltip v-if="showEmailTooltip(c)">{{ c.email }}</q-tooltip>
                    </span>
                    <q-btn
                      flat
                      dense
                      round
                      size="xs"
                      icon="arrow_forward"
                      color="grey-7"
                      class="bandeja-compose__move-btn"
                      @click.stop="moveContact(c, 'to', 'cc')"
                    >
                      <q-tooltip>Mover a CC</q-tooltip>
                    </q-btn>
                  </div>
                </div>
                <p v-else class="bandeja-compose__recipient-empty">Sin destinatarios en Para.</p>
              </section>

              <section
                class="bandeja-compose__recipient-col"
                :class="{ 'bandeja-compose__recipient-col--drop-active': dragOverZone === 'cc' }"
                @dragover.prevent="onDragOver('cc')"
                @dragleave="onDragLeave('cc')"
                @drop.prevent="onDrop('cc', $event)"
              >
                <div class="bandeja-compose__recipient-head">
                  <span class="bandeja-compose__recipient-title">
                    <q-icon name="groups" size="14px" class="q-mr-xs" />
                    Copia (CC)
                  </span>
                  <div class="bandeja-compose__recipient-toolbar">
                    <q-btn flat dense color="primary" label="Todos" @click="selectAllCc" />
                    <q-btn flat dense color="grey-7" label="Ninguno" @click="selectedCc = []" />
                  </div>
                </div>
                <div v-if="displayContactosCc.length" class="bandeja-compose__recipient-grid">
                  <div
                    v-for="c in displayContactosCc"
                    :key="c.id"
                    class="bandeja-compose__recipient-card bandeja-compose__recipient-card--cc"
                    :class="{
                      'bandeja-compose__recipient-card--selected': selectedCc.includes(c.email),
                      'bandeja-compose__recipient-card--dragging': draggingEmail === c.email,
                    }"
                    draggable="true"
                    @dragstart="onDragStart(c, 'cc', $event)"
                    @dragend="onDragEnd"
                  >
                    <q-checkbox v-model="selectedCc" :val="c.email" color="teal" dense @click.stop />
                    <span class="bandeja-compose__recipient-line">
                      <q-badge v-if="c.manual" dense color="grey-7" label="M" class="q-mr-xs" />
                      <q-badge v-if="c.agenda" dense color="teal-7" label="A" class="q-mr-xs" />
                      {{ contactCardLabel(c) }}
                      <q-tooltip v-if="showEmailTooltip(c)">{{ c.email }}</q-tooltip>
                    </span>
                    <q-btn
                      flat
                      dense
                      round
                      size="xs"
                      icon="arrow_back"
                      color="grey-7"
                      class="bandeja-compose__move-btn"
                      @click.stop="moveContact(c, 'cc', 'to')"
                    >
                      <q-tooltip>Mover a Para</q-tooltip>
                    </q-btn>
                  </div>
                </div>
                <p v-else class="bandeja-compose__recipient-empty">Sin destinatarios en CC.</p>
              </section>
            </div>
          </div>

          <div class="bandeja-compose__main">
            <div class="bandeja-compose__form">
            <q-input v-model="asunto" label="Asunto *" outlined dense hide-bottom-space />

            <q-file
              v-if="!(composeMode === 'reenviar' && reenviarAdjuntosRequeridos.length)"
              v-model="adjuntos"
              label="Adjuntos"
              outlined
              dense
              multiple
              append
              counter
              hide-bottom-space
              max-files="10"
              max-total-size="15728640"
              accept="*"
              @rejected="onFilesRejected"
            >
              <template #prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>

            <div class="bandeja-compose__message">
              <div class="bandeja-compose__body-head">
                <span class="bandeja-compose__label">Mensaje</span>
                <q-btn flat dense no-caps color="grey-7" icon="restart_alt" label="Restaurar plantilla" @click="restaurarPlantilla" />
              </div>
              <div class="bandeja-compose__editor-panel">
                <div class="bandeja-compose__content-scroll">
                  <div class="bandeja-compose__content-card">
                    <h2 class="bandeja-compose__content-title">{{ asunto || '(sin asunto)' }}</h2>
                    <textarea
                      ref="cuerpoTextarea"
                      v-model="cuerpo"
                      class="bandeja-compose__content-textarea"
                      placeholder="Escriba el contenido del mensaje..."
                      spellcheck="true"
                      @input="resizeCuerpoTextarea"
                    />
                  </div>
                </div>
              </div>
            </div>
            </div>

            <!-- Vista previa -->
            <div class="bandeja-compose__preview">
            <div class="bandeja-compose__preview-head">
              <q-icon name="visibility" size="16px" />
              <span>Vista previa — así se enviará</span>
            </div>
            <div class="bandeja-compose__preview-meta">
              <div><strong>Para:</strong> {{ selectedParaPreview || '(sin destinatarios)' }}</div>
              <div v-if="selectedCcPreview"><strong>CC:</strong> {{ selectedCcPreview }}</div>
              <div><strong>Asunto:</strong> {{ asunto || '(sin asunto)' }}</div>
              <div v-if="adjuntosPreview.length">
                <strong>Adjuntos:</strong>
                <q-chip
                  v-for="(f, i) in adjuntosPreview"
                  :key="i"
                  dense
                  icon="attach_file"
                  :label="f.label"
                  :color="f.ok === false ? 'orange-2' : undefined"
                />
              </div>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="bandeja-compose__content-scroll bandeja-compose__preview-render" v-html="previewHtml"></div>
            </div>
          </div>
        </div>

        <q-card-actions align="right" class="bandeja-compose__actions">
          <q-btn flat no-caps label="Cancelar" color="grey-7" :disable="sending" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="send"
            label="Enviar"
            :loading="sending"
            :disable="!canSend"
            @click="enviar"
          >
            <q-tooltip v-if="!canSend && composeMode === 'reenviar' && !adjuntosReenvioCompletos">
              Adjunte todos los archivos con el nombre y extensión originales
            </q-tooltip>
          </q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="agendaOpen">
      <q-card class="bandeja-agenda">
        <div class="bandeja-card__header bandeja-card__header--compact">
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

        <q-card-section class="q-pt-none bandeja-agenda__list">
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

        <q-card-actions align="right" class="bandeja-agenda__actions">
          <q-btn flat no-caps label="Equipo → CC" color="teal" @click="agregarEquipoAgendaCc" />
          <q-btn flat no-caps label="Agregar a CC" color="primary" @click="agregarAgendaSeleccion('cc')" />
          <q-btn unelevated no-caps label="Agregar a Para" color="primary" @click="agregarAgendaSeleccion('to')" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ----------------------- Plantilla y firma ----------------------- -->
    <q-dialog v-model="plantillaOpen" persistent class="bandeja-plantilla-shell">
      <q-card class="bandeja-plantilla">
        <div class="bandeja-card__header bandeja-card__header--compact bandeja-plantilla__header">
          <q-icon name="description" size="18px" />
          <span>Plantilla y firma de correos</span>
          <q-space />
          <q-btn
            unelevated
            no-caps
            dense
            color="white"
            text-color="primary"
            icon="save"
            label="Guardar"
            class="q-mr-xs"
            :loading="savingPlantilla"
            @click="guardarPlantilla"
          />
          <q-btn flat dense round size="sm" icon="close" color="white" :disable="savingPlantilla" v-close-popup />
        </div>

        <q-card-section class="bandeja-plantilla__body">
          <p class="bandeja-plantilla__hint">
            Use <code v-pre>{{saludo}}</code> para el nombre del cliente.
            Las líneas entre corchetes <code v-pre>[ ... ]</code> se muestran como guía elegante;
            use <code v-pre>•</code> al inicio para listas.
          </p>

          <div class="bandeja-plantilla__template-toolbar">
            <q-btn
              outline
              no-caps
              dense
              color="primary"
              icon="auto_awesome"
              label="Cargar plantilla elegante"
              @click="aplicarPlantillaSugerida"
            />
          </div>

          <q-input
            v-model="plantillaEdit.cuerpo_template"
            label="Plantilla del mensaje"
            type="textarea"
            outlined
            dense
            autogrow
            input-style="min-height: 160px;"
            hint="Texto inicial al crear un correo nuevo"
          />

          <q-input
            v-model="plantillaEdit.firma_texto"
            label="Texto de la firma"
            type="textarea"
            outlined
            dense
            autogrow
            class="q-mt-md"
            input-style="min-height: 80px;"
            :hint="plantillaEdit.firma_html ? 'Opcional: solo se usa si no hay firma HTML importada' : 'Se agrega al final de cada correo enviado'"
          />

          <div class="bandeja-plantilla__outlook q-mt-md">
            <div class="bandeja-plantilla__firma-label">Importar firma de Outlook</div>
            <p class="bandeja-plantilla__outlook-hint">
              En Windows abra
              <code>%APPDATA%\Microsoft\Signatures</code>
              y use <strong>Importar carpeta</strong> sobre la carpeta de su firma (contiene el .htm y la subcarpeta <em>_archivos</em>).
              También puede subir solo la imagen PNG/JPG de esa carpeta.
            </p>
            <div class="row q-gutter-sm items-center wrap">
              <q-btn
                outline
                no-caps
                color="primary"
                icon="folder_open"
                label="Importar carpeta Outlook"
                @click="triggerOutlookFolder"
              />
              <q-btn
                outline
                no-caps
                color="primary"
                icon="upload_file"
                label="Subir imagen PNG/JPG"
                @click="triggerFirmaImagen"
              />
              <q-btn
                v-if="plantillaEdit.firma_html || plantillaEdit.firma_imagen"
                flat
                dense
                no-caps
                color="grey-7"
                icon="delete"
                label="Quitar firma"
                @click="limpiarFirmaPlantilla"
              />
            </div>
            <input
              ref="outlookFolderInput"
              type="file"
              webkitdirectory
              multiple
              class="bandeja-plantilla__file-input"
              @change="onOutlookFolderSelected"
            />
            <input
              ref="firmaImagenInput"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif"
              class="bandeja-plantilla__file-input"
              @change="onFirmaImagenSelected"
            />
            <div v-if="plantillaEdit.firma_html" class="bandeja-plantilla__firma-preview q-mt-md">
              <div class="bandeja-plantilla__firma-label">Vista previa (firma Outlook)</div>
              <div class="bandeja-plantilla__firma-preview-box" v-html="plantillaEdit.firma_html" />
            </div>
            <div v-else-if="plantillaEdit.firma_imagen" class="bandeja-plantilla__firma-preview q-mt-md">
              <div class="bandeja-plantilla__firma-label">Vista previa (imagen)</div>
              <img :src="plantillaEdit.firma_imagen" alt="Firma" class="bandeja-plantilla__firma-preview-img" />
            </div>
          </div>

          <div v-if="!plantillaEdit.firma_html" class="bandeja-plantilla__firma-pad q-mt-md">
            <div class="bandeja-plantilla__firma-label">O dibuje una firma simple</div>
            <SignaturePad
              v-if="plantillaOpen"
              :key="plantillaPadKey"
              titulo="Dibuje o suba la imagen de firma"
              :existing-image="plantillaEdit.firma_imagen || ''"
              :show-cancel="false"
              allow-upload
              height="160px"
              @save="onPlantillaFirmaSave"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bandeja-plantilla__actions">
          <q-btn flat no-caps label="Cancelar" color="grey-7" :disable="savingPlantilla" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="save"
            label="Guardar plantilla"
            :loading="savingPlantilla"
            @click="guardarPlantilla"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ----------------------- Detalle ----------------------- -->
    <q-dialog v-model="detalleOpen">
      <q-card class="bandeja-detalle">
        <div class="bandeja-card__header">
          <q-icon name="mail" size="20px" />
          <span>Detalle del correo</span>
          <q-space />
          <q-btn flat dense round icon="close" color="white" v-close-popup />
        </div>
        <q-card-section v-if="detalle">
          <div class="bandeja-detalle__meta">
            <div><strong>Fecha:</strong> {{ fmtFecha(detalle.fecha) }}</div>
            <div>
              <strong>Estado:</strong>
              <q-chip dense :color="detalle.exito ? 'green-1' : 'red-1'" :text-color="detalle.exito ? 'green-9' : 'red-9'" :label="detalle.exito ? 'Enviado' : 'Falló'" />
            </div>
            <div v-if="detalle.nombrecliente"><strong>Cliente:</strong> {{ detalle.nombrecliente }}</div>
            <div><strong>Origen:</strong> {{ contextoLabel(detalle.contexto) }}</div>
            <div v-if="detalle.usuario"><strong>Enviado por:</strong> {{ detalle.usuario }}</div>
            <div><strong>Para:</strong> {{ detalle.para || '—' }}</div>
            <div v-if="detalle.cc"><strong>CC:</strong> {{ detalle.cc }}</div>
            <div><strong>Asunto:</strong> {{ detalle.asunto || '—' }}</div>
            <div v-if="adjuntosDetalle.length">
              <strong>Adjuntos:</strong>
              <q-chip v-for="(a, i) in adjuntosDetalle" :key="i" dense icon="attach_file" :label="a.filename" />
            </div>
            <div v-if="detalle.error" class="text-red-8"><strong>Error:</strong> {{ detalle.error }}</div>
          </div>
          <q-separator class="q-my-sm" />
          <div class="bandeja-detalle__label">Mensaje</div>
          <pre class="bandeja-detalle__body">{{ detalle.cuerpo || '(sin contenido)' }}</pre>
          <q-banner
            v-if="detalle && !puedeReenviar(detalle)"
            dense
            rounded
            class="bg-grey-2 text-grey-9 q-mt-sm"
          >
            Este correo fue generado desde <strong>{{ contextoLabel(detalle.contexto) }}</strong>.
            Para volver a enviarlo, use el módulo correspondiente (puede regenerar PDF y adjuntos allí).
          </q-banner>
        </q-card-section>
        <q-card-actions v-if="detalle" align="right" class="bandeja-detalle__actions">
          <q-btn
            v-if="puedeReenviar(detalle)"
            flat
            no-caps
            icon="forward"
            label="Reenviar"
            color="primary"
            @click="abrirReenviar(detalle)"
          />
          <q-btn flat no-caps label="Cerrar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useResource, correosApi, clientesApi, agendaContactosApi } from 'src/services/api';
import { fmtAgendaCategoria } from 'src/config/modules';
import SignaturePad from 'components/SignaturePad.vue';
import {
  PLANTILLA_CUERPO_SUGERIDA,
  formatCuerpoHtml,
  buildCorreoPreviewShell,
} from 'src/utils/correoBodyHtml';

const $q = useQuasar();
const router = useRouter();
const clientesRes = useResource('clientes');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- Compose ---
const composeOpen = ref(false);
const composeMode = ref('nuevo');
const reenviarAdjuntosRequeridos = ref([]);
const cliente = ref(null);
const clienteNombre = ref('');
const contactosTo = ref([]);
const contactosCc = ref([]);
const manualContactosTo = ref([]);
const manualContactosCc = ref([]);
const selectedTo = ref([]);
const selectedCc = ref([]);
const manualEmail = ref('');
const manualRol = ref('to');
const draggingEmail = ref('');
const dragOverZone = ref('');
const dragPayload = ref(null);
const asunto = ref('');
const cuerpo = ref('');
const adjuntos = ref([]);
const sending = ref(false);
const plantillaSnapshot = ref('');
const cuerpoTextarea = ref(null);

const manualRolOptions = [
  { label: 'Para', value: 'to' },
  { label: 'CC', value: 'cc' },
];

const agendaOpen = ref(false);
const agendaFilter = ref('');
const agendaRows = ref([]);
const agendaSelected = ref([]);
const loadingAgenda = ref(false);

const agendaFiltrados = computed(() => {
  const term = String(agendaFilter.value || '').trim().toLowerCase();
  if (!term) return agendaRows.value;
  return agendaRows.value.filter((c) => {
    const haystack = [c.nombre, c.email, c.cargo, c.empresa, c.categoria]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });
});

// --- Clientes ---
const allClientes = ref([]);
const clienteOptions = ref([]);
const loadingClientes = ref(false);

const displayContactosTo = computed(() => [...contactosTo.value, ...manualContactosTo.value]);
const displayContactosCc = computed(() => [...contactosCc.value, ...manualContactosCc.value]);

const selectedParaPreview = computed(() =>
  displayContactosTo.value
    .filter((c) => selectedTo.value.includes(c.email))
    .map((c) => c.email)
    .join(', '),
);

const selectedCcPreview = computed(() =>
  displayContactosCc.value
    .filter((c) => selectedCc.value.includes(c.email))
    .map((c) => c.email)
    .join(', '),
);

const ASUNTO_DEFAULT = 'Comunicación — DevSoporte';

const DEFAULT_CUERPO_TEMPLATE = PLANTILLA_CUERPO_SUGERIDA;

const correoPlantilla = ref({
  cuerpo_template: DEFAULT_CUERPO_TEMPLATE,
  firma_texto: 'Equipo de Soporte — DevSoporte',
  firma_imagen: '',
  firma_html: '',
});

const plantillaOpen = ref(false);
const plantillaEdit = ref({ cuerpo_template: '', firma_texto: '', firma_imagen: '', firma_html: '' });
const savingPlantilla = ref(false);
const plantillaPadKey = ref(0);
const outlookFolderInput = ref(null);
const firmaImagenInput = ref(null);

function buildSaludo(nombre) {
  const n = String(nombre || '').trim();
  return n ? `Estimados señores ${n},` : 'Estimado(a),';
}

function applyCuerpoTemplate(template, nombre) {
  return String(template || DEFAULT_CUERPO_TEMPLATE).replace(/\{\{saludo\}\}/g, buildSaludo(nombre));
}

function buildPlantilla(nombre) {
  return applyCuerpoTemplate(correoPlantilla.value.cuerpo_template, nombre);
}

function buildFirmaPreviewHtml(firmaTexto, firmaImagen, firmaHtml) {
  if (firmaHtml) {
    return `<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;">${firmaHtml}</div>`;
  }
  const text = escapeHtml(firmaTexto || '').replace(/\n/g, '<br>');
  if (!text && !firmaImagen) return '';
  const img = firmaImagen
    ? `<div style="margin-top:8px;"><img src="${firmaImagen}" alt="Firma" style="max-width:480px;max-height:160px;display:block;" /></div>`
    : '';
  return `
<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;color:#475569;font-size:13px;line-height:1.5;">
  ${text ? `<div>${text}</div>` : ''}
  ${img}
</div>`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function triggerOutlookFolder() {
  outlookFolderInput.value?.click();
}

function triggerFirmaImagen() {
  firmaImagenInput.value?.click();
}

function limpiarFirmaPlantilla() {
  plantillaEdit.value.firma_html = '';
  plantillaEdit.value.firma_imagen = '';
  plantillaPadKey.value += 1;
  if (outlookFolderInput.value) outlookFolderInput.value.value = '';
  if (firmaImagenInput.value) firmaImagenInput.value.value = '';
}

async function onOutlookFolderSelected(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;

  const htmFile = files.find((f) => /\.html?$/i.test(f.name));
  if (!htmFile) {
    $q.notify({
      type: 'warning',
      message: 'Seleccione la carpeta de firmas de Outlook (debe incluir un archivo .htm)',
    });
    return;
  }

  try {
    const imageMap = new Map();
    for (const file of files) {
      if (!/^image\//i.test(file.type)) continue;
      const dataUrl = await readFileAsDataUrl(file);
      const rel = file.webkitRelativePath || file.name;
      const base = rel.split(/[/\\]/).pop().toLowerCase();
      imageMap.set(base, dataUrl);
      imageMap.set(file.name.toLowerCase(), dataUrl);
    }

    const rawHtml = await htmFile.text();
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
    const body = doc.body;
    if (!body) throw new Error('Archivo HTML inválido');

    body.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      const fileName = src.split(/[/\\]/).pop().split('?')[0].toLowerCase();
      if (fileName && imageMap.has(fileName)) {
        img.setAttribute('src', imageMap.get(fileName));
      }
    });

    const unresolved = [...body.querySelectorAll('img')].filter((img) => {
      const src = img.getAttribute('src') || '';
      return src && !/^data:image\//i.test(src) && !/^https?:/i.test(src);
    });

    plantillaEdit.value.firma_html = body.innerHTML.trim();
    plantillaEdit.value.firma_imagen = '';
    plantillaEdit.value.firma_texto = body.innerText.replace(/\s+\n/g, '\n').trim();
    plantillaPadKey.value += 1;

    if (unresolved.length) {
      $q.notify({
        type: 'warning',
        message: `Firma importada, pero ${unresolved.length} imagen(es) no se encontraron. Suba la imagen PNG/JPG manualmente si falta.`,
        timeout: 6000,
      });
    } else {
      $q.notify({ type: 'positive', message: 'Firma de Outlook importada correctamente' });
    }
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo importar la firma de Outlook' });
  }
}

async function onFirmaImagenSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (!/^image\/(jpe?g|png|gif)$/i.test(file.type)) {
    $q.notify({ type: 'warning', message: 'Use una imagen PNG, JPG o GIF' });
    return;
  }
  if (file.size > 600000) {
    $q.notify({ type: 'warning', message: 'La imagen no debe superar 600 KB' });
    return;
  }
  try {
    plantillaEdit.value.firma_imagen = await readFileAsDataUrl(file);
    plantillaEdit.value.firma_html = '';
    plantillaPadKey.value += 1;
    $q.notify({ type: 'positive', message: 'Imagen de firma cargada' });
  } catch {
    $q.notify({ type: 'negative', message: 'No se pudo leer la imagen' });
  }
}

async function cargarPlantillaCorreo() {
  try {
    const data = await correosApi.getPlantilla();
    correoPlantilla.value = {
      cuerpo_template: data.cuerpo_template || DEFAULT_CUERPO_TEMPLATE,
      firma_texto: data.firma_texto || '',
      firma_imagen: data.firma_imagen || '',
      firma_html: data.firma_html || '',
    };
  } catch {
    /* valores por defecto */
  }
}

function abrirPlantilla() {
  plantillaEdit.value = {
    cuerpo_template: correoPlantilla.value.cuerpo_template,
    firma_texto: correoPlantilla.value.firma_texto,
    firma_imagen: correoPlantilla.value.firma_imagen || '',
    firma_html: correoPlantilla.value.firma_html || '',
  };
  plantillaPadKey.value += 1;
  plantillaOpen.value = true;
}

function aplicarPlantillaSugerida() {
  plantillaEdit.value.cuerpo_template = PLANTILLA_CUERPO_SUGERIDA;
  $q.notify({
    type: 'info',
    message: 'Plantilla elegante cargada. Revise el texto y pulse Guardar.',
    timeout: 3500,
  });
}

function onPlantillaFirmaSave(dataUrl) {
  plantillaEdit.value.firma_imagen = dataUrl;
  plantillaEdit.value.firma_html = '';
  $q.notify({ type: 'positive', message: 'Imagen de firma lista para guardar' });
}

async function guardarPlantilla() {
  if (!String(plantillaEdit.value.cuerpo_template || '').trim()) {
    $q.notify({ type: 'warning', message: 'La plantilla del mensaje es obligatoria' });
    return;
  }
  savingPlantilla.value = true;
  try {
    const saved = await correosApi.savePlantilla({
      cuerpo_template: plantillaEdit.value.cuerpo_template,
      firma_texto: plantillaEdit.value.firma_texto,
      firma_imagen: plantillaEdit.value.firma_html ? null : plantillaEdit.value.firma_imagen || null,
      firma_html: plantillaEdit.value.firma_html || null,
    });
    correoPlantilla.value = {
      cuerpo_template: saved.cuerpo_template,
      firma_texto: saved.firma_texto || '',
      firma_imagen: saved.firma_imagen || '',
      firma_html: saved.firma_html || '',
    };
    plantillaOpen.value = false;
    $q.notify({ type: 'positive', message: 'Plantilla y firma guardadas' });
    if (composeOpen.value && cuerpo.value === plantillaSnapshot.value) {
      restaurarPlantilla();
    }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'No se pudo guardar la plantilla' });
  } finally {
    savingPlantilla.value = false;
  }
}

function resizeCuerpoTextarea() {
  const el = cuerpoTextarea.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function parseEmailList(text) {
  if (!text) return [];
  return [
    ...new Set(
      String(text)
        .split(/[,;]+/)
        .map((e) => e.trim())
        .filter((e) => EMAIL_RE.test(e)),
    ),
  ];
}

function parseAdjuntosMeta(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function resetComposeRecipients() {
  contactosTo.value = [];
  contactosCc.value = [];
  manualContactosTo.value = [];
  manualContactosCc.value = [];
  selectedTo.value = [];
  selectedCc.value = [];
  manualEmail.value = '';
  manualRol.value = 'to';
}

function normalizeAdjuntoNombre(name) {
  return String(name || '').trim().toLowerCase();
}

function archivoCoincideRequerido(file, requiredFilename) {
  if (!file || !requiredFilename) return false;
  return normalizeAdjuntoNombre(file.name) === normalizeAdjuntoNombre(requiredFilename);
}

function onReenviarAdjuntoSelected(index, file) {
  const req = reenviarAdjuntosRequeridos.value[index];
  if (!req) return;
  if (!file) {
    req.file = null;
    return;
  }
  if (!archivoCoincideRequerido(file, req.filename)) {
    $q.notify({
      type: 'warning',
      message: `El archivo debe llamarse exactamente "${req.filename}" (mismo nombre y extensión).`,
    });
    req.file = null;
    return;
  }
  req.file = file;
}

function quitarReenviarAdjunto(index) {
  const req = reenviarAdjuntosRequeridos.value[index];
  if (req) req.file = null;
}

function abrirNuevo() {
  composeMode.value = 'nuevo';
  reenviarAdjuntosRequeridos.value = [];
  resetComposeRecipients();
  cliente.value = null;
  clienteNombre.value = '';
  asunto.value = ASUNTO_DEFAULT;
  adjuntos.value = [];
  const tpl = buildPlantilla('');
  cuerpo.value = tpl;
  plantillaSnapshot.value = tpl;
  composeOpen.value = true;
  nextTick(resizeCuerpoTextarea);
  loadEquipoAgendaToCc();
}

function puedeReenviar(row) {
  return (row?.contexto || '') === 'bandeja';
}

async function abrirReenviar(row) {
  if (!row) return;
  if (!puedeReenviar(row)) {
    $q.notify({
      type: 'info',
      message: 'Solo se pueden reenviar correos elaborados manualmente en la bandeja. Use el módulo de origen para volver a enviar.',
    });
    return;
  }
  let data = row;
  if (!row.cuerpo) {
    try {
      data = await correosApi.get(row.id);
    } catch {
      /* datos de la fila */
    }
  }

  composeMode.value = 'reenviar';
  reenviarAdjuntosRequeridos.value = parseAdjuntosMeta(data.adjuntos).map((a) => ({
    filename: a.filename || 'adjunto',
    file: null,
  }));
  resetComposeRecipients();
  detalleOpen.value = false;

  cliente.value = data.cliente || null;
  clienteNombre.value = data.nombrecliente || '';
  asunto.value = data.asunto || ASUNTO_DEFAULT;
  cuerpo.value = data.cuerpo || '';
  plantillaSnapshot.value = cuerpo.value;
  adjuntos.value = [];

  const paraEmails = parseEmailList(data.para);
  const ccEmails = parseEmailList(data.cc);
  manualContactosTo.value = paraEmails.map((email, i) => ({
    id: `r-to-${i}-${email}`,
    email,
    nombre: email,
    manual: true,
  }));
  manualContactosCc.value = ccEmails.map((email, i) => ({
    id: `r-cc-${i}-${email}`,
    email,
    nombre: email,
    manual: true,
  }));
  selectedTo.value = [...paraEmails];
  selectedCc.value = [...ccEmails];

  composeOpen.value = true;
  nextTick(resizeCuerpoTextarea);

  if (!paraEmails.length) {
    $q.notify({
      type: 'warning',
      message: 'El correo original no tiene destinatarios válidos en Para. Agregue al menos uno.',
    });
  }
}

function agendaEntryFromRow(c) {
  return {
    id: `ag-${c.codigo}`,
    codigo: c.codigo,
    email: c.email,
    nombre: c.nombre,
    cargo: c.cargo,
    empresa: c.empresa,
    categoria: c.categoria,
    agenda: true,
  };
}

function addAgendaContacts(contacts, zone) {
  let added = 0;
  for (const c of contacts) {
    const email = String(c.email || '').trim();
    if (!EMAIL_RE.test(email)) continue;
    if (existsInZone(email, zone)) {
      const selectedList = zone === 'cc' ? selectedCc : selectedTo;
      if (!selectedList.value.includes(email)) selectedList.value.push(email);
      continue;
    }
    const entry = agendaEntryFromRow(c);
    if (zone === 'cc') {
      contactosCc.value.push(entry);
      if (!selectedCc.value.includes(email)) selectedCc.value.push(email);
    } else {
      contactosTo.value.push(entry);
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

async function loadEquipoAgendaToCc() {
  try {
    const rows = await agendaContactosApi.listActivos({ categoria: 'equipo' });
    const added = addAgendaContacts(rows, 'cc');
    if (added > 0) {
      $q.notify({
        type: 'info',
        message: `${added} contacto(s) del equipo agregados en CC`,
        timeout: 2500,
      });
    }
  } catch {
    /* sin agenda */
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
    message: `${added || picked.length} contacto(s) agregados a ${zone === 'cc' ? 'CC' : 'Para'}`,
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

function irAgendaContactos() {
  composeOpen.value = false;
  router.push('/agenda_contactos');
}

function restaurarPlantilla() {
  const tpl = buildPlantilla(clienteNombre.value);
  cuerpo.value = tpl;
  plantillaSnapshot.value = tpl;
  nextTick(resizeCuerpoTextarea);
}

const adjuntosReenvioCompletos = computed(() => {
  if (composeMode.value !== 'reenviar' || !reenviarAdjuntosRequeridos.value.length) return true;
  return reenviarAdjuntosRequeridos.value.every(
    (r) => r.file && archivoCoincideRequerido(r.file, r.filename),
  );
});

const adjuntosPreview = computed(() => {
  if (composeMode.value === 'reenviar' && reenviarAdjuntosRequeridos.value.length) {
    return reenviarAdjuntosRequeridos.value.map((r) => ({
      label: r.file ? r.filename : `${r.filename} (pendiente)`,
      ok: Boolean(r.file),
    }));
  }
  return (adjuntos.value || []).map((f) => ({ label: f.name, ok: true }));
});

const canSend = computed(
  () =>
    !sending.value
    && asunto.value.trim()
    && cuerpo.value.trim()
    && selectedTo.value.length > 0
    && adjuntosReenvioCompletos.value,
);

// --- Vista previa (réplica del HTML que arma el backend) ---
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const previewHtml = computed(() => {
  const firma = buildFirmaPreviewHtml(
    correoPlantilla.value.firma_texto,
    correoPlantilla.value.firma_imagen,
    correoPlantilla.value.firma_html,
  );
  return buildCorreoPreviewShell(asunto.value, formatCuerpoHtml(cuerpo.value), firma);
});

function contactCardLabel(c) {
  const name = String(c?.nombre || '').trim();
  const email = String(c?.email || '').trim();
  if (name && name.toLowerCase() !== email.toLowerCase()) return name;
  return email;
}

function showEmailTooltip(c) {
  const name = String(c?.nombre || '').trim();
  const email = String(c?.email || '').trim();
  return Boolean(name && email && name.toLowerCase() !== email.toLowerCase());
}

function selectAllTo() {
  selectedTo.value = displayContactosTo.value.map((c) => c.email);
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
  if (fromZone === toZone) return;
  const email = contact.email;
  if (existsInZone(email, toZone)) {
    $q.notify({ type: 'info', message: 'Ese correo ya está en la columna destino' });
    return;
  }
  const wasSelected = fromZone === 'to'
    ? selectedTo.value.includes(email)
    : selectedCc.value.includes(email);
  removeFromZone(email, fromZone);
  const entry = { ...contact, id: `${toZone}-${Date.now()}-${email}` };
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
  if (!dragPayload.value) return;
  dragOverZone.value = zone;
}

function onDragLeave(zone) {
  if (dragOverZone.value === zone) dragOverZone.value = '';
}

function onDrop(toZone, event) {
  dragOverZone.value = '';
  const payload = dragPayload.value;
  if (!payload) return;
  moveContact(payload.contact, payload.fromZone, toZone);
  onDragEnd();
  event.stopPropagation();
}

function addManualEmail() {
  const email = String(manualEmail.value || '').trim();
  if (!EMAIL_RE.test(email)) {
    $q.notify({ type: 'warning', message: 'Ingrese un correo válido' });
    return;
  }
  const zone = manualRol.value === 'cc' ? 'cc' : 'to';
  if (existsInZone(email, zone)) {
    const selectedList = zone === 'cc' ? selectedCc : selectedTo;
    if (!selectedList.value.includes(email)) selectedList.value.push(email);
    manualEmail.value = '';
    return;
  }
  const entry = {
    id: `m-${Date.now()}`,
    email,
    nombre: email,
    manual: true,
  };
  if (zone === 'cc') {
    manualContactosCc.value.push(entry);
    selectedCc.value.push(email);
  } else {
    manualContactosTo.value.push(entry);
    selectedTo.value.push(email);
  }
  manualEmail.value = '';
}

function filterClientes(needle, update) {
  const term = needle.toLowerCase();
  update(() => {
    clienteOptions.value = !term
      ? allClientes.value
      : allClientes.value.filter((o) => o.label.toLowerCase().includes(term));
  });
}

async function onClienteChange(codigo) {
  if (!codigo) {
    clienteNombre.value = '';
    return;
  }
  const opt = allClientes.value.find((o) => o.value === codigo);
  clienteNombre.value = opt?.nombre || '';
  // Si el cuerpo sigue siendo la plantilla sin tocar, personaliza el saludo.
  if (cuerpo.value === plantillaSnapshot.value) {
    const tpl = buildPlantilla(clienteNombre.value);
    cuerpo.value = tpl;
    plantillaSnapshot.value = tpl;
  }
  try {
    const dest = await clientesApi.destinatarios(codigo, { incluirEquipo: 1 });
    const hadRecipients = displayContactosTo.value.length || displayContactosCc.value.length;
    if (!hadRecipients) {
      contactosTo.value = (dest.contactosConEmail || []).map((c, i) => ({
        ...c,
        id: `to-${i}-${c.email}`,
      }));
      contactosCc.value = (dest.equipoConEmail || []).map((c, i) => ({
        ...c,
        id: `cc-${i}-${c.email}`,
      }));
      selectedTo.value = contactosTo.value.map((c) => c.email);
      selectedCc.value = contactosCc.value.map((c) => c.email);
    }
  } catch {
    /* cliente sin destinatarios: se ignora */
  }
}

function onFilesRejected(rejected) {
  const reason = rejected[0]?.failedPropValidation;
  const msg = reason === 'max-total-size'
    ? 'Los adjuntos superan el límite total (15 MB).'
    : reason === 'max-files'
      ? 'Máximo 10 adjuntos.'
      : 'Adjunto no permitido.';
  $q.notify({ type: 'warning', message: msg });
}

async function enviar() {
  if (!canSend.value) return;
  if (composeMode.value === 'reenviar' && reenviarAdjuntosRequeridos.value.length) {
    const faltantes = reenviarAdjuntosRequeridos.value.filter((r) => !r.file);
    if (faltantes.length) {
      $q.notify({
        type: 'warning',
        message: `Faltan ${faltantes.length} adjunto(s) requerido(s)`,
      });
      return;
    }
    const invalidos = reenviarAdjuntosRequeridos.value.filter(
      (r) => !archivoCoincideRequerido(r.file, r.filename),
    );
    if (invalidos.length) {
      $q.notify({
        type: 'warning',
        message: 'Todos los adjuntos deben conservar el mismo nombre y extensión del correo original',
      });
      return;
    }
  }
  sending.value = true;
  try {
    const fd = new FormData();
    if (cliente.value) fd.append('cliente', cliente.value);
    fd.append('asunto', asunto.value.trim());
    fd.append('cuerpo', cuerpo.value);
    fd.append('para', JSON.stringify(selectedTo.value));
    if (selectedCc.value.length) fd.append('cc', JSON.stringify(selectedCc.value));
    const filesToSend = composeMode.value === 'reenviar' && reenviarAdjuntosRequeridos.value.length
      ? reenviarAdjuntosRequeridos.value.map((r) => r.file).filter(Boolean)
      : (adjuntos.value || []);
    for (const file of filesToSend) fd.append('adjuntos', file);

    await correosApi.enviar(fd);
    $q.notify({
      type: 'positive',
      message: composeMode.value === 'reenviar' ? 'Correo reenviado correctamente.' : 'Correo enviado correctamente.',
    });
    composeOpen.value = false;
    reload();
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.error || 'No se pudo enviar el correo',
    });
    reload();
  } finally {
    sending.value = false;
  }
}

// --- Historial ---
const rows = ref([]);
const loadingTable = ref(false);
const filtros = ref({ q: '', exito: 'Todos', contexto: 'Todos' });
const pagination = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 });

const estadoOptions = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Enviados', value: 'true' },
  { label: 'Con error', value: 'false' },
];
const contextoOptions = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Bandeja', value: 'bandeja' },
  { label: 'Capacitación', value: 'capacitacion' },
  { label: 'Bitácora', value: 'bitacora' },
  { label: 'Bitácora semanal', value: 'bitacora_semana' },
  { label: 'Firmas semana', value: 'bitacora_firmas_semana' },
  { label: 'Firma', value: 'firma' },
  { label: 'Informe actividades', value: 'actproy' },
  { label: 'Invitación', value: 'invitacion' },
  { label: 'Sistema', value: 'sistema' },
];

const columns = [
  { name: 'fecha', label: 'Fecha', field: 'fecha', align: 'left', format: (v) => fmtFecha(v) },
  { name: 'nombrecliente', label: 'Cliente', field: (r) => r.nombrecliente || r.cliente || '—', align: 'left' },
  { name: 'contexto', label: 'Origen', field: 'contexto', align: 'left' },
  { name: 'asunto', label: 'Asunto', field: 'asunto', align: 'left' },
  { name: 'para', label: 'Para', field: 'para', align: 'left' },
  { name: 'num_destinatarios', label: 'Dest.', field: 'num_destinatarios', align: 'center' },
  { name: 'exito', label: 'Estado', field: 'exito', align: 'center' },
  { name: 'usuario', label: 'Usuario', field: 'usuario', align: 'left' },
  { name: 'acciones', label: '', field: 'id', align: 'center', style: 'width: 48px' },
];

async function onRequest(props) {
  const { page, rowsPerPage } = props.pagination;
  loadingTable.value = true;
  try {
    const params = { page, limit: rowsPerPage };
    if (filtros.value.q) params.q = filtros.value.q;
    if (filtros.value.exito !== 'Todos') params.exito = filtros.value.exito;
    if (filtros.value.contexto !== 'Todos') params.contexto = filtros.value.contexto;
    const res = await correosApi.list(params);
    rows.value = res.data;
    pagination.value = {
      page: res.page,
      rowsPerPage: res.limit,
      rowsNumber: res.total,
    };
  } catch (err) {
    $q.notify({ type: 'negative', message: err.response?.data?.error || 'No se pudo cargar el historial' });
  } finally {
    loadingTable.value = false;
  }
}

function reload() {
  onRequest({ pagination: { page: 1, rowsPerPage: pagination.value.rowsPerPage } });
}

// --- Detalle ---
const detalleOpen = ref(false);
const detalle = ref(null);
const adjuntosDetalle = computed(() => {
  if (!detalle.value?.adjuntos) return [];
  try {
    const arr = JSON.parse(detalle.value.adjuntos);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
});

async function verDetalle(row) {
  detalle.value = row;
  detalleOpen.value = true;
  try {
    detalle.value = await correosApi.get(row.id);
  } catch {
    /* se queda con los datos de la fila */
  }
}

// --- Utilidades ---
function fmtFecha(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('es-CO');
}

function contextoLabel(ctx) {
  return contextoOptions.find((o) => o.value === ctx)?.label || ctx || 'Sistema';
}

function contextoColor(ctx) {
  const map = {
    bandeja: 'indigo',
    capacitacion: 'blue',
    bitacora: 'teal',
    bitacora_semana: 'cyan',
    bitacora_firmas_semana: 'deep-purple',
    firma: 'deep-purple',
    actproy: 'purple',
    invitacion: 'orange',
    sistema: 'blue-grey',
  };
  return map[ctx] || 'grey';
}

watch(composeOpen, (open) => {
  if (open) nextTick(resizeCuerpoTextarea);
});

watch(cuerpo, () => nextTick(resizeCuerpoTextarea));

onMounted(async () => {
  await cargarPlantillaCorreo();
  loadingClientes.value = true;
  try {
    const res = await clientesRes.list({ limit: 200 });
    allClientes.value = (res.data || []).map((c) => ({
      label: `${c.nombrecliente || c.codigo} (${c.codigo})`,
      value: c.codigo,
      nombre: c.nombrecliente || c.codigo,
    }));
    clienteOptions.value = allClientes.value;
  } catch {
    /* sin clientes */
  } finally {
    loadingClientes.value = false;
  }
  reload();
});
</script>

<style scoped lang="scss">
.bandeja-card {
  border-radius: 12px;
  overflow: hidden;
}

.bandeja-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;

  &--compact {
    padding: 5px 12px;
    font-size: 0.85rem;
    gap: 6px;
  }
}

.bandeja-filtros {
  padding-bottom: 4px;
}

.bandeja-table {
  :deep(tbody tr) {
    cursor: pointer;
  }
}

/* ----- Compose dialog ----- */
.bandeja-compose-shell :deep(.q-dialog__inner) {
  padding: 8px;
}

.bandeja-compose {
  display: flex;
  flex-direction: column;
  max-width: 1100px;
  width: 100%;
  max-height: calc(100vh - 24px);
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
}

.bandeja-compose__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
}

.bandeja-compose__adjuntos-req {
  padding: 10px 12px;
  border: 1px solid #bbdefb;
  border-radius: 10px;
  background: #e3f2fd;
}

.bandeja-compose__adjuntos-req-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #0d47a1;
  margin-bottom: 4px;
}

.bandeja-compose__adjuntos-req-hint {
  margin: 0 0 10px;
  font-size: 0.78rem;
  color: #1565c0;
  line-height: 1.4;
}

.bandeja-compose__adjunto-req-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 6px;
  border: 1px solid #90caf9;
  border-radius: 8px;
  background: #fff;

  &--ok {
    border-color: #81c784;
    background: #f1f8e9;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.bandeja-compose__adjunto-req-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bandeja-compose__adjunto-req-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1e293b;
  word-break: break-all;
}

.bandeja-compose__adjunto-req-file {
  min-width: 0;
}

.bandeja-compose__recipients-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bandeja-compose__top-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  align-items: end;
}

.bandeja-compose__cliente {
  min-width: 0;
}

.bandeja-compose__manual {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  min-width: 0;
}

.bandeja-compose__manual-email {
  flex: 1 1 auto;
  min-width: 0;
}

.bandeja-compose__manual-rol {
  flex: 0 0 110px;
  min-width: 110px;
}

.bandeja-compose__manual-add,
.bandeja-compose__agenda-btn {
  flex-shrink: 0;
}

.bandeja-agenda {
  width: min(560px, 96vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.bandeja-agenda__list {
  position: relative;
  flex: 1;
  min-height: 180px;
  max-height: 52vh;
  overflow-y: auto;
}

.bandeja-agenda__actions {
  border-top: 1px solid #e2e8f0;
  padding: 10px 16px;
}

.bandeja-compose__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  align-items: stretch;
  min-height: 0;
}

.bandeja-compose__form {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.bandeja-compose__message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.bandeja-compose__editor-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #eef2f7;
  padding: 12px;
}

.bandeja-compose__content-scroll {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
  min-height: 120px;
  max-height: 280px;
}

.bandeja-compose__content-card {
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}

.bandeja-compose__content-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #0d47a1;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.3;
}

.bandeja-compose__content-textarea {
  display: block;
  width: 100%;
  min-height: 140px;
  border: none;
  outline: none;
  resize: none;
  padding: 0;
  margin: 0;
  background: transparent;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #1e293b;
  field-sizing: content;
  overflow: hidden;

  &::placeholder {
    color: #94a3b8;
  }
}

.bandeja-compose__recipients {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.bandeja-compose__recipient-col {
  min-width: 0;
  padding: 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &--drop-active {
    border-color: #1565c0;
    box-shadow: inset 0 0 0 2px rgba(21, 101, 192, 0.15);
    background: #f8fbff;
  }
}

.bandeja-compose__recipient-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.bandeja-compose__recipient-title {
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
}

.bandeja-compose__recipient-toolbar {
  display: flex;
  gap: 2px;
}

.bandeja-compose__recipient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 4px;
}

.bandeja-compose__recipient-card {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  min-height: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  background: #fafafa;
  cursor: grab;
  transition: border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
  user-select: none;

  :deep(.q-checkbox) {
    margin-top: 0;
    padding: 0;
  }

  :deep(.q-checkbox__inner) {
    font-size: 22px;
  }

  :deep(.q-badge) {
    font-size: 0.55rem;
    padding: 1px 3px;
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

  &--to.bandeja-compose__recipient-card--selected {
    border-color: #1565c0;
  }

  &--cc.bandeja-compose__recipient-card--selected {
    border-color: #00897b;
  }
}

.bandeja-compose__move-btn {
  flex-shrink: 0;
  margin-left: auto;
  min-width: 18px;
  min-height: 18px;
  width: 18px;
  height: 18px;

  :deep(.q-icon) {
    font-size: 14px;
  }
}

.bandeja-compose__recipient-line {
  font-size: 0.58rem;
  font-weight: 500;
  color: #334155;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

.bandeja-compose__recipient-empty {
  margin: 0;
  font-size: 0.76rem;
  color: #94a3b8;
  font-style: italic;
}

.bandeja-compose__body-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0;
}

.bandeja-compose__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
}

.bandeja-compose__preview {
  min-width: 0;
  min-height: 0;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #eef2f7;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bandeja-compose__preview-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.bandeja-compose__preview-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.8rem;
  color: #334155;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  word-break: break-word;
}

.bandeja-compose__actions {
  flex-shrink: 0;
  padding: 8px 14px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

/* ----- Detalle ----- */
.bandeja-detalle {
  width: 640px;
  max-width: 92vw;
  border-radius: 12px;
}

.bandeja-detalle__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #334155;
}

.bandeja-detalle__label {
  margin-bottom: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.bandeja-detalle__body {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  font-family: inherit;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow: auto;
}

.bandeja-detalle__actions {
  padding: 8px 14px;
  border-top: 1px solid #e2e8f0;
}

.bandeja-plantilla-shell :deep(.q-dialog__inner) {
  padding: 8px;
}

.bandeja-plantilla {
  display: flex;
  flex-direction: column;
  width: 760px;
  max-width: 96vw;
  max-height: calc(100vh - 24px);
  border-radius: 12px;
  overflow: hidden;
}

.bandeja-plantilla__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  background: #f8fafc;
}

.bandeja-plantilla__hint {
  margin: 0 0 8px;
  font-size: 0.82rem;
  color: #64748b;

  code {
    padding: 1px 6px;
    border-radius: 4px;
    background: #e2e8f0;
    color: #334155;
    font-size: 0.8rem;
  }
}

.bandeja-plantilla__template-toolbar {
  margin-bottom: 10px;
}

.bandeja-plantilla__firma-label {
  margin-bottom: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
}

.bandeja-plantilla__firma-pad {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
}

.bandeja-plantilla__outlook-hint {
  margin: 0 0 10px;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.45;

  code {
    padding: 1px 6px;
    border-radius: 4px;
    background: #e2e8f0;
    color: #334155;
    font-size: 0.78rem;
  }
}

.bandeja-plantilla__file-input {
  display: none;
}

.bandeja-plantilla__firma-preview-box {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  overflow: auto;
  max-height: 220px;
}

.bandeja-plantilla__firma-preview-img {
  max-width: 100%;
  max-height: 160px;
  display: block;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 8px;
}

.bandeja-plantilla__header {
  flex-shrink: 0;
}

.bandeja-plantilla__actions {
  flex-shrink: 0;
  padding: 10px 14px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.06);
}

@media (max-width: 900px) {
  .bandeja-compose__main {
    grid-template-columns: 1fr;
  }

  .bandeja-compose__top-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .bandeja-compose__adjunto-req-row {
    grid-template-columns: 1fr;
  }

  .bandeja-compose__recipients {
    grid-template-columns: 1fr;
  }

  .bandeja-compose__manual {
    flex-wrap: wrap;
  }

  .bandeja-compose__manual-rol {
    flex: 1 1 100px;
  }
}
</style>
