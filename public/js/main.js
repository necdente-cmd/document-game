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
// 🎬 SPLASH v4 — 4 масти из углов → центр → БУМ → логотип (5 секунд)
// ====================================================================
const SPLASH_DURATION = 5000;

// === Web Audio API ===
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

// Rising whoosh при полёте
function playWhoosh() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.3);
  } catch {}
}

// Низкий boom
function playBoom() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.55);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);

    // Шумовой акцент
    const bufSize = Math.floor(ctx.sampleRate * 0.15);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();
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

// Взрыв — искры + вспышка
function spawnSparks() {
  const boom = document.getElementById('splashBoom');
  if (!boom) return;

  const flash = boom.querySelector('.splash-flash');
  if (flash) flash.classList.add('show');

  const N = 28;
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 140 + Math.random() * 140;
    const sx = Math.cos(angle) * dist;
    const sy = Math.sin(angle) * dist;
    const spark = document.createElement('div');
    spark.className = 'splash-spark';
    spark.style.setProperty('--sx', `${sx.toFixed(0)}px`);
    spark.style.setProperty('--sy', `${sy.toFixed(0)}px`);
    spark.style.setProperty('--d', `${(Math.random() * 120).toFixed(0)}ms`);
    if (Math.random() > 0.55) spark.style.background = '#ffffff';
    if (Math.random() > 0.8) spark.style.width = '4px';
    if (Math.random() > 0.8) spark.style.height = '4px';
    boom.appendChild(spark);
  }

  setTimeout(() => {
    boom.querySelectorAll('.splash-spark').forEach(s => s.remove());
  }, 1800);
}

function initSplash() {
  const sp = document.getElementById('splash');
  if (!sp) return;

  // Один раз за сессию
  const shownSplash = sessionStorage.getItem('splashShown');
  if (shownSplash) { hideSplash(); return; }
  sessionStorage.setItem('splashShown', '1');

  // Тап-пропуск
  const onTap = () => hideSplash();
  sp.addEventListener('click', onTap, { once: true });
  sp.addEventListener('touchstart', onTap, { once: true, passive: true });

  // 0.5с — whoosh + лёгкая вибрация (начало полёта)
  setTimeout(() => {
    playWhoosh();
    vibrate(25);
  }, 500);

  // 1.8с — БУМ
  setTimeout(() => {
    playBoom();
    vibrate([60, 40, 130]);
    spawnSparks();
  }, 1800);

  // 5с — скрытие
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