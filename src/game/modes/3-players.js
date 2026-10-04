import { partnerOf, teamOf } from '../../utils.js';
import { nextActiveSlot, playerAtSlot } from '../../utils.js';

export const KEY = '3p';

// Партнёр вышедшего чередует два слота команды
export function getAttackerSlot(r, playerSeat) {
  const partnerSeat = partnerOf(playerSeat);
  const partner = r.players[partnerSeat];
  if (partner && !partner.out) return playerSeat;

  const team = teamOf(playerSeat);
  const pair = team === 0 ? [0, 2] : [1, 3];
  const last = r.teamPairLastSlot?.[team] ?? null;

  if (last == null) return pair[0];
  return pair[0] === last ? pair[1] : pair[0];
}

// После БИТО: если защитник вышел — атакует его партнёр
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
  const attackerSlot = getAttackerSlot(r, turnSeat);
  const nextSlot = nextActiveSlot(r, attackerSlot, turnSeat);
  return {
    turnSeat,
    attackerSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}