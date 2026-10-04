import { bothPartnersPassed } from '../../utils.js';
import { pickExtraCards } from './attack.js';

export function passDecision(room, botSeat, memory, profile) {
  if (room.field.askMore || room.field.defenderGaveUp) {
    return { action: 'pass' };
  }
  const extra = pickExtraCards(room, botSeat, memory, profile);
  if (extra.length > 0) return { action: 'attack', cardIds: extra };
  return { action: 'pass' };
}