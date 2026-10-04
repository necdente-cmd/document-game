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

// ✅ Противники по часовой от seat (без партнёра, без вышедших)
export function opponentsOf(r, attackerSeat) {
  const partner = partnerOf(attackerSeat);
  const list = [];
  for (let i = 1; i <= 3; i++) {
    const s = (attackerSeat + i) % 4;
    if (s === partner) continue;
    if (r.players[s].out) continue;
    list.push(s);
  }
  return list;
}

// ✅ Выбор цели с чередованием по команде
// teamLastTarget[team] — последний защитник, которого атаковала команда
export function pickTarget(r, attackerSeat) {
  const opps = opponentsOf(r, attackerSeat);
  if (opps.length === 0) return null;
  if (opps.length === 1) return opps[0];

  const team = teamOf(attackerSeat);
  const last = r.teamLastTarget?.[team] ?? null;

  if (last != null && opps.includes(last)) {
    const idx = opps.indexOf(last);
    return opps[(idx + 1) % opps.length];
  }
  return opps[0];
}

// ✅ Определяет, из какого слота игрок атакует
// - Если партнёр в игре → свой слот
// - Если партнёр вышел → чередует между двумя слотами команды
// - forcedSlot (после подотбоя) имеет приоритет
export function getAttackSlot(r, playerSeat, targetSeat) {
  const partnerSeat = partnerOf(playerSeat);
  const partner = r.players[partnerSeat];

  // Партнёр в игре — играет только своим слотом
  if (partner && !partner.out) {
    return playerSeat;
  }

  // Партнёр вышел — играет за двоих
  if (r.forcedSlot != null) return r.forcedSlot;

  const team = teamOf(playerSeat);
  const pair = team === 0 ? [0, 2] : [1, 3];
  const last = r.teamPairLastSlot?.[team] ?? null;

  if (last == null) {
    // Первая атака за двоих — слот, откуда цель достигается первой по часовой
    const wanted = (targetSeat - 1 + 4) % 4;
    if (pair.includes(wanted)) return wanted;
    return pair[0];
  }

  // Чередование между двумя слотами пары
  return pair[0] === last ? pair[1] : pair[0];
}

// ✅ Слот для подотбоя (после БИТО защитник атакует того, кто его атаковал)
export function getPodotboySlot(r, defenderSeat, targetSeat) {
  const wanted = (targetSeat - 1 + 4) % 4;
  const partnerSeat = partnerOf(defenderSeat);
  const pair = [defenderSeat, partnerSeat];
  if (pair.includes(wanted)) return wanted;
  return defenderSeat;
}

export function bothPartnersPassed(r) {
  if (!r.field) return false;
  const a = r.field.attacker, b = partnerOf(a);
  const aDone = r.players[a].out || r.field.passedSeats.includes(a);
  const bDone = r.players[b].out || r.field.passedSeats.includes(b);
  return aDone && bDone;
}