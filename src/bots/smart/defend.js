import { beats } from '../../utils.js';
import { cardValue, getDocs, isKozir } from '../cards.js';

function blog(room, seat, msg) {
  const p = room.players[seat];
  console.log(`[${p.name}] ${msg}`);
}

/**
 * Решение защитника:
 *  - { action: 'pickUp' }
 *  - { action: 'defend', beats: [{ targetId, withId }, ...] }
 *  - { action: 'askMore' }  // зарезервировано, пока не используем
 */
export function defendDecision(room, botSeat, memory, profile) {
  const bot = room.players[botSeat];
  const myDoc = getDocs(room)[bot.team];
  const field = room.field;

  // Обязательный подъём: форс-карта или наш док на столе.
  const mustPickup = field.cards.some(e =>
    !e.beatenBy && (e.isForced || e.card.r === myDoc)
  );
  if (mustPickup) {
    blog(room, botSeat, 'Обязан поднять (форс/наш док)');
    return { action: 'pickUp' };
  }

  // Отбиваем только то, что разрешено (не форс, не наш док).
  const targets = field.cards.filter(e =>
    !e.beatenBy && !e.isForced && e.card.r !== myDoc
  );

  if (targets.length === 0) {
    // Всё уже отбито — нечего делать.
    return { action: 'pass' };
  }

  const used = new Set();
  const planned = [];
  let totalCost = 0;
  let totalField = 0;
  let unbeatable = 0;

  for (const t of targets) {
    totalField += cardValue(t.card, room, botSeat);

    let best = null, bestV = Infinity;
    for (const c of bot.hand) {
      if (used.has(c.id)) continue;
      // Свой некозырный док бить нельзя.
      if (c.r === myDoc && !isKozir(c, room)) continue;
      if (!beats(c, t.card, room)) continue;
      const v = cardValue(c, room, botSeat);
      if (v < bestV) { bestV = v; best = c; }
    }

    if (best) {
      planned.push({ targetId: t.card.id, withId: best.id });
      used.add(best.id);
      totalCost += bestV;
    } else {
      unbeatable++;
    }
  }

  // Что-то не бьётся — поднимаем (Smart не умеет askMore).
  if (unbeatable > 0) {
    blog(room, botSeat, `Не могу побить ${unbeatable} карт(ы) — поднимаю`);
    return { action: 'pickUp' };
  }

  // Всё бьётся. Решаем по цене.
  // Агрессивный — бьёт даже дорого. Осторожный — поднимает, если дорого.
  const ratio = totalField > 0 ? totalCost / totalField : 1;
  const limit = 1 + profile.defendThreshold; // 1.3..1.75
  if (ratio > limit && totalField < 50) {
    blog(room, botSeat,
      `Дорого отбиваться (cost=${totalCost | 0}, field=${totalField | 0}) — поднимаю`);
    return { action: 'pickUp' };
  }

  blog(room, botSeat, `Отбиваю ${planned.length} карт(ы)`);
  return { action: 'defend', beats: planned };
}