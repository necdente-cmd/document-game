import { state, loadMe, applyTheme, applyScale, loadOpts, saveMe } from './state.js';
import { bindSocket, socket } from './socket.js';
import { renderWelcome } from './screens/welcome.js';
import { renderCreate } from './screens/create.js';
import { renderJoin } from './screens/join.js';
import { renderTable } from './screens/table.js';

const app = document.getElementById('app');

let currentScreen = 'welcome';

function navigate(screen) {
  currentScreen = screen;
  app.dataset.screen = screen;
  if (screen === 'welcome') return renderWelcome(app, navigate);
  if (screen === 'create')  return renderCreate(app, navigate);
  if (screen === 'join')    return renderJoin(app, navigate);
  if (screen === 'table')   return renderTable(app, navigate);
  renderWelcome(app, navigate);
}

// Инициализация
loadMe();
const opts = loadOpts();
applyTheme(opts.theme);
applyScale(opts.scale);

// Подписка на state
bindSocket(() => {
  // Если мы в комнате и фаза не лобби-первый вход — идём на стол
  if (state.server && state.me?.roomId) {
    if (currentScreen === 'welcome' || currentScreen === 'create' || currentScreen === 'join') {
      navigate('table');
    } else {
      renderTable(app, navigate);
    }
  } else {
    if (!app.dataset.screen) navigate('welcome');
    else navigate(currentScreen);
  }
});

// Реакции
window.addEventListener('reaction', e => {
  const { seat, emoji } = e.detail;
  const table = document.getElementById('table');
  if (!table || !state.server) return;
  const posMap = {
    bottom: 'bottom:190px; left:50%; transform:translateX(-50%)',
    top:    'top:80px; left:50%; transform:translateX(-50%)',
    left:   'top:40%; left:100px',
    right:  'top:40%; right:100px',
  };
  const mySeat = state.server.mySeat;
  const posKey = ['bottom','right','top','left'][((seat - mySeat + 4) % 4)] || 'top';
  const pos = posMap[posKey] || posMap.top;
  const el = document.createElement('div');
  el.className = 'reaction';
  el.textContent = emoji;
  el.style.cssText = pos + ';position:absolute';
  table.appendChild(el);
  setTimeout(() => el.remove(), 2000);
});

window.addEventListener('falsh', e => {
  const { byName, targetName, card } = e.detail;
  const el = document.createElement('div');
  el.className = 'falsh-banner';
  el.innerHTML = `🃏 Ты фальшивка!<div style="font-size:14px;font-weight:500;margin-top:6px;opacity:.9">${byName} → ${targetName} · ${card.r}${card.s}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
});

// Старт
if (state.me?.roomId) {
  socket.emit('joinRoom', { roomId: state.me.roomId, name: state.me.name, playerId: state.me.id }, r => {
    if (!r.ok) { saveMe(null); navigate('welcome'); }
    else state.me.id = r.playerId;
  });
} else {
  navigate('welcome');
}

// Обновляем приветствие при отсутствии серверного стейта
socket.on('err', (m) => {
  console.log('[server error]', m);
});