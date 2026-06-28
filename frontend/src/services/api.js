import { api } from 'src/boot/axios';

export function extractApiError(err, fallback = 'Error en la solicitud') {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 404) {
    return 'La API no tiene la ruta de notificación de cronograma. Use el backend de pruebas (npm run dev:pruebas) o despliegue la versión actualizada en producción.';
  }
  if (!err?.response) {
    return err?.message || 'No se pudo conectar con la API. Verifique que el backend de pruebas esté activo en el puerto 3301.';
  }
  if (typeof data === 'string' && data.trim()) {
    return data.trim().slice(0, 240);
  }
  if (data && typeof data === 'object') {
    return data.error || data.details?.[0]?.message || data.message || fallback;
  }
  return fallback;
}

// Servicio genérico de acceso a la API REST. Cada "recurso" corresponde a una
// entidad del backend (que a su vez proviene de una tabla del diccionario Clarion).
export function useResource(resource) {
  return {
    list: (params = {}) => api.get(`/${resource}`, { params }).then((r) => r.data),
    get: (id) => api.get(`/${resource}/${encodeURIComponent(id)}`).then((r) => r.data),
    create: (payload) => api.post(`/${resource}`, payload).then((r) => r.data),
    update: (id, payload) => api.put(`/${resource}/${encodeURIComponent(id)}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/${resource}/${encodeURIComponent(id)}`).then((r) => r.data),
  };
}

