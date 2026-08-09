function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function plainToHtml(value) {
  return String(value || '')
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
}

function requireTexto(texto) {
  const raw = String(texto || '').trim();
  if (!raw) {
    const err = new Error('Texto requerido');
    err.status = 400;
    throw err;
  }
  return raw;
}

function parseJsonFromAi(content) {
  const trimmed = String(content || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch {
    const err = new Error('La IA no devolvió un formato válido');
    err.status = 502;
    throw err;
  }
}

const ORGANIZAR_PROMPTS = {
  desarrollo_acta: (modo) =>
    `Organiza actas de reunión en español (Colombia). Corrige ortografía y estructura motivo y desarrollo.
No inventes información.
${modo === 'html' ? 'Responde solo con HTML simple usando etiquetas <p>.' : 'Responde solo con texto plano.'}`,
  compromiso: () =>
    `Redacta compromisos de actas en español (Colombia): claros, concisos y accionables. No inventes datos. Solo texto plano.`,
  bitacora_observacion: () =>
    `Organiza observaciones de bitácora de soporte en español (Colombia). Corrige ortografía, tono profesional. No inventes datos. Solo texto plano.`,
  bitacora_respuesta: () =>
    `Organiza la respuesta de cierre de soporte en bitácora en español (Colombia). Corrige ortografía, mejora claridad y tono profesional técnico. Conserva el sentido del texto original. No uses formato de correo (sin saludos, despedidas, asunto ni firma). No inventes datos. Solo texto plano.`,
  cronograma_descripcion: () =>
    `Organiza descripciones de cronograma de capacitaciones en español (Colombia). Clara y profesional. Solo texto plano.`,
  cronograma_observacion: () =>
    `Organiza observaciones de ítems de cronograma en español (Colombia). Breve y precisa. Solo texto plano.`,
  actproy_actividades: (modo) =>
    `Organiza informe de actividades realizadas de soporte en español (Colombia). Viñetas o párrafos claros. No inventes datos.
${modo === 'html' ? 'Responde solo con HTML simple (<p>, <ul>, <li>).' : 'Responde solo con texto plano.'}`,
  actproy_pendientes: (modo) =>
    `Organiza actividades pendientes de soporte en español (Colombia). Conciso y accionable. No inventes datos.
${modo === 'html' ? 'Responde solo con HTML simple (<p>, <ul>, <li>).' : 'Responde solo con texto plano.'}`,
  control_versiones_descripcion: () =>
    `Mejora descripción de cambio de software en español (Colombia). Clara para registro de versiones. Solo texto plano.`,
  control_versiones_cambios: () =>
    `Resume cambios implementados en software en español (Colombia). Conciso, orientado a changelog. Solo texto plano.`,
  changelog: () =>
    `Genera entradas de changelog profesionales en español (Colombia) a partir de la información dada. Formato markdown con viñetas.`,
  correo_cuerpo: () =>
    `Redacta cuerpo de correo profesional en español (Colombia). Cordial y claro. Solo texto plano, sin asunto.`,
  notificacion_cuerpo: () =>
    `Mejora mensaje de notificación por correo en español (Colombia). Respeta marcadores como {{nombre}} si existen. Solo texto plano.`,
  vip_plantilla: () =>
    `Mejora redacción de plantilla HTML de cuenta de cobro en español (Colombia). Conserva etiquetas HTML y variables {{...}} existentes. Devuelve solo HTML.`,
  requerimiento: () =>
    `Organiza requerimiento de software en español (Colombia). Claro y estructurado. Solo texto plano.`,
  generico: (modo) =>
    `Organiza y corrige el texto en español (Colombia). No inventes información.
${modo === 'html' ? 'Responde solo con HTML simple usando <p>.' : 'Responde solo con texto plano.'}`,
};

export function isAiOrganizarConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function chatCompletion(system, user, { json = false, temperature = 0.2 } = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('IA no configurada. Agregue OPENAI_API_KEY en el backend.');
    err.status = 503;
    throw err;
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const body = {
    model,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (json) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const payload = await response.json();
      detail = payload?.error?.message || '';
    } catch {
      /* ignore */
    }
    const err = new Error(detail || 'No se pudo contactar el servicio de IA');
    err.status = response.status === 401 ? 503 : 502;
    throw err;
  }

  const data = await response.json();
  const content = String(data.choices?.[0]?.message?.content || '').trim();
  if (!content) {
    const err = new Error('La IA no devolvió texto');
    err.status = 502;
    throw err;
  }
  return content;
}

