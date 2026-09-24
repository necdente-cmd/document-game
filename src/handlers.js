import { uid } from './utils.js';
import { rooms, newRoom, log, clearDisconnectTimer, pub } from './rooms.js';
import { startRound } from './game/round.js';
import { registerGameHandlers } from './game/actions.js';
import { DISCONNECT_TIMEOUT_MS } from './constants.js';
import { getIceServers } from './turn.js';

export function setupHandlers(io, broadcast) {
  io.on('connection', (socket) => {
    let pid = null;
    let rid = null;

    const getMe = () => {
      const r = rooms.get(rid);
      return r && r.players.find(p => p.id === pid);
    };
    const err = (m) => socket.emit('err', m);

    const ctx = { rooms, broadcast, err, getMe, getRid: () => rid };

    // ==================== 🔐 TURN credentials ====================
    socket.on('get-ice-servers', () => {
      try {
        const servers = getIceServers();
        socket.emit('ice-servers', servers);
      } catch (e) {
        console.error('[turn] getIceServers error:', e);
      }
    });

    // СОЗДАНИЕ КОМНАТЫ
    socket.on('createRoom', ({ name, opts }, cb) => {
      const r = newRoom(opts);
      pid = uid();
      rid = r.id;
      r.hostId = pid;
      r.players.push({
        id: pid, name: name || 'Игрок', seat: 0, team: 0,
        hand: [], connected: true, out: false,
        avatar: (opts && opts.avatar) || '',
        voiceEnabled: false,
      });
      socket.join(pid);
      socket.join(r.id);
      cb({ ok: true, roomId: r.id, playerId: pid });
      broadcast(r);
    });

    // ВХОД / ПЕРЕПОДКЛЮЧЕНИЕ
    socket.on('joinRoom', ({ roomId, name, playerId, avatar }, cb) => {
      const r = rooms.get((roomId || '').toUpperCase());
      if (!r) return cb({ ok: false, err: 'Комната не найдена' });

      if (playerId) {
        const existing = r.players.find(p => p.id === playerId);
        if (existing) {
          clearDisconnectTimer(r, playerId);
          pid = playerId;
          rid = r.id;
          existing.connected = true;
          if (name) existing.name = name;
          if (avatar) existing.avatar = avatar;
          if (existing.voiceEnabled === undefined) existing.voiceEnabled = false;
          socket.join(pid);
          socket.join(r.id);
          log(r, `${existing.name} вернулся`);
          cb({ ok: true, roomId: r.id, playerId: pid, reconnected: true });
          broadcast(r);
          return;
        }
      }

      if (r.players.length >= r.opts.maxPlayers) return cb({ ok: false, err: 'Комната заполнена' });
      if (r.phase !== 'lobby') return cb({ ok: false, err: 'Игра уже началась' });

      pid = uid();
      rid = r.id;
      const seat = r.players.length;
      r.players.push({
        id: pid, name: name || `Игрок ${seat + 1}`, seat,
        team: seat % 2, hand: [], connected: true, out: false,
        avatar: avatar || '',
        voiceEnabled: false,
      });
      socket.join(pid);
      socket.join(r.id);
      cb({ ok: true, roomId: r.id, playerId: pid });
      broadcast(r);
    });

    // 🎯 СИНХРОНИЗАЦИЯ ПРИ ВОЗВРАТЕ ИЗ ФОНА
    socket.on('syncState', () => {
      const r = rooms.get(rid); if (!r) return;
      const p = getMe(); if (!p) return;
      socket.emit('state', pub(r, p.id));
    });

    // СТАРТ ИГРЫ
    socket.on('startGame', () => {
      const r = rooms.get(rid); if (!r) return;
      if (r.hostId !== pid) return err('Только хост');
      if (r.players.length !== r.opts.maxPlayers) return err(`Нужно ${r.opts.maxPlayers} игроков`);
      r.teamStep = [0, 0];
      r.roundWins = [0, 0];
      r.roundHistory = [];
      r.playerStats = [0, 0, 0, 0];
      r.gameStartTime = Date.now();
      r.winnerTeam = null;
      startRound(r, 0);
      broadcast(r);
    });

    // ВЫБОР СТАРТА КОНА
    socket.on('chooseStart', ({ seat }) => {
      const r = rooms.get(rid); if (!r || !r.pendingStart) return;
      const p = getMe(); if (!p) return;
      if (p.team !== r.pendingStart.winningTeam) return err('Не ваша команда выбирает');
      const partner = (p.seat + 2) % 4;
      if (seat !== p.seat && seat !== partner) return err('Неверный игрок');
      if (!r.players[seat]) return err('Игрок не найден');
      startRound(r, seat);
      broadcast(r);
    });

    // РЕВАНШ
    socket.on('restartGame', () => {
      const r = rooms.get(rid); if (!r) return;
      if (r.hostId !== pid) return err('Только хост');
      if (r.phase !== 'gameEnd') return err('Игра не закончена');
      r.teamStep = [0, 0];
      r.roundWins = [0, 0];
      r.roundHistory = [];
      r.playerStats = [0, 0, 0, 0];
      r.gameStartTime = Date.now();
      r.winnerTeam = null;
      startRound(r, 0);
      broadcast(r);
    });

    // ВЫХОД ИЗ КОМНАТЫ
    socket.on('leaveRoom', () => {
      const r = rooms.get(rid); if (!r) return;
      const p = getMe(); if (!p) return;

      if (p.voiceEnabled) {
        p.voiceEnabled = false;
        io.to(r.id).emit('voice-peer-left', { playerId: p.id });
      }

      if (r.phase === 'lobby') {
        r.players = r.players.filter(x => x.id !== p.id);
        r.players.forEach((x, i) => { x.seat = i; x.team = i % 2; });
        if (!r.players.length) {
          rooms.delete(r.id);
        } else {
          if (r.hostId === p.id) r.hostId = r.players[0].id;
          broadcast(r);
        }
      } else {
        p.connected = false;
        log(r, `${p.name} покинул комнату`);
        if (r.disconnectTimers[p.id]) clearTimeout(r.disconnectTimers[p.id]);
        r.disconnectTimers[p.id] = setTimeout(() => {
          const room = rooms.get(r.id);
          if (!room) return;
          const target = room.players.find(x => x.id === p.id);
          if (!target || target.connected) return;
          room.phase = 'gameEnd';
          room.winnerTeam = 1 - target.team;
          log(room, `⏱ Техническое поражение команде ${target.team ? 'B' : 'A'}`);
          broadcast(room);
        }, DISCONNECT_TIMEOUT_MS);
      }
      pid = null;
      rid = null;
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', () => {
      const r = rooms.get(rid); if (!r) return;
      const p = r.players.find(x => x.id === pid);
      if (p) {
        if (p.voiceEnabled) {
          p.voiceEnabled = false;
          io.to(r.id).emit('voice-peer-left', { playerId: p.id });
        }
        p.connected = false;
        log(r, `${p.name} отключился`);
        if (r.phase !== 'lobby') {
          if (r.disconnectTimers[p.id]) clearTimeout(r.disconnectTimers[p.id]);
          r.disconnectTimers[p.id] = setTimeout(() => {
            const room = rooms.get(r.id);
            if (!room) return;
            const target = room.players.find(x => x.id === p.id);
            if (!target || target.connected) return;
            room.phase = 'gameEnd';
            room.winnerTeam = 1 - target.team;
            log(room, `⏱ Техническое поражение команде ${target.team ? 'B' : 'A'}`);
            broadcast(room);
          }, DISCONNECT_TIMEOUT_MS);
        }
      }
      broadcast(r);
    });

    // ==================== 🎤 ГОЛОСОВОЙ ЧАТ ====================
    socket.on('voice-enabled', () => {
      const r = rooms.get(rid); if (!r) return;
      const p = getMe(); if (!p) return;
      p.voiceEnabled = true;

      const peers = r.players
        .filter(x => x.voiceEnabled && x.id !== pid)
        .map(x => x.id);

      socket.emit('voice-peers', { peers });
      socket.to(r.id).emit('voice-peer-joined', { playerId: pid });
    });

    socket.on('voice-disabled', () => {
      const r = rooms.get(rid); if (!r) return;
      const p = getMe(); if (!p) return;
      p.voiceEnabled = false;
      socket.to(r.id).emit('voice-peer-left', { playerId: pid });
    });

    socket.on('voice-signal', ({ to, data }) => {
      const r = rooms.get(rid); if (!r) return;
      const target = r.players.find(x => x.id === to);
      if (!target) return;
      io.to(to).emit('voice-signal', { from: pid, data });
    });

    registerGameHandlers(io, socket, ctx);
  });
}