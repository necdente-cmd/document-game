// Звуковая система игры
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

const cache = {};
let preloaded = false;

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

// Проиграть звук (безопасно — если файла нет, тихо ничего не делает)
export function playSound(name, opts = {}) {
  if (isMuted()) return;
  const src = FILES[name];
  if (!src) return;
  let a = cache[name];
  if (!a) {
    a = new Audio(src);
    a.preload = 'auto';
    a.volume = opts.volume != null ? opts.volume : 0.7;
    // Защита от 404 — не спамить в консоль
    a.addEventListener('error', () => {}, { once: true });
    cache[name] = a;
  } else if (opts.volume != null) {
    a.volume = opts.volume;
  }
  try {
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch {}
}

// Прогрев всех звуков (после первого клика/тапа)
export function preloadSounds() {
  if (preloaded) return;
  preloaded = true;
  Object.entries(FILES).forEach(([k, src]) => {
    if (!cache[k]) {
      const a = new Audio(src);
      a.preload = 'auto';
      a.volume = 0.7;
      a.addEventListener('error', () => {}, { once: true });
      cache[k] = a;
    }
  });
}

// Автопрогрев после первого взаимодействия
['touchstart','click','keydown'].forEach(evt => {
  document.addEventListener(evt, preloadSounds, { once: true, passive: true });
});

export function isSoundEnabled() {
  return !isMuted();
}