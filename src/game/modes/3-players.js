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

function samePair(a, b) {
  if (!a || !b) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa[0] === sb[0] && sa[1] === sb[1];
}

export function afterBito(r, defender, defenderSlot, attackerSeat) {
  let fromSlot = defenderSlot != null ? defenderSlot : defender.seat;

  // === 1. ЗАЩИТНИК ВЫШЕЛ ===
  if (defender.out) {
    const partnerSeat = partnerOf(defender.seat);
    const partner = r.players[partnerSeat];
    if (!partner || partner.out) return null;

    r.lastDuelPair = null;
    const nextSlot = nextActiveSlot(r, fromSlot, partner.seat);
    return {
      turnSeat: partner.seat,
      attackerSlot: fromSlot,
      targetSlot: nextSlot,
      targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
      isContrAttack: false,
    };
  }

  // === 2. ЗАЩИТНИК В ИГРЕ ===
  const currentPair = attackerSeat != null ? [attackerSeat, defender.seat] : null;
  const duelDone = currentPair && samePair(currentPair, r.lastDuelPair);

  if (duelDone) {
    r.lastDuelPair = null;

    // Чередование слотов команды защитника (независимо от партнёра)
    const team = teamOf(defender.seat);
    const pair = team === 0 ? [0, 2] : [1, 3];
    const last = r.teamPairLastSlot?.[team] ?? null;

    const newAttackerSlot = last == null
      ? pair[0]
      : (pair[0] === last ? pair[1] : pair[0]);

    if (r.teamPairLastSlot) {
      r.teamPairLastSlot[team] = newAttackerSlot;
    }

    // Исключаем участников завершённой дуэли
    const excludeSeats = new Set([defender.seat]);
    if (attackerSeat != null) excludeSeats.add(attackerSeat);

    let nextSlot = nextActiveSlot(r, newAttackerSlot, defender.seat);
    if (nextSlot != null) {
      const nextSeat = playerAtSlot(r, nextSlot)?.seat;
      if (excludeSeats.has(nextSeat)) {
        nextSlot = nextActiveSlot(r, nextSlot, defender.seat);
      }
    }

    return {
      turnSeat: defender.seat,
      attackerSlot: newAttackerSlot,
      targetSlot: nextSlot,
      targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
      isContrAttack: false,
    };
  }

  // === КОНТРАТАКА ===
  r.lastDuelPair = currentPair ? [...currentPair] : null;

  // Слот защитника для контратаки — через getAttackerSlot (учитывает партнёра)
  const contrSlot = getAttackerSlot(r, defender.seat);
  const team = teamOf(defender.seat);
  if (r.teamPairLastSlot) {
    r.teamPairLastSlot[team] = contrSlot;
  }

  return {
    turnSeat: defender.seat,
    attackerSlot: contrSlot,
    targetSlot: attackerSeat,
    targetSeat: attackerSeat,
    isContrAttack: true,
  };
}

export function afterPickup(r, defenderSeat, attackerSeat) {
  r.lastDuelPair = null;

  const partnerSeat = partnerOf(attackerSeat);
  const partner = r.players[partnerSeat];
  const turnSeat = (partner && !partner.out) ? partnerSeat : attackerSeat;

  // Чередование слотов для команды
  const team = teamOf(turnSeat);
  const pair = team === 0 ? [0, 2] : [1, 3];
  const last = r.teamPairLastSlot?.[team] ?? null;

  const attackerSlot = last == null
    ? pair[0]
    : (pair[0] === last ? pair[1] : pair[0]);

  if (r.teamPairLastSlot) {
    r.teamPairLastSlot[team] = attackerSlot;
  }

  const nextSlot = nextActiveSlot(r, attackerSlot, turnSeat);
  return {
    turnSeat,
    attackerSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}