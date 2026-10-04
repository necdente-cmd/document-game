import { RV } from '../../constants.js';
import { isKozir, partnerOf } from '../../utils.js';
import { unseenFromRoom } from '../memory.js';

export function isEndgame(room) {
  return room.deck.length === 0 && !room.trumpCard;
}

export function knownEnemyHands(room, botSeat) {
  if (!isEndgame(room)) return null;

  const bot = room.players[botSeat];
  const unseen = unseenFromRoom(room, botSeat);
  const enemies = room.players.filter(p => p.team !== bot.team && !p.out);
  const totalEnemyCards = enemies.reduce((s, p) => s + p.hand.length, 0);

  if (totalEnemyCards === 0) return new Map();

  if (totalEnemyCards === 1) {
    const enemiesWithHand = enemies.filter(p => p.hand.length > 0);
    if (enemiesWithHand.length === 1 && unseen.length === 1) {
      return new Map([[enemiesWithHand[0].seat, [unseen[0]]]]);
    }
  }

  if (enemies.length === 1 && totalEnemyCards === unseen.length) {
    return new Map([[enemies[0].seat, unseen.slice()]]);
  }

  return null;
}

export function canForceTake(room, botSeat, card) {
  const known = knownEnemyHands(room, botSeat);
  if (!known) return false;

  for (const [, cards] of known) {
    for (const c of cards) {
      if (isKozir(c, room) && !isKozir(card, room)) return false;
      if (isKozir(c, room) && isKozir(card, room) && RV[c.r] > RV[card.r]) return false;
      if (!isKozir(c, room) && !isKozir(card, room)
          && c.s === card.s && RV[c.r] > RV[card.r]) return false;
    }
  }
  return true;
}

export function pickExactWinner(room, botSeat) {
  const bot = room.players[botSeat];
  const known = knownEnemyHands(room, botSeat);
  if (!known) return null;

  const enemies = room.players.filter(p => p.team !== bot.team && !p.out);
  if (enemies.length !== 1) return null;
  const cards = known.get(enemies[0].seat);
  if (!cards || cards.length !== 1) return null;

  const target = cards[0];
  for (const c of bot.hand) {
    if (isKozir(c, room) && !isKozir(target, room)) return c;
    if (isKozir(c, room) && isKozir(target, room) && RV[c.r] > RV[target.r]) return c;
    if (!isKozir(c, room) && !isKozir(target, room)
        && c.s === target.s && RV[c.r] > RV[target.r]) return c;
  }
  return null;
}