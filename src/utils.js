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

export function opponentsOf(r, attackerSeat) {
  const partner = partnerOf(attackerSeat);
  const list = [];
  for (let i = 1; i <= 3; i++) {
    const s = (attackerSeat - i + 4) % 4;
    if (s === partner) continue;
    if (r.players[s].out) continue;
    list.push(s);
  }
  return list;
}

export function pickTarget(r, attackerSeat) {
  const opps = opponentsOf(r, attackerSeat);
  if (opps.length === 0) return null;
  if (opps.length === 1) return opps[0];
  if (r.lastAttacker != null && partnerOf(r.lastAttacker) === attackerSeat
      && r.lastTarget != null && opps.includes(r.lastTarget)) return r.lastTarget;
  if (r.lastTarget != null && opps.includes(r.lastTarget)) {
    const idx = opps.indexOf(r.lastTarget);
    return opps[(idx + 1) % opps.length];
  }
  return opps[0];
}

export function bothPartnersPassed(r) {
  if (!r.field) return false;
  const a = r.field.attacker, b = partnerOf(a);
  const aDone = r.players[a].out || r.field.passedSeats.includes(a);
  const bDone = r.players[b].out || r.field.passedSeats.includes(b);
  return aDone && bDone;
}