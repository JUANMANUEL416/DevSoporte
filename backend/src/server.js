import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import { entities } from './entities.js';
import { crudRouter } from './crudRouter.js';
import { query } from './db/pool.js';
import { getAppVersion } from './version.js';
import {
  appEnv,
  assertPruebasIsolation,
  getAppEnvLabel,
  getDatabaseName,
  isPruebas,
  isProduction,
} from './config/env.js';
import { sendFirmaLinkEmail } from './services/firmaEmail.js';
import { applyClienteNotificaciones } from './services/clienteNotificaciones.js';
import {
  enviarNotificacionBitacora,
  enviarNotificacionCapacitacion,
  enviarNotificacionCronograma,
} from './services/notificacionEmail.js';
import {
  previewBitacoraHandler,
  previewCapacitacionHandler,
  previewCronogramaHandler,
} from './routes/notificacionPreview.js';
import { agregarTemaHandler, cambiarEstadoItemHandler, cambiarEstadoTemaHandler, duplicarHandler } from './routes/cronograma.js';
import {
  cronogramasClienteActaHandler,
  prefillActaHandler,
  temasActaHandler,
} from './routes/cronogramaCapacitacion.js';
import { cronogramaPdfHandler } from './routes/cronogramaPdf.js';
import {
  beforeCronogramaCreate,
  beforeCronogramaItemCreate,
  beforeCronogramaItemUpdate,
  beforeCronogramaUpdate,
  beforeTemaItemCreate,
} from './services/cronogramaHooks.js';
import destinatariosHandler from './routes/clienteNotificaciones.js';
import clienteEquipoRoutes from './routes/clienteEquipo.js';
import { cambiarEstadoHandler, estadoOpcionesHandler } from './routes/capacitacionEstado.js';
import { capacitacionPdfHandler } from './routes/capacitacionPdf.js';
import {
  publicFirmaRouter,
  enviarFirmaAsistenteHandler,
  enviarFirmasCapacitacionHandler,
} from './routes/firmaPublica.js';
import { isMailConfigured } from './services/mailer.js';
import { beforeBitacoraCreate, beforeBitacoraUpdate, beforeBitacoraDelete } from './services/bitacoraHooks.js';
import { invitacionesRouter } from './routes/invitaciones.js';
import { publicRegistroRouter, registroLinkHandler } from './routes/registroPublico.js';
import dashboardRoutes from './routes/dashboard.js';
import semanasRoutes from './routes/semanas.js';
import correosRoutes from './routes/correos.js';
import bitacoraCerrarRoutes from './routes/bitacoraCerrar.js';
import bitacoraSemanaClienteRoutes from './routes/bitacoraSemanaCliente.js';
import { bitacoraPdfHandler } from './routes/bitacoraPdf.js';
import {
  actproyPdfHandler,
  actproyFirmaEstadoHandler,
  actproyEnviarFirmaHandler,
  actproyPreviewInformeHandler,
  actproyEnviarInformeHandler,
} from './routes/actproy.js';
import { beforeActproyCreate, beforeActproyUpdate } from './services/actproyHooks.js';
import { beforeSoportCreate, beforeSoportUpdate } from './services/soportHooks.js';
import { beforeDevcambCreate, beforeDevcambUpdate } from './services/devcambHooks.js';
import { beforeAgconCreate, beforeAgconUpdate } from './services/agendaContactoHooks.js';
import controlVersionesRoutes from './routes/controlVersiones.js';

async function ensureCapacitacionAbierta(cnscapacita) {
  if (!cnscapacita) return;
  const cap = await query('SELECT estado FROM rasist WHERE cnscapacita = $1', [cnscapacita]);
  if (!cap.rows.length) return;
  if ((cap.rows[0].estado || 'Abierta') !== 'Abierta') {
    const err = new Error('La capacitación no está abierta');
    err.status = 409;
    throw err;
  }
}

async function validateAsistenteCreate(body) {
  if (!body.cnscapacita || !body.documento) return;
  await ensureCapacitacionAbierta(body.cnscapacita);
  const dup = await query(
    'SELECT 1 FROM rasistd WHERE cnscapacita = $1 AND documento = $2',
    [body.cnscapacita, body.documento],
  );
  if (dup.rows.length) {
    const err = new Error('Este funcionario ya está registrado como asistente en esta capacitación');
    err.status = 409;
    throw err;
  }
}

