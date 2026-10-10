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

// 🌐 Инициализация языка ДО всего остального
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

// 🌐 Смена языка — перерисовка текущего экрана
window.addEventListener('lang-change-requested', () => {
  renderScreen(currentScreen);
});

// ====================================================================
// 🎬 SPLASH v3 — падающие карты, сбор в колоду, звуки, вибрация
// ====================================================================
const SPLASH_DURATION = 3400; // полная длина интро, мс

// Web Audio API — синтез звуков (не нужны mp3)
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

// Короткий «клик» при падении карты
function playClick(freq = 800) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

// Низкий «бом» в финале
function playBoom() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);

    // Шумовой акцент
    const bufSize = ctx.sampleRate * 0.12;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
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

function initSplash() {
  const sp = document.getElementById('splash');
  if (!sp) return;

  // Один раз за сессию — иначе мгновенно скрываем
  const shownSplash = sessionStorage.getItem('splashShown');
  if (shownSplash) {
    hideSplash();
    return;
  }
  sessionStorage.setItem('splashShown', '1');

  // Тап-пропуск
  const onTap = () => {
    hideSplash();
  };
  sp.addEventListener('click', onTap, { once: true });
  sp.addEventListener('touchstart', onTap, { once: true, passive: true });

  // Клики + вибрация на приземление каждой карты
  const ranksEl = document.getElementById('splashRanks');
  const cards = ranksEl ? ranksEl.querySelectorAll('.sr') : [];

  cards.forEach((card, i) => {
    const landDelay = i * 90 + 500;
    setTimeout(() => {
      playClick(700 + i * 40);
      vibrate(15);
    }, landDelay);
  });

  // Финальный «бом» + вспышка колоды
  setTimeout(() => {
    playBoom();
    vibrate([30, 40, 80]);
    if (ranksEl) ranksEl.classList.add('blast');
  }, 2250);

  // Авто-скрытие
  setTimeout(hideSplash, SPLASH_DURATION);
}

// Запускаем splash
initSplash();

// === TUTORIAL (при первом заходе) ===
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