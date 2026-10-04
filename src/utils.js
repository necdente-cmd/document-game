import { SUITS, RANKS, RV } from './constants.js';

export const uid = () => Math.random().toString(36).slice(2, 10);
export const code = () => Math.random().toString(36).slice(2, 6).toUpperCase();

export const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const makeDeck = () => {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ r, s, id: uid() });
  return d;
};

export const teamOf = (s) => s % 2;
export const partnerOf = (s) => (s + 2) % 4;

export const isKozir = (c, r) => c.s === r.trumpSuit;

export function beats(a, b, r) {
  if (isKozir(a, r) && !isKozir(b, r)) return true;
  if (!isKozir(a, r) && isKozir(b, r)) return false;
  if (a.s !== b.s) return false;
  return RV[a.r] > RV[b.r];
}

export function partnerOut(r, seat) {
  const partner = r.players[partnerOf(seat)];
  return partner ? partner.out : true;
}

// ✅ Кто реально играет за слот (учитывает партнёра вышедшего)
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

// ✅ Слоты, где реально играет игрок (свой + партнёрский если партнёр вышел)
export function slotsOf(r, playerSeat) {
  const result = [playerSeat];
  const partner = r.players[partnerOf(playerSeat)];
  if (partner && partner.out) result.push(partnerOf(playerSeat));
  return result;
}

// ✅ Следующий активный слот по часовой от fromSlot.
// ownerSeat — seat игрока, чьи слоты исключаем (нельзя атаковать себя)
export function nextActiveSlot(r, fromSlot, ownerSeat = null) {
  const partnerSlot = partnerOf(fromSlot);
  const mySlots = ownerSeat != null ? slotsOf(r, ownerSeat) : [fromSlot];

  for (let i = 1; i <= 3; i++) {
    const s = (fromSlot + i) % 4;
    if (s === partnerSlot) continue;
    if (mySlots.includes(s)) continue;
    if (!isSlotActive(r, s)) continue;
    return s;
  }
  return null;
}

// Противники по seat (совместимость)
export function opponentsOf(r, attackerSeat) {
  const mySlots = slotsOf(r, attackerSeat);
  const partnerSlot = partnerOf(attackerSeat);
  const list = [];
  for (let i = 1; i <= 3; i++) {
    const s = (attackerSeat + i) % 4;
    if (s === partnerSlot) continue;
    if (mySlots.includes(s)) continue;
    if (!isSlotActive(r, s)) continue;
    list.push(s);
  }
  return list;
}

export function pickTarget(r, attackerSeat) {
  const list = opponentsOf(r, attackerSeat);
  return list.length > 0 ? list[0] : null;
}

export function bothPartnersPassed(r) {
  if (!r.field) return false;
  const a = r.field.attacker, b = partnerOf(a);
  const aDone = r.players[a].out || r.field.passedSeats.includes(a);
  const bDone = r.players[b].out || r.field.passedSeats.includes(b);
  return aDone && bDone;
}