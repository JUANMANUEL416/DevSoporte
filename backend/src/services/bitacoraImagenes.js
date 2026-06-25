const MAX_IMAGENES = 5;
const MAX_BYTES = 1024 * 1024;
const THUMB_MAX_WIDTH = 220;
const THUMB_MAX_HEIGHT = 165;

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

async function createEmailThumbnail(buffer) {
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buffer)
      .rotate()
      .resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return buffer;
  }
}

export async function buildImagenesEmailPayload(raw) {
  const list = parseImagenesSoporte(raw);
  if (!list.length) return { attachments: [], gallery: [] };

  const attachments = [];
  const gallery = [];

  for (let index = 0; index < list.length; index += 1) {
    const item = list[index];
    const decoded = dataUrlToBuffer(item.data);
    if (!decoded) continue;

    const cid = `soporte-thumb-${index + 1}`;
    const filename = String(item.nombre || `soporte-${index + 1}.png`).slice(0, 120);
    const thumbBuffer = await createEmailThumbnail(decoded.buffer);

    attachments.push({
      filename: `miniatura-${filename.replace(/\.[^.]+$/, '')}.jpg`,
      content: thumbBuffer,
      contentType: 'image/jpeg',
      cid,
      contentDisposition: 'inline',
    });
    attachments.push({
      filename,
      content: decoded.buffer,
      contentType: decoded.tipo,
      contentDisposition: 'attachment',
    });
    gallery.push({ cid, alt: filename, filename });
  }

  return { attachments, gallery };
}
