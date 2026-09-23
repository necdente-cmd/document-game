import { state, saveMe, applyTheme, applyScale, beep, vibrate } from './state.js';

export const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 60000,
});

export function bindSocket(onStateChange) {
  socket.on('state', (s) => {
    const startedNewRound = s.phase === 'playing' && state.lastPhaseForDeal !== 'playing';
    state.lastPhaseForDeal = s.phase;

    const wasMyTurn = state.server && state.server.turnSeat === state.server.mySeat;
    const nowMyTurn = s.turnSeat === s.mySeat;
    if (nowMyTurn && !wasMyTurn) vibrate(80);

    state.server = s;
    if (s.opts) {
      applyTheme(s.opts.theme);
      if (s.opts.scale) applyScale(s.opts.scale);
    }

    if (startedNewRound) {
      state.dealKey = Date.now();
      beep();
      onStateChange();
      setTimeout(() => { state.dealKey = 0; onStateChange(); }, 1600);
    } else {
      onStateChange();
    }
  });

  socket.on('reaction', ({ seat, emoji }) => {
    vibrate(30);
    window.dispatchEvent(new CustomEvent('reaction', { detail: { seat, emoji } }));
  });

  socket.on('falsh', ({ byName, targetName, card }) => {
    vibrate([50, 30, 50]);
    window.dispatchEvent(new CustomEvent('falsh', { detail: { byName, targetName, card } }));
  });

  socket.on('chat', ({ seat, name, text, time }) => {
    window.dispatchEvent(new CustomEvent('chat', { detail: { seat, name, text, time } }));
  });

  socket.on('err', (m) => {
    const el = document.getElementById('err');
    if (el) el.textContent = m;
    vibrate(100);
  });

  socket.on('connect', () => console.log('[socket] connected'));
  socket.on('disconnect', () => console.log('[socket] disconnected'));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && socket.disconnected) socket.connect();
  });
}

export function reconnectIfNeeded() {
  if (state.me?.roomId) {
    socket.emit('joinRoom', {
      roomId: state.me.roomId,
      name: state.me.name,
      playerId: state.me.id,
      avatar: state.me.avatar,
    }, (r) => {
      if (!r.ok) saveMe(null);
      else state.me.id = r.playerId;
    });
  }
}