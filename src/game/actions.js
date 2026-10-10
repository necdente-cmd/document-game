import { MAX_ATTACK, EMOJIS, SWAP_TIMEOUT_MS, LADDERS } from '../constants.js';
import {
  isKozir, beats, partnerOf, bothPartnersPassed, teamOf,
  playerAtSlot, nextActiveSlot,
} from '../utils.js';
import { docsOf, log, clearSwapTimer } from '../rooms.js';
import { drawTo } from './round.js';
import { winByThrow, checkTeamExitWin, onlyDocs, hasDefenderDoc } from './end.js';
import { getMode } from './modes/index.js';
import { notePlayed } from '../bots/memory.js';

export function registerGameHandlers(io, socket, ctx) {
  const { rooms, broadcast, getMe, getRid, err } = ctx;

  // ==================== АТАКА ====================
  socket.on('attack', ({ cardIds }) => {
    const r = rooms.get(getRid()); if (!r || r.phase !== 'playing') return;
    const p = getMe(); if (!p || p.out) return;
    if (r.pendingPass || r.pendingSwap) return err('Ждём подтверждения');
    if (!cardIds?.length) return err('Не выбраны карты');

    const mode = getMode(r);
    const myDoc = docsOf(r)[p.team];

    let defenderSeat, isFirstAttack = false, attackerSlot, defenderSlot;

    if (r.field) {
      const attacker = r.field.attacker;
      const partnerSeat = partnerOf(attacker);
      if (p.seat !== attacker && p.seat !== partnerSeat) return err('Только атакующий или партнёр');
      if (r.field.passedSeats.includes(p.seat)) return err('Вы уже сказали «Пас»');
      defenderSeat = r.field.defender;
      attackerSlot = r.field.attackerSlot;
      defenderSlot = r.field.defenderSlot;
    } else {
      isFirstAttack = true;
      if (r.turnSeat !== p.seat) return err('Не ваш ход');

      if (r.forcedAttackerSlot != null) {
        attackerSlot = r.forcedAttackerSlot;
        r.forcedAttackerSlot = null;
      } else {
        attackerSlot = mode.getAttackerSlot(r, p.seat);
      }

      if (r.forcedTarget != null) {
        defenderSlot = r.forcedTarget;
        r.forcedTarget = null;
      } else {
        defenderSlot = nextActiveSlot(r, attackerSlot, p.seat);
      }

      const defCheck = defenderSlot != null ? playerAtSlot(r, defenderSlot) : null;
      if (defCheck && defCheck.seat === p.seat) {
        defenderSlot = nextActiveSlot(r, defenderSlot, p.seat);
      }

      if (defenderSlot == null) return err('Некого атаковать');
      const defPlayer = playerAtSlot(r, defenderSlot);
      if (!defPlayer) return err('Некого атаковать');
      defenderSeat = defPlayer.seat;

      r.teamPairLastSlot[p.team] = attackerSlot;
      r.teamLastTargetSlot[p.team] = defenderSlot;
      r.lastAttacker = p.seat;
      r.lastTarget = defenderSeat;
    }

    const defender = r.players[defenderSeat];
    if (!defender || defender.out) return err('Защитник недоступен');
    if (!defender.connected) return err(`⏳ ${defender.name} отошёл — ждём возвращения`);

    const defenderDoc = docsOf(r)[defender.team];

    const ranksOnTable = new Set();
    if (r.field) {
      for (const e of r.field.cards) {
        ranksOnTable.add(e.card.r);
        if (e.beatenBy) ranksOnTable.add(e.beatenBy.r);
      }
    }

    const ladder = LADDERS[r.opts.docSet];
    const myDocIdx = ladder.indexOf(myDoc);
    const defDocIdx = ladder.indexOf(defenderDoc);
    const canForceDoc = myDocIdx > defDocIdx;

    for (const id of cardIds) {
      const c = p.hand.find(x => x.id === id);
      if (!c) return err('Карты нет в руке');
      if (c.r === myDoc) return err(`Своим документом (${myDoc}) нельзя`);
      if (!isFirstAttack) {
        const isForced = canForceDoc && (c.r === defenderDoc);
        if (!isForced && !ranksOnTable.has(c.r)) {
          const allowed = [...ranksOnTable];
          const extra = (canForceDoc && !ranksOnTable.has(defenderDoc))
            ? ` или ${defenderDoc} (навязанный)` : '';
          return err(`Можно подкидывать только: ${allowed.join(', ')}${extra}`);
        }
      }
    }

    if (isFirstAttack && cardIds.length > 1) {
      const ranks = new Set();
      for (const id of cardIds) {
        const c = p.hand.find(x => x.id === id);
        if (c) ranks.add(c.r);
      }
      if (ranks.size > 1) return err('При первой атаке можно заходить только картами одного ранга');
    }

    const current = r.field ? r.field.cards.length : 0;
    const limit = r.field ? r.field.limit : Math.min(defender.hand.length, MAX_ATTACK);
    if (current + cardIds.length > limit) {
      return err(`Максимум ${limit} карт — не поместится в руках защитника`);
    }

    if (!r.field) {
      r.field = {
        attacker: p.seat,
        attackerSlot,
        defender: defenderSeat,
        defenderSlot,
        cards: [],
        passedSeats: [],
        limit: Math.min(defender.hand.length, MAX_ATTACK),
        askMore: false,
        defenderGaveUp: false,
      };
    }

    for (const id of cardIds) {
      const idx = p.hand.findIndex(x => x.id === id);
      const c = p.hand.splice(idx, 1)[0];
      const isForced = (c.r === defenderDoc);
      r.field.cards.push({ card: c, beatenBy: null, fromSeat: p.seat, isForced });
      notePlayed(r, c);
    }

    log(r, `${p.name} (слот ${attackerSlot}) → ${cardIds.length} карт(ы) → ${defender.name}`);
    broadcast(r);
  });

  // ==================== ЗАЩИТА ====================
  socket.on('defend', ({ targetId, withId }) => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
    const entry = r.field.cards.find(x => x.card.id === targetId && !x.beatenBy);
    if (!entry) return err('Нет такой карты');
    if (entry.isForced) return err('Это ваш документ — нужно поднять всё');
    const myDoc = docsOf(r)[p.team];
    if (entry.card.r === myDoc) return err('Нельзя бить свой документ — придётся поднять');
    const idx = p.hand.findIndex(c => c.id === withId);
    if (idx < 0) return err('Карты нет в руке');
    const wc = p.hand[idx];
    if (wc.r === myDoc && !isKozir(wc, r)) return err('Свой документ бьёт только козырем');
    if (!beats(wc, entry.card, r)) return err('Не бьёт');
    p.hand.splice(idx, 1);
    entry.beatenBy = wc;
    notePlayed(r, wc);
    log(r, `${p.name} бьёт ${entry.card.r}${entry.card.s} → ${wc.r}${wc.s}`);
    broadcast(r);
  });

  // ==================== ВДОГОНКУ ====================
  socket.on('askMore', () => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
    if (r.field.askMore) return;
    if (!r.field.cards.some(x => !x.beatenBy)) return err('Все карты уже побиты');
    r.field.askMore = true;
    log(r, `${p.name}: «Вдогонку?»`);
    if (bothPartnersPassed(r)) {
      performPickup(r, r.players[r.field.defender], r.field.attacker, r.field.defender);
      if (checkTeamExitWin(r)) return broadcast(r);
      return broadcast(r);
    }
    broadcast(r);
  });

  // ==================== ПОДНЯТЬ ====================
  function performPickup(r, defender, attackerSeat, defenderSeat) {
    for (const e of r.field.cards) {
      defender.hand.push(e.card);
      if (e.beatenBy) defender.hand.push(e.beatenBy);
    }
    r.field = null;

    const mode = getMode(r);
    const next = mode.afterPickup(r, defenderSeat, attackerSeat);
    if (next) {
      r.turnSeat = next.turnSeat;
      r.forcedTarget = next.targetSlot;
      r.lastAttacker = attackerSeat;
      r.lastTarget = defenderSeat;
    } else {
      const partnerSeat = partnerOf(attackerSeat);
      r.turnSeat = partnerSeat;
      r.forcedTarget = null;
    }

    drawTo(r, attackerSeat);
    log(r, `${defender.name} поднял. Ход у ${r.players[r.turnSeat].name}`);
  }

  socket.on('pickUp', () => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p || r.field.defender !== p.seat) return err('Не вы защищаетесь');
    if (r.field.defenderGaveUp) return;
    r.field.defenderGaveUp = true;
    log(r, `${p.name}: «Поднимаю» — ждём пас атакующих`);
    if (bothPartnersPassed(r)) {
      performPickup(r, p, r.field.attacker, r.field.defender);
      if (checkTeamExitWin(r)) return broadcast(r);
      return broadcast(r);
    }
    broadcast(r);
  });

  // ==================== ПАС ====================
  socket.on('endAttack', () => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p) return;
    const attacker = r.field.attacker;
    const partnerSeat = partnerOf(attacker);
    if (p.seat !== attacker && p.seat !== partnerSeat) return err('Только атакующий или партнёр');
    if (r.field.passedSeats.includes(p.seat)) return;
    r.field.passedSeats.push(p.seat);
    log(r, `${p.name}: «Пас»`);
    if ((r.field.askMore || r.field.defenderGaveUp) && bothPartnersPassed(r)) {
      performPickup(r, r.players[r.field.defender], r.field.attacker, r.field.defender);
      if (checkTeamExitWin(r)) return broadcast(r);
      return broadcast(r);
    }
    broadcast(r);
  });

  // ==================== БИТО ====================
  socket.on('bito', () => {
    const r = rooms.get(getRid()); if (!r || !r.field) return;
    const p = getMe(); if (!p) return;
    if (r.field.defender !== p.seat) return err('Не вы защищаетесь');
    if (!bothPartnersPassed(r)) return err('Ждём «Пас» от обоих атакующих');
    if (r.field.cards.some(x => !x.beatenBy)) return err('Не все карты отбиты');
    if (hasDefenderDoc(r)) return err('На столе ваш документ — нужно поднять');

    const attackerSeat = r.field.attacker;
    const defenderSlot = r.field.defenderSlot;

    r.field = null;

    if (p.hand.length === 0) p.out = true;

    const mode = getMode(r);
    const next = mode.afterBito(r, p, defenderSlot, attackerSeat);

    if (!next) {
      log(r, `${p.name}: «Бито!» (никого не осталось)`);
      if (checkTeamExitWin(r)) return broadcast(r);
      return broadcast(r);
    }

    r.turnSeat = next.turnSeat;
    r.forcedAttackerSlot = next.attackerSlot;
    r.forcedTarget = next.targetSlot;
    r.teamPairLastSlot[teamOf(next.turnSeat)] = next.attackerSlot;
    if (next.targetSlot != null) {
      r.teamLastTargetSlot[teamOf(next.turnSeat)] = next.targetSlot;
    }

    const contrInfo = next.isContrAttack ? ' (контратака)' : '';
    drawTo(r, attackerSeat);
    log(r, `${p.name}: «Бито!» Ход у ${r.players[r.turnSeat].name}${contrInfo}`);
    if (checkTeamExitWin(r)) return broadcast(r);
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
    r.forcedAttackerSlot = requester.seat;
    r.forcedTarget = nextActiveSlot(r, requester.seat, partner.seat);
    r.lastAttacker = null;
    r.lastTarget = null;
    r.lastDuelPair = null;

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
      stage: 'opponentConfirm', from: p.seat, to: partner.seat,
      cards: p.hand.map(c => ({ ...c })), team: p.team,
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
    r.pendingSwap = { stage: 'partnerConfirm', from: p.seat, to: partner.seat, team: p.team };
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
      stage: 'opponentConfirm', from: p.seat, to: outgoing.seat,
      cards: p.hand.map(c => ({ ...c })), team: p.team,
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

    const fromPlayer = r.players[r.pendingSwap.from];
    const toPlayer = r.players[r.pendingSwap.to];

    clearSwapTimer(r);
    toPlayer.hand.push(...fromPlayer.hand);
    fromPlayer.hand = [];
    fromPlayer.out = true;
    toPlayer.out = false;
    r.swapUsedByTeam[fromPlayer.team] = true;
    r.pendingSwap = null;
    r.turnSeat = toPlayer.seat;
    r.forcedAttackerSlot = toPlayer.seat;
    r.forcedTarget = nextActiveSlot(r, toPlayer.seat, toPlayer.seat);
    r.lastDuelPair = null;
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
    io.to(r.id).emit('chat', { seat: p.seat, name: p.name, text: clean, time: Date.now() });
  });

  // ==================== ЭМОДЗИ ====================
  socket.on('reaction', ({ emoji }) => {
    const r = rooms.get(getRid()); if (!r) return;
    const p = getMe(); if (!p) return;
    if (!EMOJIS.includes(emoji)) return;
    r.players.forEach(x => io.to(x.id).emit('reaction', { seat: p.seat, emoji }));
  });
}