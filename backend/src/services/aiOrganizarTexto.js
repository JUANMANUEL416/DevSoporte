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

const SYSTEM_PROMPTS = {
  desarrollo_acta: (modo) =>
    `Eres un asistente que organiza textos de actas de reunión en español (Colombia).
Corrige ortografía y puntuación, estructura el contenido en párrafos claros (motivo y desarrollo).
No inventes información ni agregues datos que no estén en el texto original.
${modo === 'html' ? 'Responde únicamente con HTML simple usando etiquetas <p>.' : 'Responde únicamente con texto plano.'}`,
  compromiso: () =>
    `Eres un asistente que redacta compromisos de actas de reunión en español (Colombia).
Corrige ortografía, haz el texto claro, conciso y accionable.
No inventes información. Mantén una sola frase o enunciado breve cuando sea posible.
Responde únicamente con texto plano, sin comillas ni explicaciones.`,
};

export function isAiOrganizarConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function organizarTexto(texto, { modo = 'plain', contexto = 'desarrollo_acta' } = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('Organización con IA no configurada. Agregue OPENAI_API_KEY en el backend.');
    err.status = 503;
    throw err;
  }

  const raw = String(texto || '').trim();
  if (!raw) {
    const err = new Error('Texto requerido');
    err.status = 400;
    throw err;
  }

  const input = modo === 'html' ? stripHtml(raw) : raw;
  if (!input) {
    const err = new Error('Texto requerido');
    err.status = 400;
    throw err;
  }

  const promptFn = SYSTEM_PROMPTS[contexto] || SYSTEM_PROMPTS.desarrollo_acta;
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: promptFn(modo) },
        { role: 'user', content: input },
      ],
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.error?.message || '';
    } catch {
      /* ignore */
    }
    const err = new Error(detail || 'No se pudo contactar el servicio de IA');
    err.status = response.status === 401 ? 503 : 502;
    throw err;
  }

  const data = await response.json();
  let result = String(data.choices?.[0]?.message?.content || '').trim();
  if (!result) {
    const err = new Error('La IA no devolvió texto');
    err.status = 502;
    throw err;
  }

  if (modo === 'html' && !/<p[\s>]/i.test(result)) {
    result = plainToHtml(result);
  }

  return result;
}
