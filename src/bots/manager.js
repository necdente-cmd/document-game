import { rooms } from '../rooms.js';
import { partnerOf, bothPartnersPassed, uid } from '../utils.js';
import { registerGameHandlers } from '../game/actions.js';
import { getRandomProfile } from './profiles.js';
import { getMemory } from './memory.js';
import { botDecideGenius } from './genius/index.js';

const BOT_DELAY = 1500;
const FORCE_PASS_DELAY = 4000;

// Имена ботов (по кругу, если ботов больше чем имён)
const BOT_NAMES = [
  'Муке', 'Даке', 'Шүкү', 'Доке',
  'Соке', 'Куке', 'Ули',  'Токо',
];

export function isBot(p) { return !!(p && p.isBot); }

export function createBotPlayer(index) {
  const profile = getRandomProfile();
  const name = BOT_NAMES[(index - 1) % BOT_NAMES.length];
  return {
    id: 'bot_' + uid(),
    name,
    seat: -1, team: -1,
    hand: [], connected: true, out: false,
    persistentId: null, avatar: '', voiceEnabled: false,
    isBot: true, botType: 'genius', botProfile: profile,
    _socket: null,
  };
}

export function addBotToRoom(io, room, broadcast) {
  if (room.phase !== 'lobby') return null;
  if (room.players.length >= room.opts.maxPlayers) return null;

  const n = room.players.filter(p => p.isBot).length + 1;
  const bot = createBotPlayer(n);
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
  return botDecideGenius(room, bot.seat, getMemory(room), bot.botProfile) || [];
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

function peekPendingBot(room) {
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
  if (room.pendingPass) {
    const req = room.players[room.pendingPass.seat];
    if (!req) return null;
    return room.players.find(x => x.team !== req.team && x.isBot) || null;
  }
  if (room.field) {
    const f = room.field;
    const def = room.players[f.defender];
    const unbeaten = f.cards.some(e => !e.beatenBy);
    if (unbeaten && def && def.isBot && !def.out && !f.defenderGaveUp) return def;
    for (const seat of [f.attacker, (f.attacker + 2) % 4]) {
      const b = room.players[seat];
      if (b && b.isBot && !b.out && !f.passedSeats.includes(seat)) return b;
    }
    if (!unbeaten && bothPartnersPassed(room) && def && def.isBot && !def.out && !f.defenderGaveUp) {
      return def;
    }
    return null;
  }
  const t = room.players[room.turnSeat];
  if (t && t.isBot && !t.out) return t;
  return null;
}

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

    if (unbeaten.length > 0 && def && def.isBot && !def.out && !f.defenderGaveUp) {
      const d = decide(room, def);
      if (d.length) return { bot: def, decisions: d };
    }

    for (const seat of [atk, par]) {
      const b = room.players[seat];
      if (!b || !b.isBot || b.out) continue;
      if (f.passedSeats.includes(seat)) continue;
      const d = decide(room, b);
      if (d.length) return { bot: b, decisions: d };
    }

    if (unbeaten.length === 0 && !f.defenderGaveUp && !f.askMore) {
      const waiters = [];
      for (const seat of [atk, par]) {
        const b = room.players[seat];
        if (!b || b.out) continue;
        if (f.passedSeats.includes(seat)) continue;
        if (!b.isBot) return null;
        waiters.push(b);
      }
      if (waiters.length > 0 && room._stuckSince === undefined) {
        room._stuckSince = Date.now();
      } else if (waiters.length > 0
                 && Date.now() - room._stuckSince > FORCE_PASS_DELAY) {
        room._stuckSince = undefined;
        return { bot: waiters[0], decisions: [{ action: 'pass' }] };
      } else if (waiters.length === 0) {
        room._stuckSince = undefined;
      }
      return null;
    }

    if (unbeaten.length === 0 && bothPartnersPassed(room)
        && def && def.isBot && !def.out && !f.defenderGaveUp) {
      const d = decide(room, def);
      if (d.length) return { bot: def, decisions: d };
    }

    room._stuckSince = undefined;
    return null;
  }
  const t = room.players[room.turnSeat];
  if (t && t.isBot && !t.out) {
    const d = decide(room, t);
    if (d.length) return { bot: t, decisions: d };
  }
  return null;
}

export function onRoomChange(io, room, broadcast) {
  if (room._botTimer) { clearTimeout(room._botTimer); room._botTimer = null; }
  if (room.phase !== 'playing') { room._stuckSince = undefined; return; }

  const peek = peekPendingBot(room);
  if (!peek) return;

  const delay = BOT_DELAY + Math.random() * 500;
  room._botTimer = setTimeout(() => {
    room._botTimer = null;
    const found = findActingBot(room);
    if (!found) {
      if (room._stuckSince) {
        onRoomChange(io, room, broadcast);
      }
      return;
    }
    room._stuckSince = undefined;
    applyDecisions(room, found.bot, found.decisions);
  }, delay);
}