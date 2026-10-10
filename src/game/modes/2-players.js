import { partnerOf } from '../../utils.js';
import { nextActiveSlot, playerAtSlot } from '../../utils.js';

export const KEY = '2p';

export function getAttackerSlot(r, playerSeat) {
  return playerSeat;
}

/**
 * После БИТО в 2p.
 * Возможен переход 3p → 2p: защитник мог выйти после бито.
 * Тогда атакует его партнёр из слота вышедшего.
 */
export function afterBito(r, defender, defenderSlot, attackerSeat) {
  let turnPlayer = defender;
  let fromSlot = defenderSlot != null ? defenderSlot : defender.seat;

  // 🔧 Переход 3p → 2p: защитник только что вышел
  if (defender.out) {
    const partnerSeat = partnerOf(defender.seat);
    const partner = r.players[partnerSeat];
    if (partner && !partner.out) {
      turnPlayer = partner;
      fromSlot = defender.seat;
    } else {
      return null;
    }
  }

  const targetSlot = nextActiveSlot(r, fromSlot, turnPlayer.seat);
  return {
    turnSeat: turnPlayer.seat,
    attackerSlot: fromSlot,
    targetSlot,
    targetSeat: targetSlot != null ? playerAtSlot(r, targetSlot).seat : null,
    isContrAttack: false,
  };
}

/**
 * После PICKUP в 2p — атакует тот же, кто атаковал.
 * Но если атакующий вышел (0 карт) — его партнёр.
 */
export function afterPickup(r, defenderSeat, attackerSeat) {
  let turnSeat = attackerSeat;

  // 🔧 Если атакующий вышел — играет партнёр
  const attacker = r.players[attackerSeat];
  if (!attacker || attacker.out) {
    const partnerSeat = partnerOf(attackerSeat);
    const partner = r.players[partnerSeat];
    if (partner && !partner.out) {
      turnSeat = partnerSeat;
    } else {
      return null;
    }
  }

  const attackerSlot = turnSeat;
  const nextSlot = nextActiveSlot(r, attackerSlot, turnSeat);
  return {
    turnSeat,
    attackerSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}