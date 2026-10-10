import { partnerOf } from '../../utils.js';
import { getDocs } from '../cards.js';

// Кто партнёр этого бота
export function partnerInfo(room, botSeat) {
  const partnerSeat = partnerOf(botSeat);
  const partner = room.players[partnerSeat];
  return {
    seat: partnerSeat,
    player: partner,
    isOut: !partner || partner.out,
  };
}

// Партнёр вышел → бот играет за двоих
export function iAmSoloOnTeam(room, botSeat) {
  const p = partnerInfo(room, botSeat);
  return p.isOut;
}

// Может ли партнёр в этом ходу защититься от карты?
// Нужно для оценки "подставляем партнёра или помогаем"
export function partnerCanBeat(room, botSeat, card) {
  const p = partnerInfo(room, botSeat);
  if (p.isOut || !p.player) return false;

  const partnerHand = p.player.hand;
  return partnerHand.some(c => {
    if (c.s === card.s && c.r > card.r) return true;
    if (c.s === room.trumpSuit && card.s !== room.trumpSuit) return true;
    if (c.s === room.trumpSuit && card.s === room.trumpSuit && c.r > card.r) return true;
    return false;
  });
}

// Хорошая ли идея помочь партнёру скинуть карту?
// Если партнёр может побить карту, которую мы подкидываем — это безопасно и полезно
export function isSafeExtraForPartner(room, botSeat, card) {
  const p = partnerInfo(room, botSeat);
  if (p.isOut || !p.player) return false;

  // Если партнёр может побить — подкидывание безопасно
  if (partnerCanBeat(room, botSeat, card)) return true;

  // Если у партнёра уже мало карт — можно его не подставлять
  if (p.player.hand.length <= 2) return false;

  return false;
}

// Партнёр-защитник: не мешаем ему, если у него сильная рука
export function partnerDefendingWell(room, botSeat) {
  const p = partnerInfo(room, botSeat);
  if (p.isOut || !p.player) return false;
  // Если у партнёра много карт и он на позиции — не мешаем
  return p.player.hand.length >= 4;
}

// Партнёр-атакующий: помогаем скидывать мусор
// Если мы атакующий и у партнёра много карт — подкидываем ему
export function partnerNeedsHelp(room, botSeat) {
  const p = partnerInfo(room, botSeat);
  if (p.isOut || !p.player) return false;
  // У партнёра много карт → ему тяжело, помогаем
  return p.player.hand.length >= 4;
}

// Партнёр-защитник близок к подъёму — не подкидываем лишнего
// (при подъёме карты уходят защитнику, а не нам)
export function partnerAboutToPickup(room, botSeat) {
  if (!room.field) return false;
  const defender = room.players[room.field.defender];
  if (!defender) return false;
  // Если защитник — наш партнёр
  const p = partnerInfo(room, botSeat);
  if (p.seat !== room.field.defender) return false;
  // Если он уже сдался или не может бить — не подкидываем
  return room.field.defenderGaveUp || room.field.askMore;
}