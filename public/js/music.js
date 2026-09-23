// Фоновая музыка лобби
import { state } from './state.js';

let audio = null;
let started = false;
let targetVolume = 0.25;

function ensureAudio() {
  if (audio) return audio;
  audio = new Audio('/sounds/lobby.mp3');
  audio.loop = true;
  audio.volume = 0;
  audio.preload = 'auto';
  audio.addEventListener('error', () => {}, { once: true });
  return audio;
}

function isMuted() {
  try {
    if (state.musicOn === false) return true;
    const raw = localStorage.getItem('document_prefs');
    if (raw) {
      const p = JSON.parse(raw);
      if (p.musicOn === false) return true;
    }
  } catch {}
  return false;
}

// Плавное появление/затухание
function fadeTo(target, ms = 800) {
  if (!audio) return;
  const start = audio.volume;
  const diff = target - start;
  const t0 = performance.now();
  function step(now) {
    const k = Math.min(1, (now - t0) / ms);
    audio.volume = Math.max(0, Math.min(1, start + diff * k));
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function startLobbyMusic() {
  if (isMuted()) return;
  const a = ensureAudio();
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
  started = true;
  fadeTo(targetVolume, 900);
}

export function stopLobbyMusic() {
  if (!audio) return;
  fadeTo(0, 600);
  setTimeout(() => {
    if (audio) {
      try { audio.pause(); } catch {}
    }
  }, 650);
  started = false;
}

export function toggleMusic() {
  state.musicOn = !(state.musicOn !== false);
  try {
    const prefs = JSON.parse(localStorage.getItem('document_prefs') || '{}');
    prefs.musicOn = state.musicOn;
    localStorage.setItem('document_prefs', JSON.stringify(prefs));
  } catch {}
  if (state.musicOn) startLobbyMusic();
  else stopLobbyMusic();
  return state.musicOn;
}

export function isMusicOn() {
  return state.musicOn !== false;
}

// Автозапуск после первого тапа (браузерное требование)
['touchstart','click','keydown'].forEach(evt => {
  document.addEventListener(evt, function onFirst() {
    if (state.musicOn !== false && !started && shouldPlayOnScreen()) {
      startLobbyMusic();
    }
  }, { once: false, passive: true });
});

function shouldPlayOnScreen() {
  const scr = document.getElementById('app')?.dataset.screen;
  return scr === 'welcome' || scr === 'create' || scr === 'join';
}