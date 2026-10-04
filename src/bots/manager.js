import { rooms } from '../rooms.js';
import { partnerOf, bothPartnersPassed } from '../utils.js';
import { uid } from '../utils.js';
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
    join() {}, to() { return { emit() {} }; },
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
    // TODO Этап 5
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
      case 'defend':           for (const b of d.beats) s.emit('defend', { targetId: b.targetId, withId: b.withId }); break;
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

function findActingBot(room) {
  // pendingSwap
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
  // pendingPass
  if (room.pendingPass) {
    const team = room.players[room.pendingPass.seat].team;
    const b = room.players.find(x => x.team !== team && x.isBot);
    if (b) return { bot: b, decisions: [{ action: 'passDocsConfirm' }] };
    return null;
  }

  // Есть поле
  if (room.field) {
    const f = room.field;
    const def = room.players[f.defender];
    const atk = f.attacker;
    const par = (atk + 2) % 4;

    // 1. Защитник — если есть неотбитые и он не сдался
    const unbeaten = f.cards.filter(e => !e.beatenBy);
    if (unbeaten.length > 0 && def && def.isBot && !def.out && !f.defenderGaveUp) {
      const d = decide(room, def);
      if (d.length) return { bot: def, decisions: d };
    }

    // 2. Атакующий и партнёр (если не пасанули)
    for (const seat of [atk, par]) {
      const b = room.players[seat];
      if (!b || !b.isBot || b.out) continue;
      if (f.passedSeats.includes(seat)) continue;
      const d = decide(room, b);
      if (d.length) return { bot: b, decisions: d };
    }

    // 3. Защитник сдался + оба пасанули → автопикап уже отработал в actions.js
    // 4. Всё отбито + оба пасанули → bito или pickup (защитник)
    if (unbeaten.length === 0 && bothPartnersPassed(room) && def && def.isBot && !def.out && !f.defenderGaveUp) {
      const d = decide(room, def);
      if (d.length) return { bot: def, decisions: d };
    }
    return null;
  }

  // Поля нет — просто ход
  const t = room.players[room.turnSeat];
  if (t && t.isBot && !t.out) {
    const d = decide(room, t);
    if (d.length) return { bot: t, decisions: d };
  }
  return null;
}

export function onRoomChange(io, room, broadcast) {
  if (room._botTimer) { clearTimeout(room._botTimer); room._botTimer = null; }
  if (room.phase !== 'playing') return;

  const found = findActingBot(room);
  if (!found) return;

  const { bot, decisions } = found;
  const delay = (BOT_DELAY[bot.botType] || 1000) + Math.random() * 400;
  room._botTimer = setTimeout(() => {
    room._botTimer = null;
    applyDecisions(room, bot, decisions);
    // broadcast внутри emit — зациклит onRoomChange
  }, delay);
}