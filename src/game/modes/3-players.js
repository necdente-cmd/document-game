import { partnerOf, teamOf } from '../../utils.js';
import { nextActiveSlot, playerAtSlot } from './common.js';

export const KEY = '3p';

// В 3 игроках партнёр вышедшего играет за два слота и чередует их
export function getAttackerSlot(r, playerSeat) {
  const partnerSeat = partnerOf(playerSeat);
  const partner = r.players[partnerSeat];

  // Партнёр в игре → свой слот
  if (partner && !partner.out) return playerSeat;

  // Партнёр вышел → чередуем между своим и партнёрским слотом
  const team = teamOf(playerSeat);
  const pair = team === 0 ? [0, 2] : [1, 3];
  const last = r.teamPairLastSlot?.[team] ?? null;

  if (last == null) return pair[0];
  return pair[0] === last ? pair[1] : pair[0];
}

// После БИТО: защитник атакует следующим
// Если защитник вышел — атакует его партнёр (из слота вышедшего)
// Цель — следующий активный слот по часовой от того слота, откуда защищались
export function afterBito(r, defender, defenderSlot) {
  // Если защитник вышел — атакует партнёр
  let turnPlayer = defender;
  if (defender.out) {
    const partnerSeat = partnerOf(defender.seat);
    const partner = r.players[partnerSeat];
    if (partner && !partner.out) {
      turnPlayer = partner;
    } else {
      return null; // оба вышли — команда победила
    }
  }

  // Цель — следующий активный слот по часовой от слота, где защищались
  const fromSlot = (defenderSlot != null) ? defenderSlot : turnPlayer.seat;
  const nextSlot = nextActiveSlot(r, fromSlot);

  return {
    turnSeat: turnPlayer.seat,
    attackerSlot: fromSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}

// После ПОДНЯТИЯ: ход у партнёра атакующего (или у самого атакующего, если партнёр вышел)
export function afterPickup(r, defenderSeat, attackerSeat) {
  const partnerSeat = partnerOf(attackerSeat);
  const partner = r.players[partnerSeat];
  const turnSeat = (partner && !partner.out) ? partnerSeat : attackerSeat;
  const attackerSlot = getAttackerSlot(r, turnSeat);
  const nextSlot = nextActiveSlot(r, attackerSlot);
  return {
    turnSeat,
    attackerSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}