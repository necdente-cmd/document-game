import { LADDERS } from './constants.js';
import { code } from './utils.js';

export const rooms = new Map();

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
    forcedTarget: null,
    roundHistory: [],
    playerStats: [0, 0, 0, 0],
    gameStartTime: null,
    winnerTeam: null,
    swapUsedByTeam: [false, false],
    disconnectTimers: {},
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
  return {
    id: r.id,
    opts: r.opts,
    phase: r.phase,
    players: r.players.map(p => {
      const isMe = p.id === forId;
      return {
        id: p.id,
        name: p.name,
        seat: p.seat,
        team: p.team,
        avatar: p.avatar || '😎',
        handCount: isMe ? p.hand.length : null,
        connected: p.connected,
        out: p.out,
        isHost: p.id === r.hostId,
      };
    }),
    myHand: me ? me.hand : [],
    mySeat: me ? me.seat : -1,
    myTeam: me ? me.team : -1,
    deckCount: null,
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
  };
}

export function makeBroadcast(io) {
  return function broadcast(r) {
    for (const p of r.players) io.to(p.id).emit('state', pub(r, p.id));
  };
}

export function log(r, t) {
  r.log.push(t);
  console.log(`[${r.id}] ${t}`);
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