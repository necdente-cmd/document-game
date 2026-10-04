import { RV } from '../../constants.js';
import { partnerOf, isKozir } from '../../utils.js';
import { cardValue, getDocs, isDoc } from '../cards.js';
import { pDefenderBeats } from './probabilities.js';
import { pickExactWinner, isEndgame } from './endgame.js';
import { shouldPlayAggressive } from './evaluate.js';

function blog(room, seat, msg) {
  console.log(`[${room.players[seat].name}] ${msg}`);
}

function isExpensiveTrump(card, room) {
  return isKozir(card, room) && RV[card.r] >= RV['Q'];
}

export function tryEndgameLead(room, botSeat) {
  if (!isEndgame(room)) return null;
  const winner = pickExactWinner(room, botSeat);
  if (winner) {
    blog(room, botSeat, `Endgame: гарантированный заход ${winner.r}${winner.s}`);
    return [winner.id];
  }
  return null;
}

export function pickLeadCards(room, botSeat, memory, profile) {
  const endgameChoice = tryEndgameLead(room, botSeat);
  if (endgameChoice) return endgameChoice;

  const bot = room.players[botSeat];
  const myDoc = getDocs(room)[bot.team];
  const aggressive = shouldPlayAggressive(room, botSeat);

  // Док нельзя заходить (правило игры). Козыри не трогаем.
  const allCand = bot.hand.filter(c => c.r !== myDoc);
  if (!allCand.length) return [];

  const nonTrump = allCand.filter(c => !isKozir(c, room));
  const endgameish = isEndgame(room);
  const safeCand = nonTrump.length > 0
    ? nonTrump
    : allCand.filter(c => !isExpensiveTrump(c, room) || endgameish);

  const cand = safeCand.length > 0 ? safeCand : allCand;
  if (!cand.length) return [];

  const defenderSlot = (botSeat + 1) % 4;

  let best = null, bestScore = Infinity, bestInfo = '';
  for (const c of cand) {
    const val = cardValue(c, room, botSeat);
    const risk = pDefenderBeats(room, botSeat, defenderSlot, c);
    const kozirPenalty = isKozir(c, room) ? 80 : 0;
    const riskWeight = aggressive ? 20 : 50;
    const score = val + kozirPenalty + risk * riskWeight;
    if (score < bestScore) {
      bestScore = score;
      best = c;
      bestInfo = `val=${val | 0} risk=${(risk * 100) | 0}%`;
    }
  }
  if (!best) return [];

  blog(room, botSeat, `Захожу ${best.r}${best.s} (${bestInfo})`);
  return [best.id];
}

export function pickExtraCards(room, botSeat, memory, profile) {
  if (!room.field) return [];
  const bot = room.players[botSeat];
  const docs = getDocs(room);
  const myDoc = docs[bot.team];
  const defender = room.players[room.field.defender];
  const defDoc = docs[defender.team];

  const space = room.field.limit - room.field.cards.length;
  if (space <= 0) return [];

  const ranksOnTable = new Set();
  for (const e of room.field.cards) {
    ranksOnTable.add(e.card.r);
    if (e.beatenBy) ranksOnTable.add(e.beatenBy.r);
  }

  const dumpMode = room.field.defenderGaveUp || room.field.askMore;

  // 🚫 Свой док и козыри не подкидываем НИКОГДА
  const cand = bot.hand.filter(c => {
    if (c.r === myDoc) return false;
    if (isKozir(c, room)) return false;
    if (c.r === defDoc && defDoc !== myDoc) return true;
    return ranksOnTable.has(c.r);
  });

  if (!cand.length) return [];

  cand.sort((a, b) => cardValue(a, room, botSeat) - cardValue(b, room, botSeat));

  const defHand = defender.hand.length;
  const aggressive = dumpMode || defHand <= 3 || shouldPlayAggressive(room, botSeat);
  const threshold = aggressive ? 80 : 40 + profile.attackThreshold * 30;

  const chosen = [];
  for (const c of cand) {
    if (chosen.length >= space) break;
    const val = cardValue(c, room, botSeat);
    if (!aggressive && val > threshold) continue;
    chosen.push(c);
  }

  if (chosen.length > 0) {
    blog(room, botSeat, `Подкидываю: ${chosen.map(c => c.r + c.s).join(' ')}${dumpMode ? ' (мусор)' : ''}`);
  }
  return chosen.map(c => c.id);
}