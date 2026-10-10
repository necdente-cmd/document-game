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

// Сравнение двух пар (неупорядоченное)
function samePair(a, b) {
  if (!a || !b) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa[0] === sb[0] && sa[1] === sb[1];
}

/**
 * После БИТО в 3p.
 *
 * Порядок проверок:
 *  1. Если защитник вышел → играет партнёр ИЗ СЛОТА ВЫШЕДШЕГО,
 *     цель по циклу. Контратака/дуэль НЕ применяются.
 *  2. Если защитник в игре:
 *     a. дуэль завершена → атакует из слота защиты, цель по циклу
 *     b. дуэль не завершена → контратака на того, кто атаковал
 */
export function afterBito(r, defender, defenderSlot, attackerSeat) {
  let fromSlot = defenderSlot != null ? defenderSlot : defender.seat;

  // === 1. ЗАЩИТНИК ВЫШЕЛ ===
  if (defender.out) {
    const partnerSeat = partnerOf(defender.seat);
    const partner = r.players[partnerSeat];
    if (!partner || partner.out) {
      return null;
    }
    // Партнёр играет за вышедшего. Дуэль обнуляем (партнёр не участвовал).
    r.lastDuelPair = null;
    const nextSlot = nextActiveSlot(r, fromSlot, partner.seat);
    return {
      turnSeat: partner.seat,
      attackerSlot: fromSlot,        // ← слот вышедшего (не свой!)
      targetSlot: nextSlot,
      targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
      isContrAttack: false,
    };
  }

  // === 2. ЗАЩИТНИК В ИГРЕ ===
  const currentPair = attackerSeat != null ? [attackerSeat, defender.seat] : null;
  const duelDone = currentPair && samePair(currentPair, r.lastDuelPair);

  if (duelDone) {
    // Дуэль завершена — атакует из слота защиты, цель по циклу
    r.lastDuelPair = null;
    const nextSlot = nextActiveSlot(r, fromSlot, defender.seat);
    return {
      turnSeat: defender.seat,
      attackerSlot: fromSlot,
      targetSlot: nextSlot,
      targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
      isContrAttack: false,
    };
  }

  // Контратака — бьёт того, кто только что атаковал
  r.lastDuelPair = currentPair ? [...currentPair] : null;
  return {
    turnSeat: defender.seat,
    attackerSlot: fromSlot,
    targetSlot: attackerSeat,
    targetSeat: attackerSeat,
    isContrAttack: true,
  };
}

export function afterPickup(r, defenderSeat, attackerSeat) {
  // При pickup сбрасываем пару дуэли
  r.lastDuelPair = null;

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