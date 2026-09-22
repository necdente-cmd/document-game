import { MAX_ATTACK, EMOJIS, SWAP_TIMEOUT_MS } from '../constants.js';
import {
  isKozir, beats, partnerOf, pickTarget, bothPartnersPassed,
} from '../utils.js';
import { docsOf, log, clearSwapTimer } from '../rooms.js';
import { drawTo } from './round.js';
import { winByThrow, checkTeamExitWin, onlyDocs, hasDefenderDoc } from './end.js';

export function registerGameHandlers(io, socket, ctx) {
  const { rooms, broadcast, getMe, getRid, err } = ctx;

  // ==================== АТАКА / ПОДКИДЫВАНИЕ ====================
  socket.on('attack', ({ cardIds }) => {
    const r = rooms.get(getRid()); if (!r || r.phase !== 'playing') return;
    const p = getMe(); if (!p || p.out) return;
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
      const attacker = r.field.attacker;
      const partnerSeat = partnerOf(attacker);
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

  // ==================== ЗАЩИТА ====================
  socket.on('defend', ({ targetId, withId }) => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
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

  // ==================== ФАЛЬШ ====================
  socket.on('falsh', ({ cardId }) => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
    if (r.pendingFalsh) return err('Уже есть запрос на фальш');
    const idx = r.field.cards.findIndex(x => x.card.id === cardId && !x.beatenBy);
    if (idx < 0) return err('Эту карту нельзя вернуть');
    const entry = r.field.cards[idx];
    const owner = r.players[entry.fromSeat];
    if (!owner) return err('Хозяин карты не найден');
    r.pendingFalsh = {
      cardId: entry.card.id,
      defender: p.seat,
      owner: entry.fromSeat,
    };
    log(r, `${p.name} требует фальш на ${entry.card.r}${entry.card.s} (хозяин ${owner.name})`);
    broadcast(r);
  });

  socket.on('falshAccept', () => {
    const r = rooms.get(getRid()); if (!r || !r.pendingFalsh) return;
    const p = getMe(); if (!p) return;
    if (p.seat !== r.pendingFalsh.owner) return err('Только хозяин карты решает');
    const cardId = r.pendingFalsh.cardId;
    const defenderSeat = r.pendingFalsh.defender;
    const idx = r.field.cards.findIndex(x => x.card.id === cardId && !x.beatenBy);
    if (idx < 0) { r.pendingFalsh = null; return broadcast(r); }
    const entry = r.field.cards[idx];
    const card = entry.card;
    const owner = r.players[entry.fromSeat];
    const defender = r.players[defenderSeat];
    owner.hand.push(card);
    if (owner.out) owner.out = false;
    r.field.cards.splice(idx, 1);
    r.pendingFalsh = null;
    r.players.forEach(x => io.to(x.id).emit('falsh', {
      byName: defender ? defender.name : '?',
      targetName: owner.name,
      card: { r: card.r, s: card.s },
    }));
    if (r.field.cards.length === 0) {
      const attackerSeat = r.field.attacker;
      r.field = null;
      r.turnSeat = attackerSeat;
      r.forcedTarget = null;
    }
    log(r, `${p.name} принял фальш → ${card.r}${card.s} уходит обратно`);
    broadcast(r);
  });

  socket.on('falshReject', () => {
    const r = rooms.get(getRid()); if (!r || !r.pendingFalsh) return;
    const p = getMe(); if (!p) return;
    if (p.seat !== r.pendingFalsh.owner) return err('Только хозяин карты решает');
    log(r, `${p.name} отказал в фальше`);
    r.pendingFalsh = null;
    broadcast(r);
  });

  // ==================== ПОДНЯТЬ ВСЁ ====================
  socket.on('pickUp', () => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
    for (const e of r.field.cards) {
      p.hand.push(e.card);
      if (e.beatenBy) p.hand.push(e.beatenBy);
    }
    const attackerSeat = r.field.attacker;
    const defenderSeat = r.field.defender;
    r.field = null;
    const partnerSeat = partnerOf(attackerSeat);
    r.turnSeat = r.players[partnerSeat].out ? attackerSeat : partnerSeat;
    r.lastAttacker = attackerSeat;
    r.lastTarget = defenderSeat;
    r.forcedTarget = null;
    drawTo(r, attackerSeat);
    log(r, `${p.name} поднял. Ход у ${r.players[r.turnSeat].name}`);
    broadcast(r);
  });

  // ==================== ХВАТИТ ====================
  socket.on('endAttack', () => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p) return;
    const attacker = r.field.attacker;
    const partnerSeat = partnerOf(attacker);
    if (p.seat !== attacker && p.seat !== partnerSeat) return err('Только атакующий или партнёр');
    if (r.field.passedSeats.includes(p.seat)) return;
    r.field.passedSeats.push(p.seat);
    log(r, `${p.name}: «Хватит!»`);
    broadcast(r);
  });

  // ==================== БИТО ====================
  socket.on('bito', () => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p) return;
    if (r.field.defender !== p.seat) return err('Не вы защищаетесь');
    if (!bothPartnersPassed(r)) return err('Ждём «Хватит» от обоих атакующих');
    if (r.field.cards.some(x => !x.beatenBy)) return err('Не все карты отбиты');
    if (hasDefenderDoc(r)) return err('На столе ваш документ — нужно поднять');
    const attackerSeat = r.field.attacker;
    r.field = null;
    r.turnSeat = p.seat;
    r.forcedTarget = attackerSeat;
    r.lastAttacker = null;
    r.lastTarget = null;
    drawTo(r, attackerSeat);
    log(r, `${p.name}: «Бито!»`);
    broadcast(r);
  });

  // ==================== ПЕРЕДАЧА ДОКУМЕНТОВ ====================
  socket.on('passDocsRequest', () => {
    const r = rooms.get(getRid()); if (!r || r.phase !== 'playing') return;
    const p = getMe(); if (!p || p.out) return;
    if (r.turnSeat !== p.seat) return err('Не ваш ход');
    if (r.pendingPass || r.pendingSwap) return err('Уже есть запрос');
    if (!onlyDocs(r, p)) return err('Передавать можно только если в руке ТОЛЬКО документы');
    const partner = r.players[partnerOf(p.seat)];
    if (!partner || partner.out) return err('Партнёр вышел — передавать некому');
    r.pendingPass = { seat: p.seat, cards: p.hand.map(c => ({ ...c })) };
    log(r, `${p.name} показывает документы: ${p.hand.map(c => c.r + c.s).join(' ')}`);
    broadcast(r);
  });

  socket.on('passDocsConfirm', () => {
    const r = rooms.get(getRid()); if (!r || !r.pendingPass) return;
    const p = getMe(); if (!p) return;
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
    r.forcedTarget = null;
    r.lastAttacker = null;
    r.lastTarget = null;
    if (checkTeamExitWin(r)) return broadcast(r);
    broadcast(r);
  });

  socket.on('passDocsCancel', () => {
    const r = rooms.get(getRid()); if (!r || !r.pendingPass) return;
    const p = getMe(); if (!p) return;
    const requester = r.players[r.pendingPass.seat];
    if (!requester) return;
    if (p.team === requester.team) return err('Отменить может только противник');
    r.pendingPass = null;
    broadcast(r);
  });

  // ==================== СВОП ====================
  socket.on('swapInitiate', () => {
    const r = rooms.get(getRid()); if (!r || r.phase !== 'playing') return;
    const p = getMe(); if (!p || p.out) return;
    if (r.turnSeat !== p.seat) return err('Не ваш ход');
    if (r.field) return err('Нельзя во время хода');
    if (r.pendingPass || r.pendingSwap) return err('Уже есть запрос');
    if (r.swapUsedByTeam[p.team]) return err('Своп уже использован');
    const partner = r.players[partnerOf(p.seat)];
    if (!partner || !partner.out) return err('Партнёр ещё в игре');
    r.pendingSwap = {
      stage: 'opponentConfirm',
      from: p.seat,
      to: partner.seat,
      cards: p.hand.map(c => ({ ...c })),
      team: p.team,
    };
    clearSwapTimer(r);
    r.swapTimer = setTimeout(() => {
      const room = rooms.get(r.id);
      if (!room || !room.pendingSwap) return;
      room.pendingSwap = null;
      log(room, `⏱ Своп отменён по таймауту (60с)`);
      broadcast(room);
    }, SWAP_TIMEOUT_MS);
    log(r, `${p.name} инициирует своп с партнёром`);
    broadcast(r);
  });

  socket.on('swapAsk', () => {
    const r = rooms.get(getRid()); if (!r || r.phase !== 'playing') return;
    const p = getMe(); if (!p || !p.out) return err('Вы не вышли');
    if (r.pendingPass || r.pendingSwap) return err('Уже есть запрос');
    if (r.swapUsedByTeam[p.team]) return err('Своп уже использован');
    const partner = r.players[partnerOf(p.seat)];
    if (!partner || partner.out) return err('Партнёр тоже вышел');
    if (r.turnSeat !== partner.seat) return err('Сейчас не ход партнёра');
    if (r.field) return err('Нельзя во время хода');
    r.pendingSwap = {
      stage: 'partnerConfirm',
      from: p.seat,
      to: partner.seat,
      team: p.team,
    };
    clearSwapTimer(r);
    r.swapTimer = setTimeout(() => {
      const room = rooms.get(r.id);
      if (!room || !room.pendingSwap) return;
      room.pendingSwap = null;
      log(room, `⏱ Запрос на своп отменён по таймауту (60с)`);
      broadcast(room);
    }, SWAP_TIMEOUT_MS);
    log(r, `${p.name} просит вернуть его в игру`);
    broadcast(r);
  });

  socket.on('swapAccept', () => {
    const r = rooms.get(getRid()); if (!r || !r.pendingSwap) return;
    const p = getMe(); if (!p) return;
    if (r.pendingSwap.stage !== 'partnerConfirm') return;
    if (r.pendingSwap.to !== p.seat) return err('Не вам решать');
    const outgoing = r.players[r.pendingSwap.from];
    r.pendingSwap = {
      stage: 'opponentConfirm',
      from: p.seat,
      to: outgoing.seat,
      cards: p.hand.map(c => ({ ...c })),
      team: p.team,
    };
    log(r, `${p.name} согласен вернуть партнёра`);
    broadcast(r);
  });

  socket.on('swapReject', () => {
    const r = rooms.get(getRid()); if (!r || !r.pendingSwap) return;
    const p = getMe(); if (!p) return;
    if (r.pendingSwap.stage !== 'partnerConfirm') return;
    if (r.pendingSwap.to !== p.seat) return err('Не вам решать');
    log(r, `${p.name} отказался возвращать партнёра`);
    clearSwapTimer(r);
    r.pendingSwap = null;
    broadcast(r);
  });

  socket.on('swapConfirm', () => {
    const r = rooms.get(getRid()); if (!r || !r.pendingSwap) return;
    const p = getMe(); if (!p) return;
    if (r.pendingSwap.stage !== 'opponentConfirm') return;
    if (p.team === r.pendingSwap.team) return err('Подтвердить может только противник');
    clearSwapTimer(r);
    const fromPlayer = r.players[r.pendingSwap.from];
    const toPlayer = r.players[r.pendingSwap.to];
    toPlayer.hand.push(...fromPlayer.hand);
    fromPlayer.hand = [];
    fromPlayer.out = true;
    toPlayer.out = false;
    r.swapUsedByTeam[fromPlayer.team] = true;
    r.pendingSwap = null;
    r.turnSeat = toPlayer.seat;
    log(r, `${fromPlayer.name} ↔ ${toPlayer.name} — своп завершён`);
    if (checkTeamExitWin(r)) return broadcast(r);
    broadcast(r);
  });

  // ==================== БРОСОК ДОКУМЕНТОВ ====================
  socket.on('throwDocs', () => {
    const r = rooms.get(getRid()); if (!r || r.phase !== 'playing') return;
    const p = getMe(); if (!p || p.out) return;
    if (r.turnSeat !== p.seat) return err('Не ваш ход');
    if (r.pendingPass || r.pendingSwap) return err('Ждём подтверждения');
    if (!onlyDocs(r, p)) return err('В руке есть обычные карты');
    const partner = r.players[partnerOf(p.seat)];
    if (partner && !partner.out) return err('Партнёр ещё в игре — сначала передайте ему документы');
    const shown = p.hand.map(c => c.r + c.s).join(' ');
    p.hand = [];
    p.out = true;
    log(r, `${p.name} бросает документы: ${shown}`);
    winByThrow(r, p.team, p.seat);
    broadcast(r);
  });

  // ==================== ЧАТ ====================
  socket.on('chat', ({ text }) => {
    const r = rooms.get(getRid()); if (!r) return;
    const p = getMe(); if (!p) return;
    if (typeof text !== 'string') return;
    const clean = text.trim().slice(0, 200);
    if (!clean) return;
    const msg = { seat: p.seat, name: p.name, text: clean, time: Date.now() };
    io.to(r.id).emit('chat', msg);
  });

  // ==================== ЭМОДЗИ ====================
  socket.on('reaction', ({ emoji }) => {
    const r = rooms.get(getRid()); if (!r) return;
    const p = getMe(); if (!p) return;
    if (!EMOJIS.includes(emoji)) return;
    r.players.forEach(x => io.to(x.id).emit('reaction', { seat: p.seat, emoji }));
  });
}