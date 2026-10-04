import { RV, LADDERS } from '../constants.js';
import { beats, isKozir } from '../utils.js';

export { beats, isKozir };

export function getDocs(room) {
  const ladder = LADDERS[room.opts.docSet];
  return [ladder[room.teamStep[0]], ladder[room.teamStep[1]]];
}

export function isDoc(card, room, seat) {
  const team = room.players[seat].team;
  return card.r === getDocs(room)[team];
}

// Ценность карты 0..100. Дорогие — не отдавать без нужды.
export function cardValue(card, room, seat) {
  const rv = RV[card.r]; // 6..14
  let v = 10 + (rv - 6) * 8;               // 10..74
  if (isKozir(card, room)) v += 30 + (rv - 6) * 3; // козырь дорог
  if (isDoc(card, room, seat)) {
    v += isKozir(card, room) ? 25 : -15;   // козырный док бесценен, некозырный — балласт
  }
  return Math.max(0, Math.min(100, v));
}

// Сортировка по возрастанию ценности (дешевые первыми).
export function byValueAsc(cards, room, seat) {
  return [...cards].sort(
    (a, b) => cardValue(a, room, seat) - cardValue(b, room, seat)
  );
}

// Есть ли у защитника козырь, который бьёт заданную карту — грубая оценка.
// Используется Genius, Smart игнорирует.
export function likelyHasBeatingTrump(room, seat, card) {
  if (isKozir(card, room)) return false;
  const p = room.players[seat];
  const trumps = p.hand.filter(c => isKozir(c, room) && RV[c.r] > RV[card.r]);
  return trumps.length > 0;
}