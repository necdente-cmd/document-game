import { partnerOf } from '../../utils.js';
import { nextActiveSlot, playerAtSlot } from '../../utils.js';

export const KEY = '4p';

export function getAttackerSlot(r, playerSeat) {
  return playerSeat;
}

// После БИТО: если защитник вышел — атакует его партнёр (из слота вышедшего)
export function afterBito(r, defender, defenderSlot) {
  let turnPlayer = defender;
  let fromSlot = defenderSlot != null ? defenderSlot : defender.seat;

  if (defender.out) {
    const partnerSeat = partnerOf(defender.seat);
    const partner = r.players[partnerSeat];
    if (partner && !partner.out) {
      turnPlayer = partner;
      // партнёр играет в слоте вышедшего
      fromSlot = defender.seat;
    } else {
      return null;
    }
  }

  const nextSlot = nextActiveSlot(r, fromSlot, turnPlayer.seat);
  return {
    turnSeat: turnPlayer.seat,
    attackerSlot: fromSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}

export function afterPickup(r, defenderSeat, attackerSeat) {
  const partnerSeat = partnerOf(attackerSeat);
  const partner = r.players[partnerSeat];
  const turnSeat = (partner && !partner.out) ? partnerSeat : attackerSeat;
  const nextSlot = nextActiveSlot(r, turnSeat, turnSeat);
  return {
    turnSeat,
    attackerSlot: turnSeat,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}