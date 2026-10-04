import { partnerOf, bothPartnersPassed } from '../../utils.js';
import { pickExtraCards } from './attack.js';

/**
 * Решение атакующего/партнёра: добавить ещё или спасовать.
 */
export function passDecision(room, botSeat, memory, profile) {
  // Если мы партнёр и он ещё не пасовал, а атакующий пасанул — не лезем.
  if (room.field.askMore || room.field.defenderGaveUp) {
    return { action: 'pass' };
  }

  const extra = pickExtraCards(room, botSeat, memory, profile);
  if (extra.length > 0) return { action: 'attack', cardIds: extra };
  return { action: 'pass' };
}