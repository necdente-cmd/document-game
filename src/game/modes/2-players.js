import { partnerOf } from '../../utils.js';
import { nextActiveSlot, playerAtSlot } from '../../utils.js';

export const KEY = '2p';

export function getAttackerSlot(r, playerSeat) {
  return playerSeat;
}

// Пинг-понг. Если защитник вышел после БИТО — атакует партнёр (если в игре),
// но в 1×1 партнёры обычно оба вышли — тогда checkTeamExitWin сработает раньше.
export function afterBito(r, defender, defenderSlot) {
  let turnPlayer = defender;
  let fromSlot = defenderSlot != null ? defenderSlot : defender.seat;

  if (defender.out) {
    const partnerSeat = partnerOf(defender.seat);
    const partner = r.players[partnerSeat];
    if (partner && !partner.out) {
      turnPlayer = partner;
      fromSlot = defender.seat;
    } else {
      return null; // оба вышли
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

// После подъёма в 1×1 — атакует тот же, кто атаковал (партнёры вышли)
export function afterPickup(r, defenderSeat, attackerSeat) {
  const nextSlot = nextActiveSlot(r, attackerSeat, attackerSeat);
  return {
    turnSeat: attackerSeat,
    attackerSlot: attackerSeat,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}