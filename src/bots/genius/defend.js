import { RV } from '../../constants.js';
import { beats, isKozir } from '../../utils.js';
import { cardValue, getDocs } from '../cards.js';
import { shouldPlayAggressive } from './evaluate.js';
import { log as rlog } from '../../rooms.js';

function blog(room, seat, msg) {
  const name = room.players[seat]?.name || `seat${seat}`;
  rlog(room, `[${name}] ${msg}`);
}

function isExpensiveTrump(card, room) {
  return isKozir(card, room) && RV[card.r] >= RV['Q'];
}

function isMidTrump(card, room) {
  const rv = RV[card.r];
  return isKozir(card, room) && rv >= RV['9'] && rv < RV['Q'];
}

function findCheapestBeat(hand, card, room, botSeat, myDoc) {
  let best = null, bestVal = Infinity;
  for (const c of hand) {
    if (c.r === myDoc && !isKozir(c, room)) continue;
    if (!beats(c, card, room)) continue;
    const v = cardValue(c, room, botSeat);
    if (v < bestVal) { bestVal = v; best = c; }
  }
  return best ? { card: best, val: bestVal } : null;
}

export function defendDecision(room, botSeat, memory, profile) {
  const bot = room.players[botSeat];
  const myDoc = getDocs(room)[bot.team];
  const field = room.field;

  // 1. Обязательный подъём
  const mustPickup = field.cards.some(e =>
    !e.beatenBy && (e.isForced || e.card.r === myDoc)
  );
  if (mustPickup) {
    blog(room, botSeat, 'Обязан поднять (форс/наш док на столе)');
    return { action: 'pickUp' };
  }

  const targets = field.cards.filter(e =>
    !e.beatenBy && !e.isForced && e.card.r !== myDoc
  );
  if (targets.length === 0) return { action: 'pass' };

  const deckLeft = room.deck.length + (room.trumpCard ? 1 : 0);
  const endgameish = deckLeft <= 6;
  const handSize = bot.hand.length;
  const veryEarly = deckLeft >= 20;

  const used = new Set();
  const planned = [];
  let totalCost = 0;
  let totalField = 0;
  let unbeatable = 0;
  let usesExpensiveTrump = false;
  let usesMidTrump = false;

  for (const t of targets) {
    totalField += cardValue(t.card, room, botSeat);
    const availHand = bot.hand.filter(c => !used.has(c.id));
    const beat = findCheapestBeat(availHand, t.card, room, botSeat, myDoc);
    if (beat) {
      planned.push({ targetId: t.card.id, withId: beat.card.id });
      used.add(beat.card.id);
      totalCost += beat.val;
      if (isExpensiveTrump(beat.card, room)) usesExpensiveTrump = true;
      if (isMidTrump(beat.card, room)) usesMidTrump = true;
    } else {
      unbeatable++;
    }
  }

  // 2. Не всё бьётся — поднимаем
  if (unbeatable > 0) {
    blog(room, botSeat, `Не могу побить ${unbeatable} — поднимаю`);
    return { action: 'pickUp' };
  }

  const ratio = totalField > 0 ? totalCost / totalField : 1;
  const pos = shouldPlayAggressive(room, botSeat);

  // ==================== 🔒 Q/K/A КОЗЫРИ ====================
  if (usesExpensiveTrump) {
    // Не тратим Q/K/A козырь в начале/середине партии, если поле < 50
    if (!endgameish && totalField < 50) {
      blog(room, botSeat, `Q/K/A козырь — поле мало (field=${totalField|0}) — поднимаю`);
      return { action: 'pickUp' };
    }
    blog(room, botSeat, `Q/K/A козырь оправдан (field=${totalField|0})`);
  }

  // ==================== 🔓 СРЕДНИЕ КОЗЫРИ (9/10/J) ====================
  if (usesMidTrump) {
    if (totalField < 15 && handSize <= 3) {
      blog(room, botSeat, `Средний козырь за мусор (${totalField|0}) — поднимаю`);
      return { action: 'pickUp' };
    }
    if (veryEarly && handSize <= 3 && ratio > 3.0) {
      blog(room, botSeat, `Средний козырь дорого рано (ratio=${ratio.toFixed(2)}) — поднимаю`);
      return { action: 'pickUp' };
    }
  }

  // ==================== Общая проверка ====================
  if (handSize <= 2 && ratio > 3.0) {
    blog(room, botSeat, `Очень дорого (ratio=${ratio.toFixed(2)}, hand=${handSize}) — поднимаю`);
    return { action: 'pickUp' };
  }
  if (handSize <= 3 && ratio > 2.5 && totalField < 25) {
    blog(room, botSeat, `Дорого для ${handSize} карт (ratio=${ratio.toFixed(2)}) — поднимаю`);
    return { action: 'pickUp' };
  }
  if (targets.length >= 3 && ratio > 2.0) {
    blog(room, botSeat, `Много карт (${targets.length}) + дорого — поднимаю`);
    return { action: 'pickUp' };
  }

  blog(room, botSeat, `Отбиваю ${planned.length} карт(ы)`);
  return { action: 'defend', beats: planned };
}