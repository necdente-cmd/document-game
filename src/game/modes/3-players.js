import { partnerOf, teamOf } from '../../utils.js';
import { nextActiveSlot, playerAtSlot } from '../../utils.js';

export const KEY = '3p';

/**
 * Возвращает СЛОТ для следующей атаки игрока.
 * Если партнёр в игре — свой слот.
 * Если партнёр вышел — чередование 0 ↔ 2 (или 1 ↔ 3).
 * НЕ обновляет teamPairLastSlot — это делает afterPickup/afterBito.
 */
export function getAttackerSlot(r, playerSeat) {
  const partnerSeat = partnerOf(playerSeat);
  const partner = r.players[partnerSeat];
  if (partner && !partner.out) return playerSeat;

  const team = teamOf(playerSeat);
  const pair = team === 0 ? [0, 2] : [1, 3];
  const last = r.teamPairLastSlot?.[team] ?? null;
  return last != null ? last : pair[0];
}

// Сравнение двух пар (неупорядоченное)
function samePair(a, b) {
  if (!a || !b) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa[0] === sb[0] && sa[1] === sb[1];
}

/**
 * Явный выбор следующего защитника.
 * Идёт по кругу от (fromSlot + 1), пропускает:
 *   - вышедших игроков (out)
 *   - слоты из excludeSeats
 * Возвращает slot защитника или null, если никого.
 */
function pickNextDefender(r, fromSlot, excludeSeats) {
  if (!excludeSeats) excludeSeats = new Set();
  for (let step = 1; step <= 4; step++) {
    const slot = (fromSlot + step) % 4;
    const p = r.players.find(x => x.seat === slot);
    if (!p || p.out) continue;
    if (excludeSeats.has(slot)) continue;
    return slot;
  }
  return null;
}

/**
 * После БИТО в 3p.
 */
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

    // Чередуем слот атакующего
    const team = teamOf(defender.seat);
    const pair = team === 0 ? [0, 2] : [1, 3];
    const last = r.teamPairLastSlot?.[team] ?? null;
    const usedSlot = last != null ? last : pair[0];
    const newAttackerSlot = usedSlot === pair[0] ? pair[1] : pair[0];

    if (r.teamPairLastSlot) {
      r.teamPairLastSlot[team] = newAttackerSlot;
    }

    // Исключаем обоих участников завершённой дуэли
    const excludeSeats = new Set([defender.seat]);
    if (attackerSeat != null) excludeSeats.add(attackerSeat);

    // ЯВНЫЙ выбор следующего защитника
    const nextSlot = pickNextDefender(r, newAttackerSlot, excludeSeats);

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

/**
 * После ПОДНЯТИЯ карт защитником.
 */
export function afterPickup(r, defenderSeat, attackerSeat) {
  r.lastDuelPair = null;

  const partnerSeat = partnerOf(attackerSeat);
  const partner = r.players[partnerSeat];
  const turnSeat = (partner && !partner.out) ? partnerSeat : attackerSeat;

  let attackerSlot;

  if (partner && !partner.out) {
    attackerSlot = turnSeat;
  } else {
    const team = teamOf(turnSeat);
    const pair = team === 0 ? [0, 2] : [1, 3];
    const last = r.teamPairLastSlot?.[team] ?? null;
    const usedSlot = last != null ? last : pair[0];
    attackerSlot = usedSlot === pair[0] ? pair[1] : pair[0];

    if (r.teamPairLastSlot) {
      r.teamPairLastSlot[team] = attackerSlot;
    }
  }

  // Явный выбор защитника (только тех, кто не out и не сам атакующий)
  const excludeSeats = new Set([turnSeat]);
  const nextSlot = pickNextDefender(r, attackerSlot, excludeSeats);

  return {
    turnSeat,
    attackerSlot,
    targetSlot: nextSlot,
    targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
  };
}