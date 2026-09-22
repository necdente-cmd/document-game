const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RV = Object.fromEntries(RANKS.map((r, i) => [r, 6 + i]));
const LADDERS = {
  classic: ['6', '10', 'J', 'Q', 'K', 'A'],
  short:   ['6', '10', 'Q', 'A'],
};
const MAX_ATTACK = 6;
const EMOJIS = ['👍','😂','😡','😭','🔥','💪','🤔','😎','👏','😱','🤝','🎯','😤','🙈','💯','⚡'];
const DISCONNECT_TIMEOUT_MS = 30 * 60 * 1000;

const uid = () => Math.random().toString(36).slice(2, 10);
const code = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const makeDeck = () => { const d = []; for (const s of SUITS) for (const r of RANKS) d.push({ r, s, id: uid() }); return d; };
const teamOf = s => s % 2;
const partnerOf = s => (s + 2) % 4;

const rooms = new Map();

function newRoom(opts = {}) {
  const r = {
    id: code(),
    opts: { maxPlayers: 4, docSet: 'classic', handSize: 6, theme: 'classic', deckStyle: 'figures', backColor: 'blue', ...opts },
    players: [], hostId: null, phase: 'lobby',
    deck: [], trumpCard: null, trumpSuit: null,
    teamStep: [0, 0], roundWins: [0, 0],
    field: null, pendingPass: null, pendingSwap: null, pendingStart: null,
    turnSeat: 0, log: [],
    lastAttacker: null, lastTarget: null, forcedTarget: null,
    roundHistory: [], playerStats: [0, 0, 0, 0],
    gameStartTime: null, winnerTeam: null,
    swapUsedByTeam: [false, false],
    disconnectTimers: {},
  };
  rooms.set(r.id, r);
  return r;
}

const docsOf = r => [LADDERS[r.opts.docSet][r.teamStep[0]], LADDERS[r.opts.docSet][r.teamStep[1]]];

function pub(r, forId) {
  const me = r.players.find(p => p.id === forId);
  const docs = docsOf(r);
  return {
    id: r.id, opts: r.opts, phase: r.phase,
    players: r.players.map(p => {
      const isMe = p.id === forId;
      return {
        id: p.id, name: p.name, seat: p.seat, team: p.team,
        handCount: isMe ? p.hand.length : null,
        connected: p.connected, out: p.out,
        isHost: p.id === r.hostId,
      };
    }),
    myHand: me ? me.hand : [],
    mySeat: me ? me.seat : -1,
    myTeam: me ? me.team : -1,
    deckCount: null,
    trumpCard: r.trumpCard, trumpSuit: r.trumpSuit,
    docs, roundWins: r.roundWins,
    roundHistory: r.roundHistory,
    playerStats: r.playerStats,
    gameStartTime: r.gameStartTime,
    winnerTeam: r.winnerTeam,
    field: r.field, pendingPass: r.pendingPass, pendingSwap: r.pendingSwap,
    pendingStart: r.pendingStart, turnSeat: r.turnSeat,
    log: r.log.slice(-25),
    swapUsedByTeam: r.swapUsedByTeam,
  };
}

const broadcast = r => r.players.forEach(p => io.to(p.id).emit('state', pub(r, p.id)));
const log = (r, t) => { r.log.push(t); console.log(`[${r.id}] ${t}`); };

const isKozir = (c, r) => c.s === r.trumpSuit;
function beats(a, b, r) {
  if (isKozir(a, r) && !isKozir(b, r)) return true;
  if (!isKozir(a, r) && isKozir(b, r)) return false;
  if (a.s !== b.s) return false;
  return RV[a.r] > RV[b.r];
}
function onlyDocs(r, p) {
  const doc = docsOf(r)[p.team];
  return p.hand.length > 0 && p.hand.every(c => c.r === doc);
}
function partnerOut(r, seat) {
  const partner = r.players[partnerOf(seat)];
  return partner ? partner.out : true;
}
function opponentsOf(r, attackerSeat) {
  const partner = partnerOf(attackerSeat);
  const list = [];
  for (let i = 1; i <= 3; i++) {
    const s = (attackerSeat - i + 4) % 4;
    if (s === partner) continue;
    if (r.players[s].out) continue;
    list.push(s);
  }
  return list;
}
function pickTarget(r, attackerSeat) {
  const opps = opponentsOf(r, attackerSeat);
  if (opps.length === 0) return null;
  if (opps.length === 1) return opps[0];
  if (r.lastAttacker != null && partnerOf(r.lastAttacker) === attackerSeat
      && r.lastTarget != null && opps.includes(r.lastTarget)) return r.lastTarget;
  if (r.lastTarget != null && opps.includes(r.lastTarget)) {
    const idx = opps.indexOf(r.lastTarget);
    return opps[(idx + 1) % opps.length];
  }
  return opps[0];
}
function resetTargets(r) { r.lastAttacker = null; r.lastTarget = null; r.forcedTarget = null; }

