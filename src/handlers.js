import { uid } from './utils.js';
import { rooms, newRoom, log, clearDisconnectTimer, pub } from './rooms.js';
import { startRound } from './game/round.js';
import { registerGameHandlers } from './game/actions.js';
import { DISCONNECT_TIMEOUT_MS } from './constants.js';
import { getIceServers } from './turn.js';
import { logPlayerSeen, logEvent, incrementStat } from './db.js';
import { addBotToRoom } from './bots/manager.js';

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
    socket.on('createRoom', ({ name, opts, persistentId }, cb) => {
      const r = newRoom(opts);
      pid = uid();
      rid = r.id;
      r.hostId = pid;
      r.players.push({
        id: pid, name: name || 'Игрок', seat: 0, team: 0,
        persistentId: persistentId || null,
        hand: [], connected: true, out: false,
        avatar: (opts && opts.avatar) || '',
        voiceEnabled: false,
      });
      socket.join(pid);
      socket.join(r.id);

      if (persistentId) {
        logPlayerSeen(persistentId, name, (opts && opts.avatar) || '');
        logEvent('join', persistentId, r.id, { name, type: 'create' });
      }

      cb({ ok: true, roomId: r.id, playerId: pid });
      broadcast(r);
    });

    // ВХОД / ПЕРЕПОДКЛЮЧЕНИЕ
    socket.on('joinRoom', ({ roomId, name, playerId, persistentId, avatar }, cb) => {
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
          if (persistentId) existing.persistentId = persistentId;
          if (existing.voiceEnabled === undefined) existing.voiceEnabled = false;
          socket.join(pid);
          socket.join(r.id);
          log(r, `${existing.name} вернулся`);

          if (existing.persistentId) {
            logPlayerSeen(existing.persistentId, existing.name, existing.avatar);
            logEvent('reconnect', existing.persistentId, r.id, { name: existing.name });
          }

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
        persistentId: persistentId || null,
        avatar: avatar || '',
        voiceEnabled: false,
      });
      socket.join(pid);
      socket.join(r.id);

      if (persistentId) {
        logPlayerSeen(persistentId, name, avatar);
        logEvent('join', persistentId, r.id, { name, type: 'join' });
      }

      cb({ ok: true, roomId: r.id, playerId: pid });
      broadcast(r);
    });

    // 🎯 СИНХРОНИЗАЦИЯ
    socket.on('syncState', () => {
      const r = rooms.get(rid); if (!r) return;
      const p = getMe(); if (!p) return;
      socket.emit('state', pub(r, p.id));
    });

    // 🎯 РАССТАНОВКА
    socket.on('setSeatOrder', ({ order }) => {
      const r = rooms.get(rid); if (!r) return;
      if (r.hostId !== pid) return err('Только хост может менять расстановку');
      if (r.phase !== 'lobby') return err('Можно только в лобби');
      if (!Array.isArray(order)) return err('Неверный формат');
      if (order.length !== r.players.length) return err('Неверное количество игроков');

      const idSet = new Set(order);
      if (idSet.size !== order.length) return err('Дубликаты игроков');

      const newPlayers = [];
      for (const id of order) {
        const p = r.players.find(x => x.id === id);
        if (!p) return err('Игрок не найден');
        newPlayers.push(p);
      }

      newPlayers.forEach((p, idx) => {
        p.seat = idx;
        p.team = idx % 2;
      });
      r.players = newPlayers;

      log(r, `🎯 Хост переставил игроков`);
      broadcast(r);
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

      for (const p of r.players) {
        if (p.persistentId) {
          incrementStat(p.persistentId, 'games_played');
          logEvent('gameStart', p.persistentId, r.id, { name: p.name });
        }
      }

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

    // ВЫХОД
    socket.on('leaveRoom', () => {
      const r = rooms.get(rid); if (!r) return;
      const p = getMe(); if (!p) return;

      if (p.voiceEnabled) {
        p.voiceEnabled = false;
        io.to(r.id).emit('voice-peer-left', { playerId: p.id });
      }

      if (p.persistentId) {
        logEvent('leave', p.persistentId, r.id, { name: p.name });
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

    // ==================== 🎤 ГОЛОС ====================
    socket.on('voice-enabled', () => {
      const r = rooms.get(rid); if (!r) return;
      const p = getMe(); if (!p) return;
      p.voiceEnabled = true;

      const peers = r.players
        .filter(x => x.voiceEnabled && x.id !== pid && !x.isBot)
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
      if (!target || target.isBot) return;
      io.to(to).emit('voice-signal', { from: pid, data });
    });

    // ==================== 🤖 БОТЫ ====================
    socket.on('addBot', ({ type } = {}) => {
      const r = rooms.get(rid); if (!r) return;
      if (r.hostId !== pid) return err('Только хост');
      if (r.phase !== 'lobby') return err('Только в лобби');
      if (r.players.length >= r.opts.maxPlayers) return err('Комната заполнена');
      const t = (type === 'genius') ? 'genius' : 'smart';
      const bot = addBotToRoom(io, r, t, broadcast);
      if (!bot) return;
      log(r, `Добавлен ${bot.name}`);
      broadcast(r);
    });

    socket.on('fillBots', ({ type, start } = {}) => {
      const r = rooms.get(rid); if (!r) return;
      if (r.hostId !== pid) return err('Только хост');
      if (r.phase !== 'lobby') return err('Только в лобби');
      const t = (type === 'genius') ? 'genius' : 'smart';
      while (r.players.length < r.opts.maxPlayers) {
        const bot = addBotToRoom(io, r, t, broadcast);
        if (!bot) break;
        log(r, `Добавлен ${bot.name}`);
      }
      if (start && r.players.length === r.opts.maxPlayers) {
        r.teamStep = [0, 0];
        r.roundWins = [0, 0];
        r.roundHistory = [];
        r.playerStats = [0, 0, 0, 0];
        r.gameStartTime = Date.now();
        r.winnerTeam = null;
        startRound(r, 0);
      }
      broadcast(r);
    });

    registerGameHandlers(io, socket, ctx);
  });
}