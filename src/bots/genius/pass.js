import { bothPartnersPassed } from '../../utils.js';
import { pickExtraCards } from './attack.js';

/**
 * Возвращает:
 *   { action: 'pass' } — пас (только если защитник сдался или просил вдогонку)
 *   { action: 'attack', cardIds: [...] } — добавить карты
 *   null — ждать (не делать ничего)
 */
export function passDecision(room, botSeat, memory, profile) {
  const f = room.field;
  if (!f) return { action: 'pass' };

  // Защитник сдался или просит ещё — пас (мы своё сделали)
  if (f.defenderGaveUp || f.askMore) {
    // Но перед пасом — докидываем мусор (если защитник поднимает)
    const extra = pickExtraCards(room, botSeat, memory, profile);
    if (extra.length > 0) return { action: 'attack', cardIds: extra };
    return { action: 'pass' };
  }

  // Защитник ещё не отреагировал — пробуем добавить карты
  const extra = pickExtraCards(room, botSeat, memory, profile);
  if (extra.length > 0) return { action: 'attack', cardIds: extra };

  // Нечего добавить, но защитник не сдался — ЖДЁМ.
  // (Если защитник побьёт ещё карту и на столе появится новый ранг, бот сможет добавить.)
  return null;
}