function drawTo(r, prioritySeat = null) {
  const order = [];
  if (prioritySeat !== null && r.players[prioritySeat] && !r.players[prioritySeat].out) order.push(prioritySeat);
  let s = prioritySeat !== null ? prioritySeat : 0;
  for (let i = 0; i < 4; i++) {
    s = (s + 1) % 4;
    if (!r.players[s].out && !order.includes(s)) order.push(s);
  }
  let changed = true;
  while (changed && r.deck.length > 0) {
    changed = false;
    for (const seat of order) {
      const p = r.players[seat];
      if (p.hand.length < r.opts.handSize && r.deck.length > 0) { p.hand.push(r.deck.pop()); changed = true; }
    }
  }
  if (r.deck.length === 0 && r.trumpCard) {
    let target = null;
    for (const seat of order) {
      const p = r.players[seat];
      if (p.hand.length < r.opts.handSize) { target = p; break; }
    }
    if (!target && order.length > 0) target = r.players[order[0]];
    if (target) { target.hand.push(r.trumpCard); r.trumpCard = null; log(r, `Козырная карта → ${target.name}`); }
  }
}
function bothPartnersPassed(r) {
  if (!r.field) return false;
  const a = r.field.attacker, b = partnerOf(a);
  const aDone = r.players[a].out || r.field.passedSeats.includes(a);
  const bDone = r.players[b].out || r.field.passedSeats.includes(b);
  return aDone && bDone;
}
function hasDefenderDoc(r) {
  if (!r.field) return false;
  const defender = r.players[r.field.defender];
  const ddoc = docsOf(r)[defender.team];
  return r.field.cards.some(e => !e.beatenBy && e.card.r === ddoc);
}

function clearDisconnectTimer(r, playerId) {
  if (r.disconnectTimers[playerId]) {
    clearTimeout(r.disconnectTimers[playerId]);
    delete r.disconnectTimers[playerId];
  }
}

function winByThrow(r, team, winnerSeat) {
  r.roundWins[team]++;
  if (winnerSeat != null) r.playerStats[winnerSeat]++;
  r.roundHistory.push({ n: r.roundHistory.length + 1, winner: team });
  const ladder = LADDERS[r.opts.docSet];
  if (r.teamStep[team] === ladder.length - 1) {
    r.phase = 'gameEnd'; r.winnerTeam = team;
    log(r, `🏆 Команда ${team ? 'B' : 'A'} — ЧЕМПИОН!`);
    return;
  }
  r.teamStep[team]++;
  r.phase = 'roundEnd';
  r.pendingStart = { winningTeam: team };
  log(r, `Команда ${team ? 'B' : 'A'} выиграла кон. Счёт ${r.roundWins[0]}:${r.roundWins[1]}`);
}
function winByExit(r, team) {
  r.roundWins[team]++;
  r.roundHistory.push({ n: r.roundHistory.length + 1, winner: team });
  r.phase = 'roundEnd';
  r.pendingStart = { winningTeam: team };
  log(r, `Команда ${team ? 'B' : 'A'} выиграла кон (все вышли). Счёт ${r.roundWins[0]}:${r.roundWins[1]}`);
}
function checkTeamExitWin(r) {
  for (const team of [0, 1]) {
    const members = r.players.filter(p => p.team === team);
    if (members.length && members.every(p => p.out)) { winByExit(r, team); return true; }
  }
  return false;
}

function startRound(r, starterSeat = 0) {
  r.deck = shuffle(makeDeck());
  r.trumpCard = r.deck.shift();
  r.trumpSuit = r.trumpCard.s;
  r.field = null; r.pendingPass = null; r.pendingSwap = null; r.pendingStart = null;
  resetTargets(r);
  r.swapUsedByTeam = [false, false];
  if (!r.gameStartTime) r.gameStartTime = Date.now();
  r.phase = 'playing';
  for (const p of r.players) { p.hand = []; p.out = false; }
  for (let i = 0; i < r.opts.handSize; i++) for (const p of r.players) p.hand.push(r.deck.pop());
  r.turnSeat = starterSeat;
  const d = docsOf(r);
  log(r, `Козырь ${r.trumpSuit}. Док: A=${d[0]}, B=${d[1]}. Старт: ${r.players[starterSeat].name}`);
}

