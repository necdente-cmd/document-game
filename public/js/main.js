import { state, loadMe, applyTheme, applyScale } from './state.js';
import { bindSocket, socket, reconnectIfNeeded } from './socket.js';
import { renderWelcome } from './screens/welcome.js';

const app = document.getElementById('app');

// Простой роутер экранов
function navigate(screen) {
  if (screen === 'welcome') return renderWelcome(app, navigate);
  if (screen === 'join')    return renderJoin(app, navigate);
  if (screen === 'table')   return renderTablePlaceholder(app, navigate);
  // По умолчанию — приветствие
  renderWelcome(app, navigate);
}

// Временные заглушки для экранов, которые создадим позже
function renderJoin(app, navigate) {
  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh;">
      <h2 style="text-align:center;">Войти по коду</h2>
      <p style="text-align:center; opacity:.7;">Скоро здесь будет вход. Пока нажмите Назад.</p>
      <button id="backBtn">← Назад</button>
      <div class="err" id="err"></div>
    </div>`;
  document.getElementById('backBtn').onclick = () => navigate('welcome');
}

function renderTablePlaceholder(app, navigate) {
  const code = state.me?.roomId || '?';
  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh;">
      <h2 style="text-align:center;">Код комнаты</h2>
      <div style="text-align:center; font-size:42px; font-weight:900; letter-spacing:8px; color:var(--acc); margin:20px 0; font-family:'Courier New',monospace;">${code}</div>
      <p style="text-align:center; opacity:.7;">Ждём других игроков. Скоро здесь будет стол.</p>
      <div class="err" id="err"></div>
    </div>`;
}

// Инициализация
loadMe();
const opts = JSON.parse(localStorage.getItem('opts') || '{}');
applyTheme(opts.theme);
applyScale(opts.scale);

// Подписываемся на состояние — при обновлении просто перерисовываем текущий экран
bindSocket(() => {
  if (state.me?.roomId && state.server) {
    // Если мы в комнате — переходим на стол
    if (!app.dataset.screen || app.dataset.screen === 'welcome' || app.dataset.screen === 'join') {
      app.dataset.screen = 'table';
    }
    navigate(app.dataset.screen);
  } else {
    if (!app.dataset.screen) {
      app.dataset.screen = 'welcome';
    }
    navigate(app.dataset.screen);
  }
});

// Если есть сохранённая комната — пробуем переподключиться
if (state.me?.roomId) {
  reconnectIfNeeded();
} else {
  app.dataset.screen = 'welcome';
  navigate('welcome');
}