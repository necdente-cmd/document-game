import { partnerOf, teamOf } from '../../utils.js';

// ✅ Кто реально играет за слот (учитывает вышедших и их партнёров)
export function playerAtSlot(r, slot) {
  const p = r.players[slot];
  if (!p) return null;
  if (!p.out) return p;
  const partner = r.players[partnerOf(slot)];
  if (partner && !partner.out) return partner;
  return null;
}

export function isSlotActive(r, slot) {
  return playerAtSlot(r, slot) !== null;
}

// Следующий активный слот по часовой от fromSlot (не считая партнёрского)
export function nextActiveSlot(r, fromSlot) {
  const partnerSlot = partnerOf(fromSlot);
  for (let i = 1; i <= 3; i++) {
    const s = (fromSlot + i) % 4;
    if (s === partnerSlot) continue;
    if (!isSlotActive(r, s)) continue;
    return s;
  }
  return null;
}

// Слоты, которыми играет игрок (обычно один; если партнёр вышел — может быть два)
export function slotsOf(r, playerSeat) {
  const partner = r.players[partnerOf(playerSeat)];
  const result = [playerSeat];
  if (partner && partner.out) result.push(partnerOf(playerSeat));
  return result;
}