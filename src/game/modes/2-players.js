import { partnerOf, teamOf } from '../../utils.js';
import { nextActiveSlot, playerAtSlot } from './common.js';

export const KEY = '2p';

// В 2 игроках каждый в своём слоте
export function getAttackerSlot(r, playerSeat) {
  return playerSeat;
}

// Пинг-понг: тот, кто отбился, атакует обратно того же игрока
export function afterBito(r, defender) {
  // Единственный противник — следующий по часовой от слота защитника
  const nextSlot = nextActiveSlot(r, defender.seat);
  return {
    turnSeat: defender.seat,
    attackerSlot: defender.seat,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}

// После ПОДНЯТИЯ: тот же, кто атаковал, атакует снова (пинг-понг)
export function afterPickup(r, defenderSeat, attackerSeat) {
  const attackerSlot = attackerSeat; // в 2p slot = seat
  const nextSlot = nextActiveSlot(r, attackerSlot);
  return {
    turnSeat: attackerSeat,
    attackerSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}