export const authApi = {
  login: (usuario, clave) => api.post('/auth/login', { usuario, clave }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  solicitarRecuperarClave: (usuario) =>
    api.post('/auth/recuperar-clave', { usuario }).then((r) => r.data),
  validarRecuperarClave: (token) =>
    api.get(`/auth/recuperar-clave/${encodeURIComponent(token)}`).then((r) => r.data),
  restablecerClave: (token, clave, clave2) =>
    api.post(`/auth/recuperar-clave/${encodeURIComponent(token)}`, { clave, clave2 }).then((r) => r.data),
};

export const appApi = {
  health: () => api.get('/health').then((r) => r.data),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
};

export const clientesApi = {
  destinatarios: (codigo, params = {}) =>
    api.get(`/clientes/${encodeURIComponent(codigo)}/destinatarios-notificacion`, { params }).then((r) => r.data),
  copiarEquipoTrabajo: (codigo, origen) =>
    api
      .post(`/clientes/${encodeURIComponent(codigo)}/copiar-equipo-trabajo`, { origen })
      .then((r) => r.data),
};

export const capacitacionesApi = {
  estadoOpciones: (id) =>
    api.get(`/capacitaciones/${encodeURIComponent(id)}/estado-opciones`).then((r) => r.data),
  cambiarEstado: (id, estado) =>
    api.post(`/capacitaciones/${encodeURIComponent(id)}/cambiar-estado`, { estado }).then((r) => r.data),
};

export const bitacoraApi = {
  cerrarInfo: (id) => api.get(`/bitacora/${encodeURIComponent(id)}/cerrar-info`).then((r) => r.data),
  cerrar: (id, payload) => api.post(`/bitacora/${encodeURIComponent(id)}/cerrar`, payload).then((r) => r.data),
  clientesEstado: (cnsbite) =>
    api.get(`/bitacora/semana/${encodeURIComponent(cnsbite)}/clientes-estado`).then((r) => r.data),
  semanaClienteEstadoOpciones: (cnsbite, cliente) =>
    api
      .get(`/bitacora/semana/${encodeURIComponent(cnsbite)}/cliente/${encodeURIComponent(cliente)}/estado-opciones`)
      .then((r) => r.data),
  cerrarSemanaCliente: (cnsbite, cliente) =>
    api
      .post(`/bitacora/semana/${encodeURIComponent(cnsbite)}/cliente/${encodeURIComponent(cliente)}/cerrar`)
      .then((r) => r.data),
  previewReporteSemana: (cnsbite, cliente) =>
    api
      .get(`/bitacora/semana/${encodeURIComponent(cnsbite)}/cliente/${encodeURIComponent(cliente)}/preview-reporte`)
      .then((r) => r.data),
  enviarReporteSemana: (cnsbite, cliente, payload) =>
    api
      .post(`/bitacora/semana/${encodeURIComponent(cnsbite)}/cliente/${encodeURIComponent(cliente)}/enviar-reporte`, payload)
      .then((r) => r.data),
  semanaPdf: (cnsbite, cliente) =>
    api.get(`/bitacora/semana-pdf/${encodeURIComponent(cnsbite)}/${encodeURIComponent(cliente)}`, {
      responseType: 'blob',
    }),
};

export const actproyApi = {
  pdf: (id) =>
    api.get(`/actividades_proyecto/${encodeURIComponent(id)}/pdf`, { responseType: 'blob' }),
  firmaEstado: (id) =>
    api.get(`/actividades_proyecto/${encodeURIComponent(id)}/firma-estado`).then((r) => r.data),
  enviarFirma: (id, payload = {}) =>
    api.post(`/actividades_proyecto/${encodeURIComponent(id)}/enviar-firma`, payload).then((r) => r.data),
  previewInforme: (id) =>
    api.get(`/actividades_proyecto/${encodeURIComponent(id)}/preview-informe`).then((r) => r.data),
  enviarInforme: (id, payload = {}) =>
    api.post(`/actividades_proyecto/${encodeURIComponent(id)}/enviar-informe`, payload).then((r) => r.data),
};

export const correosApi = {
  list: (params = {}) => api.get('/correos', { params }).then((r) => r.data),
  get: (id) => api.get(`/correos/${encodeURIComponent(id)}`).then((r) => r.data),
  getPlantilla: () => api.get('/correos/plantilla').then((r) => r.data),
  savePlantilla: (payload) => api.put('/correos/plantilla', payload).then((r) => r.data),
  enviar: (formData) =>
    api
      .post('/correos/enviar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
};

export const cronogramaApi = {
  pdf: (id, tipo = 'programacion') =>
    api.get(`/cronograma/${encodeURIComponent(id)}/pdf`, {
      params: { tipo },
      responseType: 'blob',
    }),
  agregarTema: (id, payload) =>
    api.post(`/cronograma/${encodeURIComponent(id)}/agregar-tema`, payload).then((r) => r.data),
  duplicar: (id, payload = {}) =>
    api.post(`/cronograma/${encodeURIComponent(id)}/duplicar`, payload).then((r) => r.data),
  cambiarEstadoItem: (id, item, payload) =>
    api
      .post(`/cronograma/${encodeURIComponent(id)}/items/${encodeURIComponent(item)}/cambiar-estado`, payload)
      .then((r) => r.data),
  cambiarEstadoTema: (id, payload) =>
    api.post(`/cronograma/${encodeURIComponent(id)}/tema/cambiar-estado`, payload).then((r) => r.data),
  cronogramasActa: (cliente) =>
    api.get(`/cronograma/cliente/${encodeURIComponent(cliente)}/cronogramas-acta`).then((r) => r.data),
  temasActa: (id) =>
    api.get(`/cronograma/${encodeURIComponent(id)}/temas-acta`).then((r) => r.data),
  prefillActa: (id, temaCodigo) =>
    api.get(`/cronograma/${encodeURIComponent(id)}/tema/${encodeURIComponent(temaCodigo)}/prefill-acta`).then((r) => r.data),
};

export const notificacionApi = {
  previewCapacitacion: (id) =>
    api.get(`/capacitaciones/${encodeURIComponent(id)}/preview-notificacion`).then((r) => r.data),
  previewBitacora: (id) =>
    api.get(`/bitacora/${encodeURIComponent(id)}/preview-notificacion`).then((r) => r.data),
  previewCronograma: (id, tipo = 'programacion') =>
    api
      .get(`/cronograma/${encodeURIComponent(id)}/preview-notificacion`, { params: { tipo } })
      .then((r) => r.data),
  capacitacion: (id, payload) =>
    api.post(`/capacitaciones/${encodeURIComponent(id)}/enviar-notificacion`, payload).then((r) => r.data),
  bitacora: (id, payload) =>
    api.post(`/bitacora/${encodeURIComponent(id)}/enviar-notificacion`, payload).then((r) => r.data),
  cronograma: (id, payload) =>
    api.post(`/cronograma/${encodeURIComponent(id)}/enviar-notificacion`, payload).then((r) => r.data),
};

export const controlVersionesApi = {
  resumen: () => api.get('/control-versiones/resumen').then((r) => r.data),
  integrar: (consecutivo, payload = {}) =>
    api.post(`/control-versiones/${encodeURIComponent(consecutivo)}/integrar`, payload).then((r) => r.data),
  publicar: (payload) => api.post('/control-versiones/publicar', payload).then((r) => r.data),
};
