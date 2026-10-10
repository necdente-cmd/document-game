import { state, loadMe, applyTheme, applyScale, loadOpts, saveMe, loadPrefs } from './state.js';
import { bindSocket, socket } from './socket.js';
import { renderWelcome } from './screens/welcome.js';
import { renderCreate } from './screens/create.js';
import { renderJoin } from './screens/join.js';
import { renderTable } from './screens/table.js';
import { startLobbyMusic, stopLobbyMusic } from './music.js';
import { showTutorial, shouldShowTutorial } from './ui/tutorial.js';
import { initI18n } from './i18n.js';

const app = document.getElementById('app');
let currentScreen = 'welcome';
let navigating = false;

initI18n();

function renderScreen(screen) {
  app.dataset.screen = screen;
  if (screen === 'welcome') return renderWelcome(app, navigate);
  if (screen === 'create')  return renderCreate(app, navigate);
  if (screen === 'join')    return renderJoin(app, navigate);
  if (screen === 'table')   return renderTable(app, navigate);
  renderWelcome(app, navigate);
}

function navigate(screen) {
  if (currentScreen === screen && screen === 'table') {
    return renderTable(app, navigate);
  }
  if (navigating) return;
  navigating = true;

  app.classList.add('fade-out');

  setTimeout(() => {
    currentScreen = screen;
    renderScreen(screen);

    if (screen === 'welcome' || screen === 'create' || screen === 'join') {
      startLobbyMusic();
    } else {
      stopLobbyMusic();
    }

    app.classList.remove('fade-out');
    app.classList.add('fade-in');
    requestAnimationFrame(() => app.classList.remove('fade-in'));

    navigating = false;
  }, 150);
}

loadMe();
loadPrefs();
const opts = loadOpts();
applyTheme(opts.theme);
applyScale(opts.scale);

bindSocket(() => {
  if (state.server && state.me?.roomId) {
    if (currentScreen === 'welcome' || currentScreen === 'create' || currentScreen === 'join') {
      navigate('table');
    } else {
      renderTable(app, navigate);
    }
  } else {
    if (!app.dataset.screen) navigate('welcome');
    else if (currentScreen !== 'table') navigate(currentScreen);
  }
});

window.addEventListener('falsh', e => {
  const { byName, targetName, card } = e.detail;
  const el = document.createElement('div');
  el.className = 'falsh-banner';
  el.innerHTML = `🃏 Ты фальшивка!<div style="font-size:14px;font-weight:500;margin-top:6px;opacity:.9">${byName} → ${targetName} · ${card.r}${card.s}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
});

window.addEventListener('lang-change-requested', () => {
  renderScreen(currentScreen);
});

// ====================================================================
// 🎬 SPLASH v5 — лого → название → 4 масти → свечение (4.2 сек)
// ====================================================================
const SPLASH_DURATION = 4200;

// Web Audio
let _audioCtx = null;
function getAudioCtx() {
  if (_audioCtx) return _audioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _audioCtx = new AC();
    return _audioCtx;
  } catch { return null; }
}

// Мягкий "тинг" при появлении лого
function playTing() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
  } catch {}
}

// Клик при падении масти
function playClick(freq = 900) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.13, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {}
}

// Финальный "воosh"
function playWhoosh() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.75);
  } catch {}
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

function hideSplash() {
  const sp = document.getElementById('splash');
  if (!sp || sp.__hidden) return;
  sp.__hidden = true;
  sp.classList.add('hide');
  setTimeout(() => { try { sp.remove(); } catch {} }, 700);
}

function initSplash() {
  const sp = document.getElementById('splash');
  if (!sp) return;

  const shownSplash = sessionStorage.getItem('splashShown');
  if (shownSplash) { hideSplash(); return; }
  sessionStorage.setItem('splashShown', '1');

  // Тап-пропуск
  const onTap = () => hideSplash();
  sp.addEventListener('click', onTap, { once: true });
  sp.addEventListener('touchstart', onTap, { once: true, passive: true });

  // 0.0с — появление логотипа
  setTimeout(() => {
    playTing();
    vibrate(20);
  }, 100);

  // 1.0-2.0с — падают 4 масти
  [0, 1, 2, 3].forEach(i => {
    const t = 1000 + i * 150 + 500; // падение = старт + 500мс длительность
    setTimeout(() => {
      playClick(720 + i * 80);
      vibrate(12);
    }, t);
  });

  // 2.6с — свечение + whoosh
  setTimeout(() => {
    playWhoosh();
    vibrate([40, 30, 100]);
    const flash = document.getElementById('splashFlash');
    if (flash) flash.classList.add('show');
    if (sp) sp.classList.add('glow');
  }, 2600);

  // 4.2с — скрытие
  setTimeout(hideSplash, SPLASH_DURATION);
}

initSplash();

// === TUTORIAL ===
function maybeShowTutorialFirstTime() {
  if (!shouldShowTutorial()) return;
  const shownSplash = sessionStorage.getItem('splashShown');
  const delay = shownSplash ? 300 : (SPLASH_DURATION + 200);
  setTimeout(() => {
    showTutorial();
  }, delay);
}

if (state.me?.roomId) {
  socket.emit('joinRoom', { roomId: state.me.roomId, name: state.me.name, playerId: state.me.id }, r => {
    if (!r.ok) { saveMe(null); navigate('welcome'); }
    else state.me.id = r.playerId;
  });
} else {
  navigate('welcome');
  maybeShowTutorialFirstTime();
}