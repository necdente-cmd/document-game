// 🎵 Звуковая система игры (WebAudio + HTMLAudio fallback)
import { state } from './state.js';

const FILES = {
  'play-card':  '/sounds/play-card.mp3',
  'take-cards': '/sounds/take-cards.mp3',
  'your-turn':  '/sounds/your-turn.mp3',
  'win':        '/sounds/win.mp3',
  'lose':       '/sounds/lose.mp3',
  'reaction':   '/sounds/reaction.mp3',
  'chat':       '/sounds/chat.mp3',
  'button':     '/sounds/button.mp3',
  'falsh':      '/sounds/falsh.mp3',
  'defend':     '/sounds/defend.mp3',
};

const DEFAULT_VOLUME = 0.7;

// ==================== WEB AUDIO ====================
let audioCtx = null;
let masterGain = null;
const buffers = new Map();       // name → AudioBuffer
const loadPromises = new Map();  // name → Promise
let webAudioBroken = false;      // если decode не сработал — уходим в fallback

function getCtx() {
  if (webAudioBroken) return null;
  if (audioCtx) return audioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { webAudioBroken = true; return null; }
    audioCtx = new AC();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = DEFAULT_VOLUME;
    masterGain.connect(audioCtx.destination);
  } catch (e) {
    console.warn('[sound] WebAudio init failed', e);
    webAudioBroken = true;
    return null;
  }
  return audioCtx;
}

// 🔓 Разблокировка AudioContext (вызывать на любом user gesture)
function resumeCtx() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Загрузка + декодирование одного файла
function loadBuffer(name) {
  if (buffers.has(name)) return Promise.resolve(buffers.get(name));
  if (loadPromises.has(name)) return loadPromises.get(name);
  const src = FILES[name];
  if (!src) return Promise.resolve(null);

  const p = fetch(src)
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    })
    .then(arr => {
      const ctx = getCtx();
      if (!ctx) throw new Error('no ctx');
      return new Promise((resolve, reject) => {
        ctx.decodeAudioData(
          arr,
          buf => resolve(buf),
          err => reject(err)
        );
      });
    })
    .then(buf => {
      buffers.set(name, buf);
      loadPromises.delete(name);
      return buf;
    })
    .catch(err => {
      console.warn('[sound] decode failed for', name, err.message || err);
      loadPromises.delete(name);
      return null;
    });

  loadPromises.set(name, p);
  return p;
}

// Проигрывание через WebAudio (создаём новый BufferSource — дешёвый)
function playViaWebAudio(name, volume) {
  const ctx = getCtx();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const buf = buffers.get(name);
  if (!buf) {
    // Нет в кеше — грузим и играем после загрузки
    loadBuffer(name).then(b => {
      if (b) playViaWebAudio(name, volume);
    });
    return true; // считаем, что запустили (fallback не нужен)
  }

  try {
    const source = ctx.createBufferSource();
    source.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume != null ? volume : DEFAULT_VOLUME));
    source.connect(gain);
    gain.connect(masterGain);
    source.start(0);
    return true;
  } catch (e) {
    console.warn('[sound] playViaWebAudio failed', e);
    return false;
  }
}

// ==================== HTML AUDIO FALLBACK ====================
// Для каждого звука — небольшой пул, чтобы подряд идущие звуки не рвали друг друга
const htmlPool = new Map(); // name → { items: [Audio], idx: 0 }

function getHtmlAudio(name) {
  const src = FILES[name];
  if (!src) return null;
  let pool = htmlPool.get(name);
  if (!pool) {
    pool = {
      items: [new Audio(src), new Audio(src)],
      idx: 0,
    };
    pool.items.forEach(a => {
      a.preload = 'auto';
      a.volume = DEFAULT_VOLUME;
      a.addEventListener('error', () => {}, { once: true });
    });
    htmlPool.set(name, pool);
  }
  const a = pool.items[pool.idx];
  pool.idx = (pool.idx + 1) % pool.items.length;
  return a;
}

function playViaHtmlAudio(name, volume) {
  const a = getHtmlAudio(name);
  if (!a) return;
  a.volume = Math.max(0, Math.min(1, volume != null ? volume : DEFAULT_VOLUME));
  try {
    a.currentTime = 0;
  } catch {}
  const p = a.play();
  if (p && p.catch) {
    p.catch(err => {
      // Автоплей заблокирован — запомним, попробуем на следующем клике
      if (err && err.name === 'NotAllowedError') {
        pendingResume = true;
      }
    });
  }
}

// ==================== ВЫБОР МЕХАНИЗМА ====================
function isMuted() {
  try {
    if (state.prefs && state.prefs.sound === false) return true;
    if (state.opts  && state.opts.sound  === false) return true;
    const raw = localStorage.getItem('document_prefs');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.sound === false) return true;
    }
  } catch {}
  return false;
}

let pendingResume = false;

// ==================== ПУБЛИЧНЫЙ API ====================

export function playSound(name, opts = {}) {
  if (isMuted()) return;
  if (!FILES[name]) return;

  const volume = opts.volume != null ? opts.volume : DEFAULT_VOLUME;

  // 1. Пытаемся через WebAudio
  if (!webAudioBroken) {
    const ok = playViaWebAudio(name, volume);
    if (ok) return;
  }

  // 2. Fallback — HTMLAudio
  playViaHtmlAudio(name, volume);
}

export function preloadSounds() {
  // WebAudio — параллельно декодируем всё
  if (!webAudioBroken) {
    Object.keys(FILES).forEach(name => loadBuffer(name));
  }
  // HTMLAudio — создаём пул, чтобы не было задержки при первом play
  Object.keys(FILES).forEach(name => getHtmlAudio(name));
}

export function isSoundEnabled() {
  return !isMuted();
}

// ==================== АВТОРАЗБЛОКИРОВКА ====================
// На любое user gesture — resume + preload
['touchstart', 'click', 'keydown', 'pointerdown'].forEach(evt => {
  document.addEventListener(evt, () => {
    resumeCtx();
    preloadSounds();
    if (pendingResume) {
      pendingResume = false;
      // Ничего не делаем — следующий playSound сам сработает
    }
  }, { once: true, passive: true });
});

// Возврат из фона — резюмируем
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resumeCtx();
  }
});

window.addEventListener('focus', () => {
  resumeCtx();
});

// iOS: страница после pageshow иногда отдаёт suspended контекст
window.addEventListener('pageshow', () => {
  resumeCtx();
});