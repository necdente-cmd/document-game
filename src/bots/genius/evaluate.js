import { RV } from '../../constants.js';
import { cardValue, getDocs, isKozir } from '../cards.js';
import { partnerOf } from '../../utils.js';

export function handStrength(hand, room, seat) {
  if (!hand.length) return 0;
  let sum = 0;
  for (const c of hand) sum += cardValue(c, room, seat);
  const avg = sum / hand.length;
  const density = Math.min(1, hand.length / 6);
  return Math.round(avg * (0.6 + 0.4 * density));
}

export function controlScore(hand, room, seat) {
  let score = 0;
  const trumps = hand.filter(c => isKozir(c, room));
  for (const c of trumps) {
    if (RV[c.r] >= RV['Q']) score += 2;
    else if (RV[c.r] >= RV['9']) score += 1;
  }
  const aces = hand.filter(c => c.r === 'A' && !isKozir(c, room));
  score += aces.length;
  return score;
}

export function positionScore(room, botSeat) {
  const bot = room.players[botSeat];
  if (!bot || bot.out) return 0;

  const strength = handStrength(bot.hand, room, botSeat);
  const control = controlScore(bot.hand, room, botSeat);

  const enemyTrumps = room.players
    .filter(p => p.team !== bot.team && !p.out)
    .reduce((s, p) => s + p.hand.filter(c => isKozir(c, room)).length, 0);

  return strength + control * 5 - enemyTrumps * 3;
}

export function shouldPlayAggressive(room, botSeat) {
  const pos = positionScore(room, botSeat);
  const totalEnemyCards = room.players
    .filter(p => p.team !== room.players[botSeat].team && !p.out)
    .reduce((s, p) => s + p.hand.length, 0);

  if (totalEnemyCards <= 3 && pos >= 40) return true;
  if (pos >= 65) return true;
  return false;
}