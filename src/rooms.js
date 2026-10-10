import { LADDERS } from './constants.js';
import { code } from './utils.js';
import fs from 'fs';
import path from 'path';

export const rooms = new Map();

// Ленивая загрузка manager.js
let _managerPromise = null;
function getManager() {
  if (!_managerPromise) {
    _managerPromise = import('./bots/manager.js').catch(e => {
      console.error('[rooms->bot] import failed:', e);
      return null;
    });
  }
  return _managerPromise;
}

export function newRoom(opts = {}) {
  const r = {
    id: code(),
    opts: {
      maxPlayers: 4,
      docSet: 'classic',
      handSize: 6,
      theme: 'classic',
      deckStyle: 'figures',
      backColor: 'blue',
      ...opts,
    },
    players: [],
    spectators: [],
    hostId: null,
    phase: 'lobby',
    deck: [],
    trumpCard: null,
    trumpSuit: null,
    teamStep: [0, 0],
    roundWins: [0, 0],
    field: null,
    pendingPass: null,
    pendingSwap: null,
    pendingStart: null,
    pendingFalsh: null,
    swapTimer: null,
    turnSeat: 0,
    log: [],
    lastAttacker: null,
    lastTarget: null,
    lastDuelPair: null,              // 🆕 пара последней дуэли (3p)
    forcedTarget: null,
    forcedAttackerSlot: null,
    teamPairLastSlot: [null, null],
    teamLastTargetSlot: [null, null],
    roundHistory: [],
    playerStats: [0, 0, 0, 0],
    gameStartTime: null,
    winnerTeam: null,
    swapUsedByTeam: [false, false],
    disconnectTimers: {},
    _botTimer: null,
    _stuckSince: undefined,
    _simulation: null,
    _logStream: null,
  };
  rooms.set(r.id, r);
  return r;
}

export const docsOf = (r) => [
  LADDERS[r.opts.docSet][r.teamStep[0]],
  LADDERS[r.opts.docSet][r.teamStep[1]],
];

export function pub(r, forId) {
  const me = r.players.find(p => p.id === forId);
  const docs = docsOf(r);
  const swapPub = r.pendingSwap ? {
    stage: r.pendingSwap.stage,
    from: r.pendingSwap.from,
    to: r.pendingSwap.to,
    team: r.pendingSwap.team,
  } : null;

  const deckCount = r.deck.length;
  const trumpReminder = (deckCount === 0 && !r.trumpCard && r.trumpSuit) ? r.trumpSuit : null;

  return {
    id: r.id,
    opts: r.opts,
    phase: r.phase,
    players: r.players.map(p => {
      const isMe = p.id === forId;
      return {
        id: p.id, name: p.name, seat: p.seat, team: p.team,
        handCount: isMe ? p.hand.length : null,
        connected: p.connected, out: p.out,
        isHost: p.id === r.hostId,
        avatar: p.avatar || '',
        voiceEnabled: !!p.voiceEnabled,
        isBot: !!p.isBot,
        botType: p.botType || null,
        botProfile: p.botProfile ? p.botProfile.key : null,
      };
    }),
    myHand: me ? me.hand : [],
    mySeat: me ? me.seat : -1,
    myTeam: me ? me.team : -1,
    deckCount,
    deckEmpty: deckCount === 0,
    trumpReminder,
    trumpCard: r.trumpCard,
    trumpSuit: r.trumpSuit,
    docs,
    roundWins: r.roundWins,
    roundHistory: r.roundHistory,
    playerStats: r.playerStats,
    gameStartTime: r.gameStartTime,
    winnerTeam: r.winnerTeam,
    field: r.field,
    pendingPass: r.pendingPass,
    pendingSwap: swapPub,
    pendingStart: r.pendingStart,
    pendingFalsh: r.pendingFalsh,
    turnSeat: r.turnSeat,
    log: r.log.slice(-25),
    swapUsedByTeam: r.swapUsedByTeam,
    isSimulation: !!r._simulation,
    simulation: r._simulation ? { ...r._simulation } : null,
  };
}

export function makeBroadcast(io) {
  return function broadcast(r) {
    for (const p of r.players) {
      if (p.isBot) continue;
      io.to(p.id).emit('state', pub(r, p.id));
    }
    if (r.spectators && r.spectators.length) {
      for (const sp of r.spectators) {
        io.to(sp.id).emit('state', pub(r, null));
      }
    }
    getManager().then(m => {
      if (m && m.onRoomChange) m.onRoomChange(io, r, broadcast);
    }).catch(() => {});
  };
}

export function log(r, t) {
  r.log.push(t);
  const line = `[${r.id}] ${t}`;
  console.log(line);
  if (r._logStream) {
    try { r._logStream.write(line + '\n'); } catch {}
  }
}

export function startSimulationLog(r) {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = path.join(logsDir, `sim-${ts}.log`);
    r._logStream = fs.createWriteStream(logPath, { flags: 'w' });
    r._logStream.on('error', (e) => console.error('[sim-log] error:', e));
    console.log(`[sim] 📝 Log file: ${logPath}`);
    return logPath;
  } catch (e) {
    console.error('[sim] Failed to create log file:', e);
    return null;
  }
}

export function stopSimulationLog(r) {
  if (r._logStream) {
    try { r._logStream.end(); } catch {}
    r._logStream = null;
  }
}

export function clearDisconnectTimer(r, playerId) {
  if (r.disconnectTimers[playerId]) {
    clearTimeout(r.disconnectTimers[playerId]);
    delete r.disconnectTimers[playerId];
  }
}

export function clearSwapTimer(r) {
  if (r.swapTimer) {
    clearTimeout(r.swapTimer);
    r.swapTimer = null;
  }
}