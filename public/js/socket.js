import { t, translateServerMsg } from './i18n.js';
import { state, saveMe, applyTheme, applyScale, beep, vibrate } from './state.js';
import { playSound } from './sound.js';
import { toastErr, toastOk } from './ui/toast.js';
import { bindVoiceSocket } from './voice.js';
import { t } from './i18n.js';

export const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
});

// ==================== 🔄 ЖЁСТКИЙ РЕКОННЕКТ ====================
let reconnecting = false;

export function forceRefresh() {
  if (reconnecting) return;
  reconnecting = true;
  console.log('[refresh] 🔄 hard reconnect');

  try { socket.disconnect(); } catch (e) {}

  setTimeout(() => {
    socket.connect();

    const onConnect = () => {
      console.log('[refresh] ✅ reconnected, rejoining room...');
      socket.off('connect', onConnect);

      if (state.me?.roomId) {
        socket.emit('joinRoom', {
          roomId: state.me.roomId,
          name: state.me.name,
          playerId: state.me.id,
          avatar: state.me.avatar,
        }, (r) => {
          reconnecting = false;
          if (r && r.ok) {
            state.me.id = r.playerId;
            console.log('[refresh] ✅ rejoined, id:', r.playerId);
            setTimeout(() => socket.emit('syncState'), 200);
            toastOk(t('toast.synced'));
          } else {
            console.warn('[refresh] ❌ rejoin failed:', r?.err);
            saveMe(null);
            state.server = null;
            state.me = null;
            location.href = '/';
          }
        });
      } else {
        reconnecting = false;
      }
    };

    socket.on('connect', onConnect);

    setTimeout(() => {
      if (reconnecting) {
        console.warn('[refresh] ⏱ timeout, forcing again');
        reconnecting = false;
        forceRefresh();
      }
    }, 5000);
  }, 200);
}

// ==================== BIND ====================
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
    toastErr(translateServerMsg(m));
    vibrate(100);
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
  });

  socket.on('connect', () => console.log('[socket] ✅ connected'));
  socket.on('disconnect', (reason) => console.log('[socket] ❌ disconnected:', reason));
  socket.on('reconnect', (attempt) => console.log('[socket] 🔄 reconnected after', attempt));

  // ==================== 🔄 ВОЗВРАТ ИЗ ФОНА ====================
  let hiddenSince = 0;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenSince = Date.now();
      return;
    }
    const hiddenMs = hiddenSince ? Date.now() - hiddenSince : 0;
    hiddenSince = 0;
    console.log('[visibility] visible, was hidden', hiddenMs, 'ms');

    if (!state.me?.roomId) return;
    if (hiddenMs > 1000 || !socket.connected) {
      forceRefresh();
    }
  });

  window.addEventListener('focus', () => {
    if (!state.me?.roomId) return;
    if (!socket.connected) forceRefresh();
  });

  // 📱 Capacitor App State
  function setupCapacitorAppState() {
    const Cap = window.Capacitor;
    if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return false;
    const App = Cap.Plugins && Cap.Plugins.App;
    if (!App || !App.addListener) return false;
    try {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && state.me?.roomId) forceRefresh();
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  if (!setupCapacitorAppState()) {
    setTimeout(() => setupCapacitorAppState(), 1500);
  }

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