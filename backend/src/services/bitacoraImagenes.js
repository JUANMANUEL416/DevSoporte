const MAX_IMAGENES = 5;
const MAX_BYTES = 1024 * 1024;

export function parseImagenesSoporte(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function dataUrlToBuffer(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/i);
  if (!m) return null;
  return { tipo: m[1], buffer: Buffer.from(m[2], 'base64') };
}

export function normalizeImagenesSoporte(raw) {
  const list = parseImagenesSoporte(raw);
  if (!list.length) return null;

  if (list.length > MAX_IMAGENES) {
    const err = new Error(`Máximo ${MAX_IMAGENES} imágenes de soporte`);
    err.status = 400;
    throw err;
  }

  const normalized = [];
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i] || {};
    const decoded = dataUrlToBuffer(item.data);
    if (!decoded || !/^image\/(jpe?g|png|webp)$/i.test(decoded.tipo)) {
      const err = new Error(`Imagen ${i + 1}: formato no válido (use JPG, PNG o WebP)`);
      err.status = 400;
      throw err;
    }
    if (decoded.buffer.length > MAX_BYTES) {
      const err = new Error(`Imagen ${i + 1}: supera 1 MB`);
      err.status = 400;
      throw err;
    }
    const nombre = String(item.nombre || `soporte-${i + 1}.png`).slice(0, 120);
    normalized.push({
      nombre,
      tipo: decoded.tipo,
      data: `data:${decoded.tipo};base64,${decoded.buffer.toString('base64')}`,
    });
  }

  return JSON.stringify(normalized);
}

export function buildImagenesEmailPayload(raw) {
  const list = parseImagenesSoporte(raw);
  if (!list.length) return { attachments: [], gallery: [] };

  const attachments = [];
  const gallery = [];

  list.forEach((item, index) => {
    const decoded = dataUrlToBuffer(item.data);
    if (!decoded) return;
    const cid = `soporte-img-${index + 1}`;
    const filename = String(item.nombre || `soporte-${index + 1}.png`).slice(0, 120);
    attachments.push({
      filename,
      content: decoded.buffer,
      contentType: decoded.tipo,
      cid,
    });
    gallery.push({ cid, alt: filename });
  });

  return { attachments, gallery };
}
