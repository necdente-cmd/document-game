import { rooms } from '../rooms.js';
import { partnerOf, bothPartnersPassed, uid } from '../utils.js';
import { registerGameHandlers } from '../game/actions.js';
import { getRandomProfile } from './profiles.js';
import { getMemory } from './memory.js';
import { botDecideSmart } from './smart/index.js';

const BOT_DELAY = { smart: 1000, genius: 2500 };

export function isBot(p) { return !!(p && p.isBot); }

export function createBotPlayer(type, index) {
  const profile = getRandomProfile();
  const icon = type === 'genius' ? '🧠' : '🤖';
  const label = type === 'genius' ? 'Genius' : 'Smart';
  return {
    id: 'bot_' + uid(),
    name: `${icon} ${label} ${index}`,
    seat: -1, team: -1,
    hand: [], connected: true, out: false,
    persistentId: null, avatar: '', voiceEnabled: false,
    isBot: true, botType: type, botProfile: profile,
    _socket: null,
  };
}

export function addBotToRoom(io, room, type, broadcast) {
  if (room.phase !== 'lobby') return null;
  if (room.players.length >= room.opts.maxPlayers) return null;

  const n = room.players.filter(p => p.isBot && p.botType === type).length + 1;
  const bot = createBotPlayer(type, n);
  bot.seat = room.players.length;
  bot.team = bot.seat % 2;
  room.players.push(bot);

  registerBotSocket(io, room, bot, broadcast);
  return bot;
}

export function registerBotSocket(io, room, bot, broadcast) {
  const fakeSocket = {
    _handlers: {},
    on(event, fn) { this._handlers[event] = fn; },
    emit(event, payload) {
      const fn = this._handlers[event];
      if (fn) {
        try { fn(payload); }
        catch (e) { console.error(`[${bot.name}] emit ${event}`, e); }
      }
    },
    join() {},
    to() { return { emit() {} }; },
  };
  const ctx = {
    rooms,
    broadcast,
    err: (m) => console.log(`[${bot.name}] err: ${m}`),
    getMe: () => room.players.find(p => p.id === bot.id),
    getRid: () => room.id,
  };
  registerGameHandlers(io, fakeSocket, ctx);
  bot._socket = fakeSocket;
}

function decide(room, bot) {
  if (bot.botType === 'genius') {
    // TODO Этап 5 — пока используем Smart
    return botDecideSmart(room, bot.seat, getMemory(room), bot.botProfile) || [];
  }
  return botDecideSmart(room, bot.seat, getMemory(room), bot.botProfile) || [];
}

function applyDecisions(room, bot, decisions) {
  const s = bot._socket;
  if (!s) return;
  for (const d of decisions) {
    switch (d.action) {
      case 'attack':           s.emit('attack', { cardIds: d.cardIds }); break;
      case 'defend':
        for (const b of d.beats) s.emit('defend', { targetId: b.targetId, withId: b.withId });
        break;
      case 'pickUp':           s.emit('pickUp', {}); break;
      case 'pass':             s.emit('endAttack', {}); break;
      case 'bito':             s.emit('bito', {}); break;
      case 'throwDocs':        s.emit('throwDocs', {}); break;
      case 'passDocsRequest':  s.emit('passDocsRequest', {}); break;
      case 'passDocsConfirm':  s.emit('passDocsConfirm', {}); break;
      case 'swapAsk':          s.emit('swapAsk', {}); break;
      case 'swapInitiate':     s.emit('swapInitiate', {}); break;
      case 'swapAccept':       s.emit('swapAccept', {}); break;
      case 'swapReject':       s.emit('swapReject', {}); break;
      case 'swapConfirm':      s.emit('swapConfirm', {}); break;
    }
  }
}

