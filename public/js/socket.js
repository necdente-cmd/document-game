import { state, saveMe, applyTheme, applyScale, beep, vibrate } from './state.js';
import { playSound } from './sound.js';
import { toastErr } from './ui/toast.js';

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
    const startedNewRound = s.phase === 'playing' && state.lastPhaseForDeal !== 'playing';
    state.lastPhaseForDeal = s.phase;

    // === Мой ход ===
    const wasMyTurn = prev && prev.turnSeat === prev.mySeat;
    const nowMyTurn = s.turnSeat === s.mySeat;
    if (nowMyTurn && !wasMyTurn) {
      vibrate(80);
      playSound('your-turn');
    }

    // === Звуки и анимации игрового поля ===
    if (prev && prev.phase === 'playing' && s.phase === 'playing') {
      const prevCards  = prev.field?.cards?.length || 0;
      const nowCards   = s.field?.cards?.length || 0;
      const prevBeaten = prev.field?.cards?.filter(x => x.beatenBy).length || 0;
      const nowBeaten  = s.field?.cards?.filter(x => x.beatenBy).length || 0;

      if (nowCards > prevCards) playSound('play-card');
      if (nowBeaten > prevBeaten) playSound('defend');

      // Поле полностью очистилось — БИТО или ПОДНЯТЬ
      if (prevCards > 0 && nowCards === 0) {
        playSound('take-cards');
        const wasDefender = prev.field.defender;
        const isBito = s.turnSeat === wasDefender;  // после бито ход у защитника
        state.pendingFieldFly = {
          type: isBito ? 'bito' : 'pickup',
          defenderSeat: wasDefender,
        };
      }
    }

    // === Победа / поражение ===
    if (prev && prev.roundWins && s.roundWins) {
      const myTeam  = s.myTeam;
      const oppTeam = 1 - myTeam;
      if ((s.roundWins[myTeam]  || 0) > (prev.roundWins[myTeam]  || 0)) playSound('win');
      if ((s.roundWins[oppTeam] || 0) > (prev.roundWins[oppTeam] || 0)) playSound('lose');
    }

    state.server = s;
    if (s.opts) {
      applyTheme(s.opts.theme);
      if (s.opts.scale) applyScale(s.opts.scale);
    }

    if (startedNewRound) {
      state.dealKey = Date.now();
      beep();
      onStateChange();
      setTimeout(() => { state.dealKey = 0; onStateChange(); }, 1800);
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
    playSound('button');
    window.dispatchEvent(new CustomEvent('falsh', { detail: { byName, targetName, card } }));
  });

  socket.on('chat', ({ seat, name, text, time }) => {
    if (name && name !== state.me?.name) playSound('chat');
    window.dispatchEvent(new CustomEvent('chat', { detail: { seat, name, text, time } }));
  });

  socket.on('err', (m) => {
    toastErr(m);
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