async function afterAsistenteCreate(row) {
  try {
    return await sendFirmaLinkEmail(row);
  } catch (err) {
    console.error('[asistentes] afterCreate firma email:', err.message);
    return { sent: false, reason: 'error', message: err.message };
  }
}

function beforeAsistenteUpdate(body, ids) {
  if (body.firma !== undefined && body.firma !== null && String(body.firma).trim() !== '') {
    body.firma_fecha = new Date().toISOString();
  }
}

async function beforeAsistenteUpdateGuard(body, ids) {
  beforeAsistenteUpdate(body, ids);
  const cnscapacita = body.cnscapacita || ids[0];
  await ensureCapacitacionAbierta(cnscapacita);
}

function beforeCapacitacionCreate(body) {
  body.estado = 'Abierta';
}

async function beforeCapacitacionUpdate(body, ids) {
  delete body.estado;
  await ensureCapacitacionAbierta(ids[0]);
}

function beforeClienteSave(body) {
  Object.assign(body, applyClienteNotificaciones(body));
}

// Hooks por entidad (validaciones, correo, etc.).
const entityHooks = {
  clientes: {
    beforeCreate: beforeClienteSave,
    beforeUpdate: beforeClienteSave,
  },
  capacitaciones: {
    beforeCreate: beforeCapacitacionCreate,
    beforeUpdate: beforeCapacitacionUpdate,
  },
  asistentes: {
    validateCreate: validateAsistenteCreate,
    afterCreate: afterAsistenteCreate,
    beforeUpdate: beforeAsistenteUpdateGuard,
  },
  bitacora: {
    beforeCreate: beforeBitacoraCreate,
    beforeUpdate: beforeBitacoraUpdate,
    beforeDelete: beforeBitacoraDelete,
  },
  actividades_proyecto: {
    beforeCreate: beforeActproyCreate,
    beforeUpdate: beforeActproyUpdate,
  },
  soportes: {
    beforeCreate: beforeSoportCreate,
    beforeUpdate: beforeSoportUpdate,
  },
  agenda_contactos: {
    beforeCreate: beforeAgconCreate,
    beforeUpdate: beforeAgconUpdate,
  },
  cambios_desarrollo: {
    beforeCreate: beforeDevcambCreate,
    beforeUpdate: beforeDevcambUpdate,
  },
  temas_capacitacion_items: {
    beforeCreate: beforeTemaItemCreate,
  },
  cronograma: {
    beforeCreate: beforeCronogramaCreate,
    beforeUpdate: beforeCronogramaUpdate,
  },
  cronograma_items: {
    beforeCreate: beforeCronogramaItemCreate,
    beforeUpdate: beforeCronogramaItemUpdate,
  },
};

// DevSoporte API
assertPruebasIsolation();
const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  }),
);
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    service: 'DevSoporte API',
    version: getAppVersion(),
    appEnv,
    appEnvLabel: getAppEnvLabel(),
    isPruebas,
    isProduction,
    database: getDatabaseName(),
    env: process.env.NODE_ENV || 'development',
    mailConfigured: isMailConfigured(),
  }),
);

app.use('/api/public/firma', publicFirmaRouter);
app.use('/api/public/registro', publicRegistroRouter);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/semanas', requireAuth, semanasRoutes);
app.use('/api/correos', requireAuth, correosRoutes);
app.use('/api/control-versiones', requireAuth, controlVersionesRoutes);

// Expone la lista de entidades disponibles (útil para el menú dinámico).
app.get('/api/entities', requireAuth, (req, res) => {
  res.json(
    Object.entries(entities).map(([key, e]) => ({ key, label: e.label, pk: e.pk })),
  );
});

