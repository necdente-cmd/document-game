import { RV } from '../../constants.js';
import { beats, isKozir } from '../../utils.js';
import { cardValue, getDocs } from '../cards.js';
import { pDefenderBeats } from './probabilities.js';
import { shouldPlayAggressive } from './evaluate.js';

function blog(room, seat, msg) {
  console.log(`[${room.players[seat].name}] ${msg}`);
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

  const mustPickup = field.cards.some(e =>
    !e.beatenBy && (e.isForced || e.card.r === myDoc)
  );
  if (mustPickup) {
    blog(room, botSeat, 'Обязан поднять (форс/наш док)');
    return { action: 'pickUp' };
  }

  const targets = field.cards.filter(e =>
    !e.beatenBy && !e.isForced && e.card.r !== myDoc
  );
  if (targets.length === 0) return { action: 'pass' };

  const used = new Set();
  const planned = [];
  let totalCost = 0;
  let totalField = 0;
  let unbeatable = 0;

  for (const t of targets) {
    totalField += cardValue(t.card, room, botSeat);
    const availHand = bot.hand.filter(c => !used.has(c.id));
    const beat = findCheapestBeat(availHand, t.card, room, botSeat, myDoc);
    if (beat) {
      planned.push({ targetId: t.card.id, withId: beat.card.id });
      used.add(beat.card.id);
      totalCost += beat.val;
    } else {
      unbeatable++;
    }
  }

  if (unbeatable > 0) {
    const handLeft = bot.hand.length - planned.length;
    if (handLeft >= 3 && shouldPlayAggressive(room, botSeat) === false) {
      blog(room, botSeat, `Не могу побить ${unbeatable} — поднимаю`);
      return { action: 'pickUp' };
    }
    blog(room, botSeat, `Не могу побить ${unbeatable} — поднимаю (нет выбора)`);
    return { action: 'pickUp' };
  }

  const ratio = totalField > 0 ? totalCost / totalField : 1;
  const pos = shouldPlayAggressive(room, botSeat);

  const deckLeft = room.deck.length + (room.trumpCard ? 1 : 0);
  const endgameish = deckLeft <= 4;

  if (!pos && !endgameish && ratio > 1.5 && totalField < 60) {
    blog(room, botSeat,
      `Дорого (cost=${totalCost | 0} field=${totalField | 0} ratio=${ratio.toFixed(2)}) — поднимаю`);
    return { action: 'pickUp' };
  }

  blog(room, botSeat, `Отбиваю ${planned.length} карт(ы)`);
  return { action: 'defend', beats: planned };
}