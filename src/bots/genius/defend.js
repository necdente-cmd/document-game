import { RV } from '../../constants.js';
import { beats, isKozir } from '../../utils.js';
import { cardValue, getDocs } from '../cards.js';
import { pDefenderBeats } from './probabilities.js';
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
    if (c.r === myDoc) continue; // свой док не трогаем
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
  const endgameish = deckLeft <= 4;
  const criticalHand = bot.hand.length <= 2;

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

  if (unbeatable > 0) {
    blog(room, botSeat, `Не могу побить ${unbeatable} — поднимаю`);
    return { action: 'pickUp' };
  }

  // 🔒 Q/K/A козыри
  if (usesExpensiveTrump) {
    if (!endgameish && !criticalHand) {
      blog(room, botSeat, `Жалко дорогой козырь (Q/K/A) за ${totalField|0} — поднимаю`);
      return { action: 'pickUp' };
    }
    if (endgameish && totalField < 40 && !criticalHand) {
      blog(room, botSeat, `Козырь Q/K/A дороже поля (${totalField|0}) — поднимаю`);
      return { action: 'pickUp' };
    }
  }

  // 🔒 9/10/J козыри
  if (usesMidTrump && !endgameish && !criticalHand) {
    const midRatio = totalField > 0 ? totalCost / totalField : 1;
    if (midRatio > 1.4) {
      blog(room, botSeat, `Средний козырь за ${totalField|0} — дорого, поднимаю`);
      return { action: 'pickUp' };
    }
  }

  const ratio = totalField > 0 ? totalCost / totalField : 1;
  const pos = shouldPlayAggressive(room, botSeat);

  if (!pos && !endgameish && ratio > 1.6 && totalField < 60) {
    blog(room, botSeat,
      `Дорого (cost=${totalCost | 0} field=${totalField | 0} ratio=${ratio.toFixed(2)}) — поднимаю`);
    return { action: 'pickUp' };
  }

  blog(room, botSeat, `Отбиваю ${planned.length} карт(ы)`);
  return { action: 'defend', beats: planned };
}