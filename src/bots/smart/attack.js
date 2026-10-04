import { partnerOf } from '../../utils.js';
import { cardValue, getDocs, isKozir } from '../cards.js';

// Лог в едином формате: [Smart1] Скидываю 6♦ (val=12)
function blog(room, seat, msg) {
  const p = room.players[seat];
  console.log(`[${p.name}] ${msg}`);
}

/** Заход с чистой руки: одна младшая не-док карта. */
export function pickLeadCards(room, botSeat, memory, profile) {
  const bot = room.players[botSeat];
  const myDoc = getDocs(room)[bot.team];

  const cand = bot.hand.filter(c => c.r !== myDoc);
  if (cand.length === 0) return [];

  // Считаем «стоимость» каждой карты: цена + штраф за козырь.
  // Выбираем минимум, заходим одной картой (чтобы потом добрать такой же ранг).
  let best = null, bestScore = Infinity;
  for (const c of cand) {
    const v = cardValue(c, room, botSeat) + (isKozir(c, room) ? 40 : 0);
    if (v < bestScore) { bestScore = v; best = c; }
  }
  if (!best) return [];

  blog(room, botSeat, `Захожу ${best.r}${best.s} (val=${bestScore | 0})`);
  return [best.id];
}

/**
 * Добор карт к существующему столу.
 * Правило: только те ранги, что уже на столе, плюс док защитника (форс).
 */
export function pickExtraCards(room, botSeat, memory, profile) {
  if (!room.field) return [];
  const bot = room.players[botSeat];
  const docs = getDocs(room);
  const myDoc = docs[bot.team];
  const defender = room.players[room.field.defender];
  const defDoc = docs[defender.team];

  // Защитник уже сдался / просит ещё — добавлять карты бессмысленно,
  // они уедут к нему при подъёме.
  if (room.field.askMore || room.field.defenderGaveUp) return [];

  const space = room.field.limit - room.field.cards.length;
  if (space <= 0) return [];

  const ranksOnTable = new Set();
  for (const e of room.field.cards) {
    ranksOnTable.add(e.card.r);
    if (e.beatenBy) ranksOnTable.add(e.beatenBy.r);
  }

  // Кандидаты: в руке, не наш док, ранг совпадает (или док защитника — форс).
  const cand = bot.hand.filter(c => {
    if (c.r === myDoc) return false;
    if (c.r === defDoc && defDoc !== myDoc) return true; // форс-добор
    return ranksOnTable.has(c.r);
  });

  // Экономно: добавляем только дешёвые карты, чтобы не слить хорошие.
  const threshold = 40 + profile.attackThreshold * 30;
  const cheap = [];
  for (const c of cand) {
    if (cheap.length >= space) break;
    if (cardValue(c, room, botSeat) <= threshold) cheap.push(c);
  }

  // Если у защитника в руке мало карт — он вряд ли отобьётся, добавляем смелее.
  const defHand = defender.hand.length;
  const aggressive = defHand <= 2;

  const chosen = aggressive ? cand.slice(0, space) : cheap;
  if (chosen.length > 0) {
    blog(room, botSeat, `Подкидываю: ${chosen.map(c => c.r + c.s).join(' ')}`);
  }
  return chosen.map(c => c.id);
}