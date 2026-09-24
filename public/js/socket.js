import { state, saveMe, applyTheme, applyScale, beep, vibrate } from './state.js';
import { playSound } from './sound.js';
import { toastErr } from './ui/toast.js';
import { bindVoiceSocket } from './voice.js';

export const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 60000,
});

// ==================== 🔄 FORCE REFRESH ====================
let hiddenAt = 0;

export function forceRefresh() {
  console.log('[refresh] forcing refresh, connected:', socket.connected);
  if (socket.disconnected) {
    socket.connect();
    socket.once('connect', () => {
      if (state.me?.roomId) socket.emit('syncState');
      setTimeout(() => {
        if (socket.connected && state.me?.roomId) socket.emit('syncState');
      }, 400);
    });
  } else {
    if (state.me?.roomId) socket.emit('syncState');
  }
}

export function bindSocket(onStateChange) {
  socket.on('state', (s) => {
    const prev = state.server;
    const startedNewRound = s.phase === 'playing' && state.lastPhaseForDeal !== 'playing';
    state.lastPhaseForDeal = s.phase;

    const wasMyTurn = prev && prev.turnSeat === prev.mySeat;
    const nowMyTurn = s.turnSeat === s.mySeat;
    if (nowMyTurn && !wasMyTurn) {
      vibrate(80);
      playSound('your-turn');
    }

    if (prev && prev.phase === 'playing' && s.phase === 'playing') {
      const prevCards  = prev.field?.cards?.length || 0;
      const nowCards   = s.field?.cards?.length || 0;
      const prevBeaten = prev.field?.cards?.filter(x => x.beatenBy).length || 0;
      const nowBeaten  = s.field?.cards?.filter(x => x.beatenBy).length || 0;

      if (nowCards > prevCards) playSound('play-card');
      if (nowBeaten > prevBeaten) playSound('defend');

      if (prevCards > 0 && nowCards === 0) {
        playSound('take-cards');
        const wasDefender = prev.field.defender;
        const isBito = s.turnSeat === wasDefender;
        state.pendingFieldFly = {
          type: isBito ? 'bito' : 'pickup',
          defenderSeat: wasDefender,
        };
      }
    }

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
    // 💥 Встряска экрана
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
  });

  socket.on('connect', () => {
    console.log('[socket] connected');
    if (state.me?.roomId) socket.emit('syncState');
  });
  socket.on('disconnect', () => console.log('[socket] disconnected'));

  // ==================== 🔄 СИНХРОНИЗАЦИЯ ПРИ ВОЗВРАТЕ ====================
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    // Вернулись в приложение
    const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    console.log('[visibility] returned after', hiddenMs, 'ms');

    if (socket.disconnected) {
      forceRefresh();
    } else if (hiddenMs > 3000) {
      // Были в фоне > 3 сек — полный refresh
      forceRefresh();
    } else if (state.me?.roomId) {
      // Коротко уходили — просто запрос свежего state
      socket.emit('syncState');
    }
  });

  window.addEventListener('focus', () => {
    if (socket.disconnected) {
      forceRefresh();
    } else if (state.me?.roomId) {
      socket.emit('syncState');
    }
  });

  // 🎤 голосовой чат
  bindVoiceSocket();
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