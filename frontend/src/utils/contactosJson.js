export function parseContactosJson(raw, legacyEmail = '', legacyNombre = '') {
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeContact).filter(Boolean);
      }
      if (parsed && typeof parsed === 'object') {
        return legacyObjectToContacts(parsed, legacyNombre);
      }
    } catch {
      /* ignore */
    }
  }

  const mail = String(legacyEmail || '').trim();
  if (mail) {
    return [
      normalizeContact({
        nombre: legacyNombre || '',
        cargo: 'Líder del proyecto',
        email: mail,
      }),
    ].filter(Boolean);
  }

  return [];
}

function legacyObjectToContacts(data, legacyNombre = '') {
  if (Array.isArray(data.emails) && data.emails.length) {
    const nombre = data.nombre || legacyNombre || '';
    const cargo = data.cargo || 'Líder del proyecto';
    return data.emails
      .map((email) => normalizeContact({ nombre, cargo, email }))
      .filter(Boolean);
  }
  return [normalizeContact({ ...data, nombre: data.nombre || legacyNombre })].filter(Boolean);
}

function normalizeContact(c, index = 0) {
  if (!c || typeof c !== 'object') return null;
  const email = String(c.email || '').trim();
  const nombre = String(c.nombre || '').trim();
  const cargo = String(c.cargo || '').trim();
  if (!email && !nombre) return null;
  return {
    id: c.id || `c-${index}-${email || nombre}`,
    nombre,
    cargo,
    email,
  };
}

export function buildContactosJson(contacts) {
  const cleaned = (contacts || [])
    .map((c, i) => normalizeContact(c, i))
    .filter(Boolean)
    .map((c, i) => ({
      id: c.id || `c${i}`,
      nombre: c.nombre,
      cargo: c.cargo,
      email: c.email,
    }));
  return {
    json: cleaned.length ? JSON.stringify(cleaned) : '',
    firstEmail: cleaned.find((c) => c.email)?.email || '',
  };
}
