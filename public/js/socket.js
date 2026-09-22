import { state, saveMe, applyTheme, applyScale } from './state.js';

// Подключение к серверу
export const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 60000,
});

// Обработчики событий от сервера
export function bindSocket(onStateChange) {
  socket.on('state', (s) => {
    // Проверяем — начался ли новый кон
    const startedNewRound = s.phase === 'playing' && state.lastPhaseForDeal !== 'playing';
    state.lastPhaseForDeal = s.phase;
    state.server = s;

    // Применяем тему и масштаб от сервера
    if (s.opts) {
      applyTheme(s.opts.theme);
      if (s.opts.scale) applyScale(s.opts.scale);
    }

    // Анимация раздачи
    if (startedNewRound) {
      state.dealKey = Date.now();
      onStateChange();
      setTimeout(() => {
        state.dealKey = 0;
        onStateChange();
      }, 1600);
    } else {
      onStateChange();
    }
  });

  socket.on('reaction', ({ seat, emoji }) => {
    window.dispatchEvent(new CustomEvent('reaction', { detail: { seat, emoji } }));
  });

  socket.on('falsh', ({ byName, targetName, card }) => {
    window.dispatchEvent(new CustomEvent('falsh', { detail: { byName, targetName, card } }));
  });

  socket.on('err', (m) => {
    const el = document.getElementById('err');
    if (el) el.textContent = m;
  });

  socket.on('connect', () => {
    console.log('[socket] connected');
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected');
  });

  // Автопереподключение при возврате во вкладку
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && socket.disconnected) {
      socket.connect();
    }
  });
}

// Хелпер: join с playerId для переподключения
export function reconnectIfNeeded() {
  if (state.me?.roomId) {
    socket.emit('joinRoom', {
      roomId: state.me.roomId,
      name: state.me.name,
      playerId: state.me.id,
    }, (r) => {
      if (!r.ok) {
        saveMe(null);
      } else {
        state.me.id = r.playerId;
      }
    });
  }
}