import { RV } from '../../constants.js';
import { partnerOf, isKozir } from '../../utils.js';
import { unseenFromRoom } from '../memory.js';

export function unseenBreakdown(room, botSeat) {
  const unseen = unseenFromRoom(room, botSeat);
  const bot = room.players[botSeat];
  const partner = room.players[partnerOf(botSeat)];
  const deckLeft = room.deck.length + (room.trumpCard ? 1 : 0);
  const partnerHand = partner && !partner.out ? partner.hand.length : 0;

  const enemiesHand = room.players
    .filter(p => p.team !== bot.team && !p.out)
    .reduce((s, p) => s + p.hand.length, 0);

  const total = deckLeft + partnerHand + enemiesHand;
  return { unseen, deckLeft, partnerHand, enemiesHand, total };
}

export function unseenTrumps(room, botSeat) {
  const { unseen } = unseenBreakdown(room, botSeat);
  return unseen.filter(c => c.s === room.trumpSuit);
}

export function pDefenderBeats(room, botSeat, defenderSeat, card) {
  const defender = room.players[defenderSeat];
  if (!defender || defender.out) return 0;
  const hSize = defender.hand.length;
  if (hSize === 0) return 0;

  const { unseen, deckLeft, partnerHand } = unseenBreakdown(room, botSeat);
  const enemyPool = Math.max(0, unseen.length - deckLeft - partnerHand);
  if (enemyPool === 0) return 0;

  const cardIsTrump = isKozir(card, room);

  const beating = unseen.filter(c => {
    if (cardIsTrump) {
      return isKozir(c, room) && RV[c.r] > RV[card.r];
    }
    return isKozir(c, room) || (c.s === card.s && RV[c.r] > RV[card.r]);
  });

  const defenderShare = enemyPool > 0 ? hSize / enemyPool : 0;
  const beatingInDefender = beating.length * defenderShare;
  const p = Math.min(0.95, beatingInDefender / Math.max(1, hSize));
  return p;
}

export function pAttackWillBeBeaten(room, botSeat, defenderSeat, cards) {
  let pAll = 1;
  for (const c of cards) {
    pAll *= pDefenderBeats(room, botSeat, defenderSeat, c);
  }
  return pAll;
}