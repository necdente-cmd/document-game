import { state, saveMe, applyTheme, applyScale, playSound, vibrate } from './state.js';

export const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 60000,
});

export function bindSocket(onStateChange) {
  socket.on('state', (s) => {
    const prev = state.server;

    // ============ ЗВУКИ / ВИБРАЦИЯ ============

    // Раздача — новый кон
    const startedNewRound = s.phase === 'playing' && state.lastPhaseForDeal !== 'playing';
    if (startedNewRound) {
      state.lastFieldCards = [];   // очистить снапшот поля
      playSound('deal');
    }

    // Мой ход начался
    if (prev && prev.turnSeat !== s.mySeat && s.turnSeat === s.mySeat && s.phase === 'playing') {
      vibrate(80);
      playSound('move');
    }

    // Началась атака на меня (я стал защитником)
    if (prev && s.field && s.field.defender === s.mySeat
        && (!prev.field || prev.field.defender !== s.mySeat)) {
      vibrate([50, 40, 50]);
    }

    // Моя карта ушла из руки (я что-то сыграл)
    if (prev && s.myHand.length < prev.myHand.length) {
      playSound('card');
    }

    // Новая карта на поле появилась (кто-то сходил)
    if (prev) {
      const prevIds = prev.field ? prev.field.cards.map(e => e.card.id) : [];
      const newIds = s.field ? s.field.cards.map(e => e.card.id) : [];
      const someoneNew = newIds.some(id => !prevIds.includes(id));
      if (someoneNew) {
        // своя карта — 'card' уже сыграл выше; чужая — 'beat'
        if (s.myHand.length === (prev.myHand.length || 0)) playSound('beat');
      }
    }

    // Конец кона
    if (prev && prev.phase === 'playing' && (s.phase === 'roundEnd' || s.phase === 'gameEnd')) {
      const lastRound = (s.roundHistory || [])[s.roundHistory.length - 1];
      if (lastRound && lastRound.winner === s.myTeam) {
        playSound('win');
        vibrate([100, 50, 100, 50, 200]);
      } else if (lastRound) {
        playSound('lose');
        vibrate([100, 100, 100]);
      }
    }

    // Чемпион
    if (prev && prev.phase !== 'gameEnd' && s.phase === 'gameEnd') {
      setTimeout(() => playSound('champ'), 400);
    }

    // ============ ОБНОВЛЕНИЕ STATE ============
    state.lastPhaseForDeal = s.phase;
    state.server = s;
    if (s.opts) {
      applyTheme(s.opts.theme);
      if (s.opts.scale) applyScale(s.opts.scale);
    }

    if (startedNewRound) {
      state.dealKey = Date.now();
      onStateChange();
      setTimeout(() => { state.dealKey = 0; onStateChange(); }, 1600);
    } else {
      onStateChange();
    }
  });

  socket.on('reaction', ({ seat, emoji }) => {
    vibrate(30);
    playSound('reaction');
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
      avatar: state.me.avatar,
      playerId: state.me.id,
    }, (r) => {
      if (!r.ok) saveMe(null);
      else state.me.id = r.playerId;
    });
  }
}