io.on('connection', socket => {
  let pid = null, rid = null;
  const me = () => { const r = rooms.get(rid); return r && r.players.find(p => p.id === pid); };
  const err = m => socket.emit('err', m);

  socket.on('createRoom', ({ name, opts }, cb) => {
    const r = newRoom(opts);
    pid = uid(); rid = r.id; r.hostId = pid;
    r.players.push({ id: pid, name: name || 'Игрок', seat: 0, team: 0, hand: [], connected: true, out: false });
    socket.join(pid);
    cb({ ok: true, roomId: r.id, playerId: pid });
    broadcast(r);
  });

  socket.on('joinRoom', ({ roomId, name, playerId }, cb) => {
    const r = rooms.get((roomId || '').toUpperCase());
    if (!r) return cb({ ok: false, err: 'Комната не найдена' });
    if (playerId) {
      const existing = r.players.find(p => p.id === playerId);
      if (existing) {
        clearDisconnectTimer(r, playerId);
        pid = playerId; rid = r.id;
        existing.connected = true;
        if (name) existing.name = name;
        socket.join(pid);
        log(r, `${existing.name} вернулся`);
        cb({ ok: true, roomId: r.id, playerId: pid, reconnected: true });
        broadcast(r);
        return;
      }
    }
    if (r.players.length >= r.opts.maxPlayers) return cb({ ok: false, err: 'Комната заполнена' });
    if (r.phase !== 'lobby') return cb({ ok: false, err: 'Игра уже началась' });
    pid = uid(); rid = r.id;
    const seat = r.players.length;
    r.players.push({ id: pid, name: name || `Игрок ${seat + 1}`, seat, team: teamOf(seat), hand: [], connected: true, out: false });
    socket.join(pid);
    cb({ ok: true, roomId: r.id, playerId: pid });
    broadcast(r);
  });

  socket.on('startGame', () => {
    const r = rooms.get(rid); if (!r) return;
    if (r.hostId !== pid) return err('Только хост');
    if (r.players.length !== r.opts.maxPlayers) return err(`Нужно ${r.opts.maxPlayers} игроков`);
    r.teamStep = [0, 0]; r.roundWins = [0, 0];
    r.roundHistory = []; r.playerStats = [0, 0, 0, 0];
    r.gameStartTime = Date.now(); r.winnerTeam = null;
    startRound(r, 0);
    broadcast(r);
  });

  socket.on('chooseStart', ({ seat }) => {
    const r = rooms.get(rid); if (!r || !r.pendingStart) return;
    const p = me(); if (!p) return;
    if (p.team !== r.pendingStart.winningTeam) return err('Не ваша команда выбирает');
    const partner = partnerOf(p.seat);
    if (seat !== p.seat && seat !== partner) return err('Неверный игрок');
    if (!r.players[seat]) return err('Игрок не найден');
    startRound(r, seat);
    broadcast(r);
  });

  socket.on('restartGame', () => {
    const r = rooms.get(rid); if (!r) return;
    if (r.hostId !== pid) return err('Только хост');
    if (r.phase !== 'gameEnd') return err('Игра не закончена');
    r.teamStep = [0, 0]; r.roundWins = [0, 0];
    r.roundHistory = []; r.playerStats = [0, 0, 0, 0];
    r.gameStartTime = Date.now(); r.winnerTeam = null;
    startRound(r, 0);
    broadcast(r);
  });

  socket.on('leaveRoom', () => {
    const r = rooms.get(rid); if (!r) return;
    const p = me(); if (!p) return;
    if (r.phase === 'lobby') {
      r.players = r.players.filter(x => x.id !== p.id);
      r.players.forEach((x, i) => { x.seat = i; x.team = teamOf(i); });
      if (!r.players.length) { rooms.delete(r.id); }
      else { if (r.hostId === p.id) r.hostId = r.players[0].id; broadcast(r); }
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
    pid = null; rid = null;
  });

  socket.on('attack', ({ cardIds }) => {
    const r = rooms.get(rid); if (!r || r.phase !== 'playing') return;
    const p = me(); if (!p || p.out) return;
    if (r.pendingPass || r.pendingSwap) return err('Ждём подтверждения');
    if (!cardIds?.length) return err('Не выбраны карты');
    const myDoc = docsOf(r)[p.team];
    for (const id of cardIds) {
      const c = p.hand.find(x => x.id === id);
      if (!c) return err('Карты нет в руке');
      if (c.r === myDoc) return err(`Своим документом (${myDoc}) нельзя`);
    }
    let defenderSeat;
    if (r.field) {
      const attacker = r.field.attacker, partnerSeat = partnerOf(attacker);
      if (p.seat !== attacker && p.seat !== partnerSeat) return err('Только атакующий или партнёр');
      if (r.field.passedSeats.includes(p.seat)) return err('Вы уже сказали «Хватит»');
      defenderSeat = r.field.defender;
    } else {
      if (r.turnSeat !== p.seat) return err('Не ваш ход');
      if (r.forcedTarget != null && r.players[r.forcedTarget] && !r.players[r.forcedTarget].out) {
        defenderSeat = r.forcedTarget;
      } else {
        defenderSeat = pickTarget(r, p.seat);
      }
      if (defenderSeat === null) return err('Некого атаковать');
      r.forcedTarget = null;
    }
    const defender = r.players[defenderSeat];
    if (!defender || defender.out) return err('Защитник недоступен');
    if (!defender.connected) return err(`⏳ ${defender.name} отошёл — ждём возвращения`);
    const current = r.field ? r.field.cards.length : 0;
    if (current + cardIds.length > MAX_ATTACK) return err(`Максимум ${MAX_ATTACK} карт`);
    if (!r.field) {
      r.field = { attacker: p.seat, defender: defenderSeat, cards: [], passedSeats: [] };
      r.lastAttacker = p.seat;
      r.lastTarget = defenderSeat;
    }
    for (const id of cardIds) {
      const idx = p.hand.findIndex(x => x.id === id);
      const c = p.hand.splice(idx, 1)[0];
      r.field.cards.push({ card: c, beatenBy: null, fromSeat: p.seat });
    }
    log(r, `${p.name} → ${cardIds.length} карт(ы) → ${defender.name}`);
    if (p.hand.length === 0) p.out = true;
    if (checkTeamExitWin(r)) return broadcast(r);
    broadcast(r);
  });

  socket.on('defend', ({ targetId, withId }) => {
    const r = rooms.get(rid); if (!r || !r.field) return;
    const p = me(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
    const entry = r.field.cards.find(x => x.card.id === targetId && !x.beatenBy);
    if (!entry) return err('Нет такой карты');
    const myDoc = docsOf(r)[p.team];
    if (entry.card.r === myDoc) return err('Нельзя бить свой документ — придётся поднять');
    const idx = p.hand.findIndex(c => c.id === withId);
    if (idx < 0) return err('Карты нет в руке');
    const wc = p.hand[idx];
    if (wc.r === myDoc && !isKozir(wc, r)) return err('Свой документ бьёт только козырем');
    if (!beats(wc, entry.card, r)) return err('Не бьёт');
    p.hand.splice(idx, 1);
    entry.beatenBy = wc;
    log(r, `${p.name} бьёт ${entry.card.r}${entry.card.s} → ${wc.r}${wc.s}`);
    broadcast(r);
  });

  socket.on('falsh', ({ cardId }) => {
    const r = rooms.get(rid); if (!r || !r.field) return;
    const p = me(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
    const idx = r.field.cards.findIndex(x => x.card.id === cardId && !x.beatenBy);
    if (idx < 0) return err('Эту карту нельзя вернуть');
    const entry = r.field.cards[idx];
    const card = entry.card;
    const owner = r.players[entry.fromSeat];  // ← возвращаем ИМЕННО тому, кто положил
    if (!owner) return err('Хозяин карты не найден');
    owner.hand.push(card);
    if (owner.out) owner.out = false;
    r.field.cards.splice(idx, 1);
    log(r, `${p.name} ФАЛЬШ → возврат ${owner.name}`);
    r.players.forEach(x => io.to(x.id).emit('falsh', { byName: p.name, targetName: owner.name, card: { r: card.r, s: card.s } }));
    if (r.field.cards.length === 0) {
      const attackerSeat = r.field.attacker;
      r.field = null;
      r.turnSeat = attackerSeat;
      r.forcedTarget = null;
    }
    broadcast(r);
  });

  socket.on('pickUp', () => {
    const r = rooms.get(rid); if (!r || !r.field) return;
    const p = me(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
    for (const e of r.field.cards) { p.hand.push(e.card); if (e.beatenBy) p.hand.push(e.beatenBy); }
    const attackerSeat = r.field.attacker;
    const defenderSeat = r.field.defender;
    r.field = null;
    const partnerSeat = partnerOf(attackerSeat);
    r.turnSeat = r.players[partnerSeat].out ? attackerSeat : partnerSeat;
    r.lastAttacker = attackerSeat; r.lastTarget = defenderSeat; r.forcedTarget = null;
    drawTo(r, attackerSeat);
    log(r, `${p.name} поднял. Ход у ${r.players[r.turnSeat].name}`);
    broadcast(r);
  });

  socket.on('endAttack', () => {
    const r = rooms.get(rid); if (!r || !r.field) return;
    const p = me(); if (!p) return;
    const attacker = r.field.attacker;
    const partnerSeat = partnerOf(attacker);
    if (p.seat !== attacker && p.seat !== partnerSeat) return err('Только атакующий или партнёр');
    if (r.field.passedSeats.includes(p.seat)) return;
    r.field.passedSeats.push(p.seat);
    log(r, `${p.name}: «Хватит!»`);
    broadcast(r);
  });

  socket.on('bito', () => {
    const r = rooms.get(rid); if (!r || !r.field) return;
    const p = me(); if (!p) return;
    if (r.field.defender !== p.seat) return err('Не вы защищаетесь');
    if (!bothPartnersPassed(r)) return err('Ждём «Хватит» от обоих атакующих');
    if (r.field.cards.some(x => !x.beatenBy)) return err('Не все карты отбиты');
    if (hasDefenderDoc(r)) return err('На столе ваш документ — нужно поднять');
    const attackerSeat = r.field.attacker;
    r.field = null;
    r.turnSeat = p.seat;
    r.forcedTarget = attackerSeat;
    r.lastAttacker = null; r.lastTarget = null;
    drawTo(r, attackerSeat);
    log(r, `${p.name}: «Бито!»`);
    broadcast(r);
  });

  socket.on('passDocsRequest', () => {
    const r = rooms.get(rid); if (!r || r.phase !== 'playing') return;
    const p = me(); if (!p || p.out) return;
    if (r.turnSeat !== p.seat) return err('Не ваш ход');
    if (r.pendingPass || r.pendingSwap) return err('Уже есть запрос');
    if (!onlyDocs(r, p)) return err('Передавать можно только если в руке ТОЛЬКО документы');
    if (partnerOut(r, p.seat)) return err('Партнёр вышел — передавать некому');
    r.pendingPass = { seat: p.seat, cards: p.hand.map(c => ({ ...c })) };
    log(r, `${p.name} показывает документы: ${p.hand.map(c => c.r + c.s).join(' ')}`);
    broadcast(r);
  });

  socket.on('passDocsConfirm', () => {
    const r = rooms.get(rid); if (!r || !r.pendingPass) return;
    const p = me(); if (!p) return;
    const requester = r.players[r.pendingPass.seat];
    if (!requester) return;
    if (p.team === requester.team) return err('Подтвердить может только противник');
    const partner = r.players[partnerOf(requester.seat)];
    partner.hand.push(...requester.hand);
    requester.hand = [];
    requester.out = true;
    log(r, `${p.name} подтвердил документы ${requester.name} → ${partner.name}`);
    r.pendingPass = null;
    r.turnSeat = partner.seat;
    r.forcedTarget = null; r.lastAttacker = null; r.lastTarget = null;
    if (checkTeamExitWin(r)) return broadcast(r);
    broadcast(r);
  });

  socket.on('passDocsCancel', () => {
    const r = rooms.get(rid); if (!r || !r.pendingPass) return;
    const p = me(); if (!p) return;
    const requester = r.players[r.pendingPass.seat];
    if (!requester) return;
    if (p.team === requester.team) return err('Отменить может только противник');
    r.pendingPass = null;
    broadcast(r);
  });

  socket.on('swapInitiate', () => {
    const r = rooms.get(rid); if (!r || r.phase !== 'playing') return;
    const p = me(); if (!p || p.out) return;
    if (r.turnSeat !== p.seat) return err('Не ваш ход');
    if (r.field) return err('Нельзя во время хода');
    if (r.pendingPass || r.pendingSwap) return err('Уже есть запрос');
    if (r.swapUsedByTeam[p.team]) return err('Своп уже использован');
    const partner = r.players[partnerOf(p.seat)];
    if (!partner || !partner.out) return err('Партнёр ещё в игре');
    r.pendingSwap = { stage: 'opponentConfirm', from: p.seat, to: partner.seat, cards: p.hand.map(c => ({ ...c })), team: p.team };
    log(r, `${p.name} хочет передать карты партнёру`);
    broadcast(r);
  });

  socket.on('swapAsk', () => {
    const r = rooms.get(rid); if (!r || r.phase !== 'playing') return;
    const p = me(); if (!p || !p.out) return err('Вы не вышли');
    if (r.pendingPass || r.pendingSwap) return err('Уже есть запрос');
    if (r.swapUsedByTeam[p.team]) return err('Своп уже использован');
    const partner = r.players[partnerOf(p.seat)];
    if (!partner || partner.out) return err('Партнёр тоже вышел');
    if (r.turnSeat !== partner.seat) return err('Сейчас не ход партнёра');
    if (r.field) return err('Нельзя во время хода');
    r.pendingSwap = { stage: 'partnerConfirm', from: p.seat, to: partner.seat, team: p.team };
    log(r, `${p.name} просит вернуть его в игру`);
    broadcast(r);
  });

  socket.on('swapAccept', () => {
    const r = rooms.get(rid); if (!r || !r.pendingSwap) return;
    const p = me(); if (!p) return;
    if (r.pendingSwap.stage !== 'partnerConfirm') return;
    if (r.pendingSwap.to !== p.seat) return err('Не вам решать');
    const outgoing = r.players[r.pendingSwap.from];
    r.pendingSwap = { stage: 'opponentConfirm', from: p.seat, to: outgoing.seat, cards: p.hand.map(c => ({ ...c })), team: p.team };
    broadcast(r);
  });

  socket.on('swapReject', () => {
    const r = rooms.get(rid); if (!r || !r.pendingSwap) return;
    const p = me(); if (!p) return;
    if (r.pendingSwap.stage !== 'partnerConfirm') return;
    if (r.pendingSwap.to !== p.seat) return err('Не вам решать');
    r.pendingSwap = null;
    broadcast(r);
  });

  socket.on('swapConfirm', () => {
    const r = rooms.get(rid); if (!r || !r.pendingSwap) return;
    const p = me(); if (!p) return;
    if (r.pendingSwap.stage !== 'opponentConfirm') return;
    if (p.team === r.pendingSwap.team) return err('Подтвердить может только противник');
    const fromPlayer = r.players[r.pendingSwap.from];
    const toPlayer = r.players[r.pendingSwap.to];
    toPlayer.hand.push(...fromPlayer.hand);
    fromPlayer.hand = [];
    fromPlayer.out = true;
    toPlayer.out = false;
    r.swapUsedByTeam[fromPlayer.team] = true;
    r.pendingSwap = null;
    r.turnSeat = toPlayer.seat;
    log(r, `${fromPlayer.name} ↔ ${toPlayer.name} — своп`);
    if (checkTeamExitWin(r)) return broadcast(r);
    broadcast(r);
  });

  socket.on('swapCancel', () => {
    const r = rooms.get(rid); if (!r || !r.pendingSwap) return;
    const p = me(); if (!p) return;
    if (r.pendingSwap.stage !== 'opponentConfirm') return;
    if (p.team === r.pendingSwap.team) return err('Отменить может только противник');
    r.pendingSwap = null;
    broadcast(r);
  });

  socket.on('throwDocs', () => {
    const r = rooms.get(rid); if (!r || r.phase !== 'playing') return;
    const p = me(); if (!p || p.out) return;
    if (r.turnSeat !== p.seat) return err('Не ваш ход');
    if (r.pendingPass || r.pendingSwap) return err('Ждём подтверждения');
    if (!onlyDocs(r, p)) return err('В руке есть обычные карты');
    if (!partnerOut(r, p.seat)) return err('Партнёр ещё в игре — сначала передайте ему документы');
    const shown = p.hand.map(c => c.r + c.s).join(' ');
    p.hand = []; p.out = true;
    log(r, `${p.name} бросает документы: ${shown}`);
    winByThrow(r, p.team, p.seat);
    broadcast(r);
  });

  socket.on('reaction', ({ emoji }) => {
    const r = rooms.get(rid); if (!r) return;
    const p = me(); if (!p) return;
    if (!EMOJIS.includes(emoji)) return;
    r.players.forEach(x => io.to(x.id).emit('reaction', { seat: p.seat, emoji }));
  });

  socket.on('disconnect', () => {
    const r = rooms.get(rid); if (!r) return;
    const p = r.players.find(x => x.id === pid);
    if (p) {
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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`\n✅ Сервер запущен: http://localhost:${PORT}\n`));
