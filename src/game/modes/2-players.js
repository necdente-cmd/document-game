import { nextActiveSlot, playerAtSlot } from '../../utils.js';

export const KEY = '2p';

export function getAttackerSlot(r, playerSeat) {
  return playerSeat;
}

// В 2p атакуем того же, кто атаковал (пинг-понг)
export function afterBito(r, defender, defenderSlot, attackerSeat) {
  const fromSlot = defenderSlot != null ? defenderSlot : defender.seat;
  const targetSlot = nextActiveSlot(r, fromSlot, defender.seat);
  return {
    turnSeat: defender.seat,
    attackerSlot: fromSlot,
    targetSlot,
    targetSeat: targetSlot != null ? playerAtSlot(r, targetSlot).seat : null,
    isContrAttack: false,
  };
}

export function afterPickup(r, defenderSeat, attackerSeat) {
  // В 2p атакует тот же, кто атаковал
  const turnSeat = attackerSeat;
  const attackerSlot = attackerSeat;
  const nextSlot = nextActiveSlot(r, attackerSlot, turnSeat);
  return {
    turnSeat,
    attackerSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}