// =====================================================================
// БЫСТРАЯ ПРОВЕРКА: кто потенциально сейчас может действовать?
// НЕ принимает решений, только смотрит состояние.
// =====================================================================
function peekPendingBot(room) {
  // Pending swap
  if (room.pendingSwap) {
    const sw = room.pendingSwap;
    if (sw.stage === 'partnerConfirm') {
      const p = room.players[sw.to];
      if (p && p.isBot) return p;
    }
    if (sw.stage === 'opponentConfirm') {
      const b = room.players.find(x => x.team !== sw.team && !x.out && x.isBot);
      if (b) return b;
    }
    return null;
  }

  // Pending pass docs
  if (room.pendingPass) {
    const req = room.players[room.pendingPass.seat];
    if (!req) return null;
    return room.players.find(x => x.team !== req.team && x.isBot) || null;
  }

  // Есть поле
  if (room.field) {
    const f = room.field;
    const def = room.players[f.defender];
    const unbeaten = f.cards.some(e => !e.beatenBy);

    // Защитник с неотбитыми
    if (unbeaten && def && def.isBot && !def.out && !f.defenderGaveUp) return def;

    // Атакующий / партнёр
    for (const seat of [f.attacker, (f.attacker + 2) % 4]) {
      const b = room.players[seat];
      if (b && b.isBot && !b.out && !f.passedSeats.includes(seat)) return b;
    }

    // Всё отбито + оба пасанули → защитник решает
    if (!unbeaten && bothPartnersPassed(room) && def && def.isBot && !def.out && !f.defenderGaveUp) {
      return def;
    }
    return null;
  }

  // Поля нет — обычный ход
  const t = room.players[room.turnSeat];
  if (t && t.isBot && !t.out) return t;
  return null;
}

// =====================================================================
// ПОЛНОЕ РЕШЕНИЕ (findActingBot). Вызывается ТОЛЬКО внутри таймера,
// на свежих данных. Это исключает race condition и дубли логов.
// =====================================================================
function findActingBot(room) {
  if (room.pendingSwap) {
    const sw = room.pendingSwap;
    if (sw.stage === 'partnerConfirm') {
      const p = room.players[sw.to];
      if (p && p.isBot) return { bot: p, decisions: [{ action: 'swapAccept' }] };
    }
    if (sw.stage === 'opponentConfirm') {
      const b = room.players.find(x => x.team !== sw.team && !x.out && x.isBot);
      if (b) return { bot: b, decisions: [{ action: 'swapConfirm' }] };
    }
    return null;
  }

  if (room.pendingPass) {
    const requester = room.players[room.pendingPass.seat];
    if (!requester) return null;
    const b = room.players.find(x => x.team !== requester.team && x.isBot);
    if (b) return { bot: b, decisions: [{ action: 'passDocsConfirm' }] };
    return null;
  }

  if (room.field) {
    const f = room.field;
    const def = room.players[f.defender];
    const atk = f.attacker;
    const par = (atk + 2) % 4;
    const unbeaten = f.cards.filter(e => !e.beatenBy);

    // 1. Защитник с неотбитыми
    if (unbeaten.length > 0 && def && def.isBot && !def.out && !f.defenderGaveUp) {
      const d = decide(room, def);
      if (d.length) return { bot: def, decisions: d };
    }

    // 2. Атакующий / партнёр
    for (const seat of [atk, par]) {
      const b = room.players[seat];
      if (!b || !b.isBot || b.out) continue;
      if (f.passedSeats.includes(seat)) continue;
      const d = decide(room, b);
      if (d.length) return { bot: b, decisions: d };
    }

    // 3. Всё отбито + оба пасанули
    if (unbeaten.length === 0 && bothPartnersPassed(room)
        && def && def.isBot && !def.out && !f.defenderGaveUp) {
      const d = decide(room, def);
      if (d.length) return { bot: def, decisions: d };
    }
    return null;
  }

  const t = room.players[room.turnSeat];
  if (t && t.isBot && !t.out) {
    const d = decide(room, t);
    if (d.length) return { bot: t, decisions: d };
  }
  return null;
}

// =====================================================================
// ГЛАВНАЯ ТОЧКА ВХОДА
// =====================================================================
export function onRoomChange(io, room, broadcast) {
  if (room._botTimer) { clearTimeout(room._botTimer); room._botTimer = null; }
  if (room.phase !== 'playing') return;

  // Быстрая проверка без решений
  const peek = peekPendingBot(room);
  if (!peek) return;

  const delay = (BOT_DELAY[peek.botType] || 1000) + Math.random() * 400;
  room._botTimer = setTimeout(() => {
    room._botTimer = null;
    // Свежее решение на актуальном состоянии
    const found = findActingBot(room);
    if (!found) return;
    applyDecisions(room, found.bot, found.decisions);
  }, delay);
}