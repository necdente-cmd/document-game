import { state, loadMe, applyTheme, applyScale, loadOpts, saveMe, loadPrefs } from './state.js';
import { bindSocket, socket } from './socket.js';
import { renderWelcome } from './screens/welcome.js';
import { renderCreate } from './screens/create.js';
import { renderJoin } from './screens/join.js';
import { renderTable } from './screens/table.js';

const app = document.getElementById('app');
let currentScreen = 'welcome';
let navigating = false;

function renderScreen(screen) {
  app.dataset.screen = screen;
  if (screen === 'welcome') return renderWelcome(app, navigate);
  if (screen === 'create')  return renderCreate(app, navigate);
  if (screen === 'join')    return renderJoin(app, navigate);
  if (screen === 'table')   return renderTable(app, navigate);
  renderWelcome(app, navigate);
}

function navigate(screen) {
  // Если это ре-рендер того же стола — без fade
  if (currentScreen === screen && screen === 'table') {
    return renderTable(app, navigate);
  }

  if (navigating) return;
  navigating = true;

  app.classList.add('fade-out');

  setTimeout(() => {
    currentScreen = screen;
    renderScreen(screen);

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

if (state.me?.roomId) {
  socket.emit('joinRoom', { roomId: state.me.roomId, name: state.me.name, playerId: state.me.id }, r => {
    if (!r.ok) { saveMe(null); navigate('welcome'); }
    else state.me.id = r.playerId;
  });
} else {
  navigate('welcome');
}