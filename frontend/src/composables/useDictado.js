import { ref, onUnmounted, watch } from 'vue';

let activeStop = null;

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Agrega texto dictado a un campo de texto plano. */
export function appendDictadoPlain(current, addition) {
  const add = String(addition || '').trim();
  if (!add) return current || '';
  const cur = String(current || '').trim();
  if (!cur) return add;
  return `${cur} ${add}`;
}

/** Agrega texto dictado al contenido HTML del q-editor. */
export function appendDictadoHtml(current, addition) {
  const add = escapeHtml(String(addition || '').trim());
  if (!add) return current || '';
  const cur = String(current || '').trim();
  const emptyHtml = !cur || cur === '<br>' || /^<div><br><\/div>$/i.test(cur);
  if (emptyHtml) return `<p>${add}</p>`;
  if (/<\/p>\s*$/i.test(cur)) {
    return cur.replace(/<\/p>\s*$/i, ` ${add}</p>`);
  }
  return `${cur}<p>${add}</p>`;
}

/**
 * Dictado por voz con Web Speech API (es-CO).
 * Solo un reconocimiento activo a la vez en toda la app.
 */
export function useDictado({ onResult, lang = 'es-CO', active = ref(true) } = {}) {
  const supported = ref(Boolean(getSpeechRecognitionCtor()));
  const listening = ref(false);
  const error = ref('');

  let recognition = null;
  let stoppedByUser = false;
  let restartOnEnd = false;

  function releaseActive() {
    if (activeStop === stop) {
      activeStop = null;
    }
  }

  function stop() {
    stoppedByUser = true;
    restartOnEnd = false;
    releaseActive();
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognition = null;
    }
    listening.value = false;
  }

  function bindRecognition(rec) {
    rec.onresult = (event) => {
      if (!onResult) return;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = String(result[0]?.transcript || '').trim();
        if (!transcript) continue;
        onResult(transcript, { isFinal: result.isFinal });
      }
    };

    rec.onerror = (evt) => {
      const code = evt.error || '';
      if (code === 'not-allowed') {
        error.value = 'Permiso de micrófono denegado';
      } else if (code !== 'aborted' && code !== 'no-speech') {
        error.value = 'Error de dictado';
      }
      stop();
    };

    rec.onend = () => {
      if (restartOnEnd && !stoppedByUser && listening.value) {
        try {
          rec.start();
        } catch {
          listening.value = false;
          releaseActive();
        }
        return;
      }
      listening.value = false;
      releaseActive();
    };
  }

  function start() {
    if (!supported.value || !active.value) return;
    if (activeStop && activeStop !== stop) {
      activeStop();
    }
    activeStop = stop;
    stoppedByUser = false;
    restartOnEnd = true;
    error.value = '';

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    bindRecognition(recognition);

    try {
      recognition.start();
      listening.value = true;
    } catch {
      error.value = 'No se pudo iniciar el dictado';
      listening.value = false;
      releaseActive();
    }
  }

  function toggle() {
    if (listening.value) stop();
    else start();
  }

  if (active && typeof active.value !== 'undefined') {
    watch(active, (val) => {
      if (!val) stop();
    });
  }

  onUnmounted(() => {
    stop();
  });

  return {
    supported,
    listening,
    error,
    start,
    stop,
    toggle,
  };
}
