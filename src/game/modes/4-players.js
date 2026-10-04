import { partnerOf, teamOf } from '../../utils.js';
import { nextActiveSlot, playerAtSlot } from './common.js';

export const KEY = '4p';

// В 4 игроках каждый играет только своим слотом
export function getAttackerSlot(r, playerSeat) {
  return playerSeat;
}

// После БИТО: защитник атакует следующим, из своего слота
// Цель — следующий активный слот по часовой от его слота
export function afterBito(r, defender) {
  const nextSlot = nextActiveSlot(r, defender.seat);
  return {
    turnSeat: defender.seat,
    attackerSlot: defender.seat,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}

// После ПОДНЯТИЯ: ход у партнёра атакующего
export function afterPickup(r, defenderSeat, attackerSeat) {
  const partnerSeat = partnerOf(attackerSeat);
  const partner = r.players[partnerSeat];
  const turnSeat = (partner && !partner.out) ? partnerSeat : attackerSeat;
  const nextSlot = nextActiveSlot(r, turnSeat);
  return {
    turnSeat,
    attackerSlot: turnSeat,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}