app.get('/api/clientes/:codigo/destinatarios-notificacion', requireAuth, destinatariosHandler);
app.use('/api/clientes', requireAuth, clienteEquipoRoutes);
app.get('/api/capacitaciones/:id/estado-opciones', requireAuth, estadoOpcionesHandler);
app.post('/api/capacitaciones/:id/cambiar-estado', requireAuth, cambiarEstadoHandler);
app.get('/api/capacitaciones/:id/preview-notificacion', requireAuth, previewCapacitacionHandler);
app.get('/api/bitacora/:id/preview-notificacion', requireAuth, previewBitacoraHandler);
app.get('/api/cronograma/:id/preview-notificacion', requireAuth, previewCronogramaHandler);
app.get('/api/cronograma/cliente/:cliente/cronogramas-acta', requireAuth, cronogramasClienteActaHandler);
app.get('/api/cronograma/:id/temas-acta', requireAuth, temasActaHandler);
app.get('/api/cronograma/:id/tema/:temaCodigo/prefill-acta', requireAuth, prefillActaHandler);
app.post('/api/cronograma/:id/agregar-tema', requireAuth, agregarTemaHandler);
app.post('/api/cronograma/:id/duplicar', requireAuth, duplicarHandler);
app.post('/api/cronograma/:id/tema/cambiar-estado', requireAuth, cambiarEstadoTemaHandler);
app.post('/api/cronograma/:id/items/:item/cambiar-estado', requireAuth, cambiarEstadoItemHandler);
app.get('/api/cronograma/:id/pdf', requireAuth, cronogramaPdfHandler);
app.post('/api/cronograma/:id/enviar-notificacion', requireAuth, async (req, res, next) => {
  try {
    const result = await enviarNotificacionCronograma(req.params.id, req.body, req.user?.usuario);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});
app.post('/api/capacitaciones/:id/enviar-notificacion', requireAuth, async (req, res, next) => {
  try {
    const result = await enviarNotificacionCapacitacion(req.params.id, req.body, req.user?.usuario);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});
app.post('/api/bitacora/:id/enviar-notificacion', requireAuth, async (req, res, next) => {
  try {
    const result = await enviarNotificacionBitacora(req.params.id, req.body, req.user?.usuario);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});
app.use('/api/bitacora', requireAuth, bitacoraSemanaClienteRoutes);
app.use('/api/bitacora', requireAuth, bitacoraCerrarRoutes);
app.get('/api/bitacora/semana-pdf/:cnsbite/:cliente', requireAuth, bitacoraPdfHandler);

app.get('/api/capacitaciones/:id/pdf', requireAuth, capacitacionPdfHandler);
app.get('/api/capacitaciones/:id/registro-link', requireAuth, registroLinkHandler);
app.post('/api/capacitaciones/:id/enviar-firmas', requireAuth, enviarFirmasCapacitacionHandler);
app.use('/api/capacitaciones/:id/invitaciones', requireAuth, invitacionesRouter);
app.post('/api/asistentes/:id/enviar-firma', requireAuth, enviarFirmaAsistenteHandler);

app.get('/api/actividades_proyecto/:id/pdf', requireAuth, actproyPdfHandler);
app.get('/api/actividades_proyecto/:id/firma-estado', requireAuth, actproyFirmaEstadoHandler);
app.post('/api/actividades_proyecto/:id/enviar-firma', requireAuth, actproyEnviarFirmaHandler);
app.get('/api/actividades_proyecto/:id/preview-informe', requireAuth, actproyPreviewInformeHandler);
app.post('/api/actividades_proyecto/:id/enviar-informe', requireAuth, actproyEnviarInformeHandler);

// Monta un CRUD REST por cada entidad migrada del diccionario Clarion.
for (const [key, entity] of Object.entries(entities)) {
  const hooks = entityHooks[key] || {};
  app.use(`/api/${key}`, requireAuth, crudRouter({ ...entity, ...hooks }));
}

if (isProduction) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const spaDir = path.join(__dirname, '../../frontend/dist/spa');
  app.use(express.static(spaDir, { index: false, maxAge: '1d' }));
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(spaDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

// Manejo de errores centralizado.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  const mode = isProduction ? 'producción' : isPruebas ? 'pruebas' : 'desarrollo';
  const envTag = isPruebas ? ' [PRUEBAS]' : '';
  console.log(`DevSoporte v${getAppVersion()} (${mode})${envTag} → http://localhost:${port}`);
  console.log(`Entorno: ${getAppEnvLabel()} | Base de datos: ${getDatabaseName()}`);
  if (isPruebas) {
    console.log('Producción no se detiene: PM2/servicio real sigue en http://localhost:3300 (BD devsoporte).');
  }
  if (isProduction) {
    console.log('Frontend SPA servido desde el mismo puerto.');
  }
});
