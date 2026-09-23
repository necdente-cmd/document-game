// Звуковая система игры
import { state } from './state.js';

const FILES = {
  'play-card':  '/sounds/play-card.mp3',
  'take-cards': '/sounds/take-cards.mp3',
  'your-turn':  '/sounds/your-turn.mp3',
  'win':        '/sounds/win.mp3',
  'lose':       '/sounds/lose.mp3',
  'reaction':   '/sounds/reaction.mp3',
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

export function playSound(name) {
  if (isMuted()) return;
  const src = FILES[name];
  if (!src) return;
  let a = cache[name];
  if (!a) {
    a = new Audio(src);
    a.preload = 'auto';
    a.volume = 0.7;
    cache[name] = a;
  }
  try {
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch {}
}

export function preloadSounds() {
  if (preloaded) return;
  preloaded = true;
  Object.entries(FILES).forEach(([k, src]) => {
    if (!cache[k]) {
      const a = new Audio(src);
      a.preload = 'auto';
      a.volume = 0.7;
      cache[k] = a;
    }
  });
}

['touchstart','click','keydown'].forEach(evt => {
  document.addEventListener(evt, preloadSounds, { once: true, passive: true });
});

export function isSoundEnabled() {
  return !isMuted();
}