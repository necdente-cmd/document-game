import { RV } from '../../constants.js';
import { cardValue, getDocs, isKozir } from '../cards.js';
import { partnerOf } from '../../utils.js';

// ==================== СИЛА РУКИ ====================
export function handStrength(hand, room, seat) {
  if (!hand.length) return 0;
  let sum = 0;
  for (const c of hand) sum += cardValue(c, room, seat);
  const avg = sum / hand.length;
  // Штраф за количество: больше карт = больше возможностей, но не главное
  const density = Math.min(1, hand.length / 6);
  return Math.round(avg * (0.6 + 0.4 * density));
}

// ==================== КОНТРОЛЬ ====================
// Сколько «старших» карт — гарантия взять кон
export function controlScore(hand, room, seat) {
  let score = 0;
  const trumps = hand.filter(c => isKozir(c, room));
  for (const c of trumps) {
    if (RV[c.r] >= RV['Q']) score += 2;   // Q, K, A козыри
    else if (RV[c.r] >= RV['9']) score += 1;
  }
  const aces = hand.filter(c => c.r === 'A' && !isKozir(c, room));
  score += aces.length;
  return score;
}

// ==================== ПАРТНЁРСКАЯ СИЛА ====================
// Если партнёр вышел, его карты у нас — считаем командой
export function teamStrength(room, mySeat) {
  const me = room.players[mySeat];
  const partnerSeat = partnerOf(mySeat);
  const partner = room.players[partnerSeat];

  const myStrength = me ? handStrength(me.hand, room, mySeat) : 0;
  if (!partner || partner.out) return myStrength;

  const partnerStrength = handStrength(partner.hand, room, partnerSeat);
  // Партнёрская сила «весит» 0.7 — мы её не контролируем напрямую
  return Math.round(myStrength + partnerStrength * 0.7);
}

// ==================== ПОЗИЦИЯ ====================
// Итоговая оценка: рука + контроль + партнёр − враги
export function positionScore(room, botSeat) {
  const bot = room.players[botSeat];
  if (!bot || bot.out) return 0;

  const strength = teamStrength(room, botSeat);
  const control = controlScore(bot.hand, room, botSeat);

  // Карты врагов (сколько «весят» на поле)
  const enemyCards = room.players
    .filter(p => p.team !== bot.team && !p.out)
    .reduce((s, p) => s + p.hand.length, 0);

  const enemyTrumps = room.players
    .filter(p => p.team !== bot.team && !p.out)
    .reduce((s, p) => s + p.hand.filter(c => isKozir(c, room)).length, 0);

  // Позиция = сила*0.8 + контроль*5 − карты врагов*2 − козыри врагов*4
  return Math.round(
    strength * 0.8 +
    control * 5 -
    enemyCards * 2 -
    enemyTrumps * 4
  );
}

// ==================== АГРЕССИВНОСТЬ ====================
// Стоит ли играть на выигрыш кон прямо сейчас
export function shouldPlayAggressive(room, botSeat) {
  const pos = positionScore(room, botSeat);
  const enemyTotal = room.players
    .filter(p => p.team !== room.players[botSeat].team && !p.out)
    .reduce((s, p) => s + p.hand.length, 0);
  const deckLeft = room.deck.length + (room.trumpCard ? 1 : 0);

  // Эндшпиль или врагам мало — давим
  if (deckLeft <= 8 && enemyTotal <= 6) return true;
  if (pos >= 55) return true;

  return false;
}

// ==================== ОСТОРОЖНОСТЬ ====================
// Стоит ли экономить карты (в т.ч. поднимать)
export function shouldPlayConservatively(room, botSeat) {
  const pos = positionScore(room, botSeat);
  const deckLeft = room.deck.length + (room.trumpCard ? 1 : 0);
  const handSize = room.players[botSeat].hand.length;

  // Если колода пуста — уже не экономим, играем точно
  if (deckLeft === 0) return false;

  // Маленькая рука + начало игры → экономим
  if (handSize <= 3 && deckLeft >= 15) return true;

  // Позиция слабая → экономим
  if (pos < -5) return true;

  return false;
}