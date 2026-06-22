// Equipo de trabajo (liderproyecto) y contacto cliente (noticliente) — JSON [{ nombre, cargo, email }]

function normalizeContact(c, index = 0) {
  if (!c || typeof c !== 'object') return null;
  const email = String(c.email || '').trim();
  const nombre = String(c.nombre || '').trim();
  const cargo = String(c.cargo || '').trim();
  if (!email && !nombre) return null;
  return {
    id: c.id || `c${index}`,
    nombre,
    cargo,
    email,
  };
}

function parseContactArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(normalizeContact).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(normalizeContact).filter(Boolean);
    if (parsed && typeof parsed === 'object') return legacyObjectToArray(parsed);
  } catch {
    return [];
  }
  return [];
}

function legacyObjectToArray(data) {
  if (Array.isArray(data.emails) && data.emails.length) {
    const nombre = String(data.nombre || '').trim();
    const cargo = String(data.cargo || 'Líder del proyecto').trim();
    return data.emails
      .map((email, i) => normalizeContact({ nombre, cargo, email }, i))
      .filter(Boolean);
  }
  return [normalizeContact(data)].filter(Boolean);
}

export function parseEquipoTrabajo(raw, cliente = {}) {
  const list = parseContactArray(raw);
  if (list.length) return list;
  const legacyEmail = String(cliente.email || '').trim();
  if (legacyEmail) {
    return [
      normalizeContact({
        nombre: cliente.nombrecliente || '',
        cargo: 'Líder del proyecto',
        email: legacyEmail,
      }),
    ].filter(Boolean);
  }
  return [];
}

export function parseNoticliente(raw) {
  return parseContactArray(raw).filter((c) => !c.principal);
}

export function serializeContactArray(contacts) {
  const cleaned = (contacts || [])
    .map((c, i) => normalizeContact(c, i))
    .filter(Boolean)
    .map((c, i) => ({
      id: c.id || `c${i}`,
      nombre: c.nombre,
      cargo: c.cargo,
      email: c.email,
    }));
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

/** Contactos para envío de bitácora / acta (solo noticliente). */
export function listDestinatariosNotificacion(cliente, selectedEmails = null) {
  const all = parseNoticliente(cliente?.noticliente).filter((c) => c.email);
  return filterSelectedEmails(all, selectedEmails);
}

/** Equipo de trabajo + contacto cliente (acta cerrada). */
export function listDestinatariosCierreCapacitacion(cliente, selectedEmails = null) {
  const equipo = parseEquipoTrabajo(cliente?.liderproyecto, cliente).filter((c) => c.email);
  const contactos = parseNoticliente(cliente?.noticliente).filter((c) => c.email);
  const seen = new Set();
  const all = [];
  for (const c of [...equipo, ...contactos]) {
    const key = c.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(c);
  }
  return filterSelectedEmails(all, selectedEmails);
}

function filterSelectedEmails(all, selectedEmails) {
  if (selectedEmails === 'all' || selectedEmails === null) return all;
  if (!Array.isArray(selectedEmails) || !selectedEmails.length) return [];
  const set = new Set(selectedEmails.map((e) => String(e).trim().toLowerCase()));
  return all.filter((c) => set.has(c.email.toLowerCase()));
}

export function applyClienteNotificaciones(body) {
  const next = { ...body };

  if (next.liderproyecto !== undefined) {
    const equipo = parseEquipoTrabajo(next.liderproyecto, next);
    next.liderproyecto = serializeContactArray(equipo);
    next.email = equipo.find((c) => c.email)?.email || null;
  }

  if (next.noticliente !== undefined) {
    const contactos = parseNoticliente(next.noticliente);
    next.noticliente = serializeContactArray(contactos);
  }

  return next;
}

// Compatibilidad con ruta de destinatarios
export function parseLiderProyecto(raw, cliente = {}) {
  return parseEquipoTrabajo(raw, cliente);
}