export async function organizarTexto(texto, { modo = 'plain', contexto = 'desarrollo_acta' } = {}) {
  const raw = requireTexto(texto);
  const input = modo === 'html' ? stripHtml(raw) : raw;
  if (!input) {
    const err = new Error('Texto requerido');
    err.status = 400;
    throw err;
  }

  const promptFn = ORGANIZAR_PROMPTS[contexto] || ORGANIZAR_PROMPTS.generico;
  let result = await chatCompletion(promptFn(modo), input);

  if (modo === 'html' && !/<p[\s>]/i.test(result)) {
    result = plainToHtml(result);
  }

  return result;
}

export async function procesarAi(accion, payload = {}) {
  const { texto, modo = 'plain', contexto = 'generico', asunto = '' } = payload;
  const raw = requireTexto(texto);
  const input = modo === 'html' ? stripHtml(raw) : raw;
  if (!input) {
    const err = new Error('Texto requerido');
    err.status = 400;
    throw err;
  }

  switch (accion) {
    case 'organizar':
      return { texto: await organizarTexto(texto, { modo, contexto }) };

    case 'resumen_ejecutivo': {
      const resumen = await chatCompletion(
        'Genera un resumen ejecutivo breve (máximo 120 palabras) de una reunión en español (Colombia). Solo el resumen, sin título.',
        input,
      );
      return { texto: resumen };
    }

    case 'minuta_estructurada': {
      const content = await chatCompletion(
        `Estructura una minuta de reunión en español (Colombia) a partir del texto. Devuelve JSON con claves:
{"html":"<p>...</p> secciones: Asistentes, Temas tratados, Acuerdos, Compromisos, Observaciones"}
Usa HTML simple (<p>, <strong>, <ul>, <li>). No inventes datos ausentes; omite secciones vacías.`,
        input,
        { json: true },
      );
      const parsed = parseJsonFromAi(content);
      const html = String(parsed.html || '').trim();
      if (!html) {
        const err = new Error('La IA no generó minuta');
        err.status = 502;
        throw err;
      }
      return { texto: html, html };
    }

    case 'extraer_compromisos': {
      const content = await chatCompletion(
        `Extrae compromisos explícitos o implícitos del texto de reunión en español (Colombia).
Devuelve JSON: {"compromisos":[{"compromiso":"texto","responsable":"nombre o vacío","fecha_entrega":"YYYY-MM-DD o vacío"}]}
No inventes compromisos. Máximo 10.`,
        input,
        { json: true },
      );
      const parsed = parseJsonFromAi(content);
      const compromisos = Array.isArray(parsed.compromisos) ? parsed.compromisos : [];
      return {
        compromisos: compromisos
          .map((c) => ({
            compromiso: String(c?.compromiso || '').trim(),
            responsable: String(c?.responsable || '').trim(),
            fecha_entrega: String(c?.fecha_entrega || '').trim(),
          }))
          .filter((c) => c.compromiso),
      };
    }

    case 'redactar_correo': {
      const hint = asunto ? `Asunto sugerido: ${asunto}\n` : '';
      const content = await chatCompletion(
        `Redacta un correo profesional en español (Colombia) a partir de las notas del usuario.
Devuelve JSON: {"asunto":"...","cuerpo":"..."}. El cuerpo en texto plano con párrafos separados por líneas en blanco.`,
        `${hint}${input}`,
        { json: true },
      );
      const parsed = parseJsonFromAi(content);
      return {
        asunto: String(parsed.asunto || asunto || '').trim(),
        cuerpo: String(parsed.cuerpo || '').trim(),
        texto: String(parsed.cuerpo || '').trim(),
      };
    }

    case 'mejorar_changelog': {
      const changelog = await chatCompletion(
        'Mejora y estructura un changelog de software en español (Colombia). Formato markdown con viñetas por cambio. No inventes ítems.',
        input,
      );
      return { texto: changelog };
    }

    default: {
      const err = new Error(`Acción IA no soportada: ${accion}`);
      err.status = 400;
      throw err;
    }
  }
}
