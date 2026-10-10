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
 * @param {object} r          — комната
 * @param {object} defender   — игрок-защитник
 * @param {number} defenderSlot — слот, в котором защищался
 * @param {number} attackerSeat — seat атакующего (того, кто атаковал до бито)
 */
export function afterBito(r, defender, defenderSlot, attackerSeat) {
  let turnPlayer = defender;
  let fromSlot = defenderSlot != null ? defenderSlot : defender.seat;

  // Пара игроков, которые только что участвовали в дуэли
  const currentPair = attackerSeat != null ? [attackerSeat, defender.seat] : null;
  const duelDone = currentPair && samePair(currentPair, r.lastDuelPair);

  // Если защитник вышел — играет партнёр из слота вышедшего
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

  if (duelDone) {
    // 🔒 Дуэль завершена — защитник НЕ контратакует. Ход по циклу от слота защиты.
    r.lastDuelPair = null;
    const nextSlot = nextActiveSlot(r, fromSlot, turnPlayer.seat);
    return {
      turnSeat: turnPlayer.seat,
      attackerSlot: fromSlot,
      targetSlot: nextSlot,
      targetSeat: nextSlot != null ? playerAtSlot(r, nextSlot).seat : null,
      isContrAttack: false,
    };
  }

  // ⚔ Контратака — атакуем НАПРЯМУЮ того, кто только что атаковал.
  r.lastDuelPair = currentPair ? [...currentPair] : null;
  return {
    turnSeat: turnPlayer.seat,
    attackerSlot: fromSlot,
    targetSlot: attackerSeat,        // слот = seat атакующего (в 4-местной сетке)
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