import { rooms, log as rlog, stopSimulationLog } from '../rooms.js';
import { partnerOf, bothPartnersPassed, uid } from '../utils.js';
import { registerGameHandlers } from '../game/actions.js';
import { startRound } from '../game/round.js';
import { getProfileByKey, SIM_PROFILE_KEY } from './profiles.js';
import { getMemory } from './memory.js';
import { getDocs } from './cards.js';
import { botDecideGenius } from './genius/index.js';

const BOT_DELAY = 1500;
const FORCE_PASS_DELAY = 4000;
const INTER_GAME_DELAY = 3000;

const BOT_NAMES = [
  'Муке', 'Даке', 'Шүкү', 'Доке',
  'Соке', 'Куке', 'Ули',  'Токо',
];

// 🎬 Профили для симуляции: чередуем агрессивный/тихий
const SIM_PROFILE_ROTATION = ['aggressive', 'cautious', 'aggressive', 'cautious'];

export function isBot(p) { return !!(p && p.isBot); }

export function createBotPlayer(index, profileKey = null) {
  // Если явно не задан профиль — берём из ротации симуляции
  let key = profileKey;
  if (!key) {
    key = SIM_PROFILE_ROTATION[(index - 1) % SIM_PROFILE_ROTATION.length];
  }
  const profile = getProfileByKey(key);
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

export function addBotToRoom(io, room, broadcast, profileKey = null) {
  if (room.phase !== 'lobby' && room.phase !== 'gameEnd') return null;
  if (room.players.length >= room.opts.maxPlayers) return null;

  const n = room.players.filter(p => p.isBot).length + 1;
  const bot = createBotPlayer(n, profileKey);
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

function safeDecide(room, bot) {
  try {
    return botDecideGenius(room, bot.seat, getMemory(room), bot.botProfile) || [];
  } catch (e) {
    console.error(`[${bot.name}] decide error:`, e);
    rlog(room, `[${bot.name}] ❌ decide error: ${e.message}`);
    return [];
  }
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
// 🔧 3p/2p-режим: выбиваем игроков согласно cascadePlan
// =====================================================================
function applyForcedOuts(room) {
  const sim = room._simulation;
  if (!sim) return;

  // Одиночный 3p-режим
  if (sim.mode3p) {
    const victim = room.players.find(p => p.seat === 0);
    if (victim) {
      victim.out = true;
      victim.hand = [];
    }
    if (room.turnSeat === 0) room.turnSeat = 2;
    return;
  }

  // Каскадный режим: применяем ВСЕ планы до текущего кона
  if (sim.cascade && sim.cascadePlan) {
    for (const step of sim.cascadePlan) {
      if (sim.roundsPlayed >= step.afterRound) {
        for (const seat of step.forceOut) {
          const victim = room.players.find(p => p.seat === seat);
          if (victim && !victim.out) {
            victim.out = true;
            victim.hand = [];
            rlog(room, `⚡ Каскад: ${victim.name} (seat ${seat}) выбит → режим ${4 - seat - 1}p`);
          }
        }
      }
    }
    // turnSeat не может быть на вышедшем
    const cur = room.players[room.turnSeat];
    if (cur && cur.out) {
      for (let i = 1; i <= 3; i++) {
        const s = (room.turnSeat + i) % 4;
        if (room.players[s] && !room.players[s].out) {
          room.turnSeat = s;
          break;
        }
      }
    }
  }
}

// =====================================================================
// 🎬 АВТОСТАРТ НОВОГО КОНА
// =====================================================================
function autoStartRound(io, room, broadcast) {
  const team = room.pendingStart?.winningTeam;
  if (team == null) {
    rlog(room, `⚠ Нет pendingStart для автостарта`);
    startRound(room, 0);
    applyForcedOuts(room);
    broadcast(room);
    return;
  }

  const teamBots = room.players.filter(p => p.team === team && p.isBot);
  if (!teamBots.length) {
    rlog(room, `⚠ Нет бота в команде ${team}, fallback → seat 0`);
    startRound(room, 0);
    applyForcedOuts(room);
    broadcast(room);
    return;
  }

  // Приоритет: активным, иначе любым
  const activeBots = teamBots.filter(p => !p.out);
  const pool = activeBots.length ? activeBots : teamBots;
  const bot = pool[(Math.random() * pool.length) | 0];

  let starterSeat = bot.seat;

  // Нельзя стартовать с вышедшего — сдвигаем
  const sim = room._simulation;
  if (sim?.mode3p && starterSeat === 0) starterSeat = 2;
  if (sim?.cascade) {
    const starter = room.players[starterSeat];
    if (!starter || starter.out) {
      // Ищем активного в той же команде, иначе любого активного
      const sameTeam = room.players.find(p => p.team === team && !p.out);
      const anyActive = room.players.find(p => !p.out);
      starterSeat = (sameTeam || anyActive)?.seat ?? 0;
    }
  }

  rlog(room, `🎬 Автостарт кона (выбирает ${bot.name} из команды ${team === 0 ? 'A' : 'B'}, seat ${starterSeat})`);
  startRound(room, starterSeat);
  applyForcedOuts(room);
  broadcast(room);
}

// =====================================================================
// 🎬 АВТО-ПЕРЕЗАПУСК ПАРТИИ
// =====================================================================
function handleGameEnd(io, room, broadcast) {
  const sim = room._simulation;
  if (!sim) return;

  sim.gamesPlayed++;
  const winner = room.winnerTeam;
  rlog(room, `🏆 Партия #${sim.gamesPlayed} завершена. Победила команда ${winner === 0 ? 'A' : 'B'}. Счёт ${room.roundWins[0]}:${room.roundWins[1]}`);

  if (sim.gamesPlayed >= sim.maxGames) {
    rlog(room, `🎬 ✅ Симуляция завершена: ${sim.gamesPlayed}/${sim.maxGames} партий`);
    setTimeout(() => {
      stopSimulationLog(room);
      room._simulation = null;
      rlog(room, `📝 Лог сохранён`);
    }, 2000);
    return;
  }

  room._botTimer = setTimeout(() => {
    room._botTimer = null;
    room.teamStep = [0, 0];
    room.roundWins = [0, 0];
    room.roundHistory = [];
    room.playerStats = [0, 0, 0, 0];
    room.gameStartTime = Date.now();
    room.winnerTeam = null;
    rlog(room, `🎬 Партия #${sim.gamesPlayed + 1} стартует`);
    startRound(room, 0);
    applyForcedOuts(room);
    broadcast(room);
  }, INTER_GAME_DELAY);
}

// =====================================================================
// 🎬 ХУК: вызывается в end.js через winByThrow → r.phase = 'roundEnd'
// Считаем завершённые коны для каскада
// =====================================================================
function bumpRoundCounter(room) {
  const sim = room._simulation;
  if (!sim?.cascade) return;
  sim.roundsPlayed++;
}

function peekPendingBot(room) {
  if (room.phase === 'gameEnd' && room._simulation) return true;

  if (room.phase === 'roundEnd' && room.pendingStart) {
    const team = room.pendingStart.winningTeam;
    const bot = room.players.find(p => p.team === team && p.isBot);
    if (bot) return bot;
    return null;
  }

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
    if (!unbeaten && !f.defenderGaveUp && !f.askMore) {
      const waiters = [];
      for (const seat of [f.attacker, (f.attacker + 2) % 4]) {
        const b = room.players[seat];
        if (!b || b.out) continue;
        if (f.passedSeats.includes(seat)) continue;
        if (!b.isBot) return null;
        waiters.push(b);
      }
      if (waiters.length > 0) return waiters[0];
    }
    return null;
  }
  const t = room.players[room.turnSeat];
  if (t && t.isBot && !t.out) return t;
  return null;
}

function findActingBot(room) {
  if (room.phase === 'gameEnd' && room._simulation) {
    return { special: 'gameEnd' };
  }

  if (room.phase === 'roundEnd' && room.pendingStart) {
    return { special: 'startRound' };
  }

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
      const d = safeDecide(room, def);
      if (d.length) return { bot: def, decisions: d };
    }

    for (const seat of [atk, par]) {
      const b = room.players[seat];
      if (!b || !b.isBot || b.out) continue;
      if (f.passedSeats.includes(seat)) continue;
      const d = safeDecide(room, b);
      if (d.length) return { bot: b, decisions: d };
    }

    if (unbeaten.length === 0 && bothPartnersPassed(room)
        && def && def.isBot && !def.out && !f.defenderGaveUp) {
      const d = safeDecide(room, def);
      if (d.length) return { bot: def, decisions: d };
      const docs = getDocs(room);
      const defDoc = docs[def.team];
      const hasDocOnTable = f.cards.some(e => e.card.r === defDoc);
      const action = hasDocOnTable ? 'pickUp' : 'bito';
      rlog(room, `[${def.name}] Fallback → ${action}`);
      return { bot: def, decisions: [{ action }] };
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
      if (waiters.length > 0) {
        if (room._stuckSince === undefined) {
          room._stuckSince = Date.now();
        } else if (Date.now() - room._stuckSince > FORCE_PASS_DELAY) {
          room._stuckSince = undefined;
          return { bot: waiters[0], decisions: [{ action: 'pass' }] };
        }
        return null;
      }
    }
    return null;
  }

  const t = room.players[room.turnSeat];
  if (t && t.isBot && !t.out) {
    const d = safeDecide(room, t);
    if (d.length) return { bot: t, decisions: d };
  }
  return null;
}

export function onRoomChange(io, room, broadcast) {
  if (room._botTimer) { clearTimeout(room._botTimer); room._botTimer = null; }

  // Считаем коны для каскада (roundEnd → увеличиваем счётчик)
  if (room.phase === 'roundEnd' && room.pendingStart) {
    bumpRoundCounter(room);
  }

  if (room.phase === 'gameEnd' && room._simulation) {
    handleGameEnd(io, room, broadcast);
    return;
  }

  if (room.phase === 'roundEnd' && room.pendingStart) {
    const delay = BOT_DELAY + Math.random() * 500;
    room._botTimer = setTimeout(() => {
      room._botTimer = null;
      autoStartRound(io, room, broadcast);
    }, delay);
    return;
  }

  if (room.phase !== 'playing') {
    room._stuckSince = undefined;
    return;
  }

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
    if (found.special === 'gameEnd') {
      handleGameEnd(io, room, broadcast);
      return;
    }
    if (found.special === 'startRound') {
      autoStartRound(io, room, broadcast);
      return;
    }
    room._stuckSince = undefined;
    applyDecisions(room, found.bot, found.decisions);
  }, delay);
}