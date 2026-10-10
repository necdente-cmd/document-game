import { RV, LADDERS } from '../../constants.js';
import { partnerOf, isKozir } from '../../utils.js';
import { cardValue, getDocs } from '../cards.js';
import { pDefenderBeats } from './probabilities.js';
import { pickExactWinner, isEndgame } from './endgame.js';
import { shouldPlayAggressive } from './evaluate.js';
import { log as rlog } from '../../rooms.js';

function blog(room, seat, msg) {
  const name = room.players[seat]?.name || `seat${seat}`;
  rlog(room, `[${name}] ${msg}`);
}

function isExpensiveTrump(card, room) {
  return isKozir(card, room) && RV[card.r] >= RV['Q'];
}

/**
 * Навязанный документ разрешён ТОЛЬКО если:
 *  - наш док старше дока защитника
 *  - на столе УЖЕ есть карта-док защитника (в непобитой или битой карте)
 */
function canForceDoc(room, botSeat, defSeat) {
  if (!room.field) return false;

  const ladder = LADDERS[room.opts.docSet];
  const myDoc = ladder[room.teamStep[botSeat % 2]];
  const defDoc = ladder[room.teamStep[defSeat % 2]];
  const ourDocIsHigher = ladder.indexOf(myDoc) > ladder.indexOf(defDoc);
  if (!ourDocIsHigher) return false;

  return room.field.cards.some(e =>
    e.card.r === defDoc ||
    (e.beatenBy && e.beatenBy.r === defDoc)
  );
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
  if (!bot) return [];

  const myTeam = botSeat % 2;
  const docs = getDocs(room);
  const myDoc = docs[myTeam];
  if (!myDoc) {
    rlog(room, `[${bot.name}] ⚠ myDoc undefined (team=${myTeam})`);
    return [];
  }

  const aggressive = shouldPlayAggressive(room, botSeat);

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

  // Заход парой того же ранга
  const sameRank = cand.filter(c => c.r === best.r && c.id !== best.id);
  if (sameRank.length > 0 && room.players[defenderSlot]?.hand.length >= 2) {
    const pair = [best, sameRank[0]];
    blog(room, botSeat, `Захожу парой ${best.r}${best.s}+${sameRank[0].s} (${bestInfo})`);
    return pair.map(c => c.id);
  }

  blog(room, botSeat, `Захожу ${best.r}${best.s} (${bestInfo})`);
  return [best.id];
}

export function pickExtraCards(room, botSeat, memory, profile) {
  if (!room.field) return [];
  const bot = room.players[botSeat];
  if (!bot) return [];

  const myTeam = botSeat % 2;
  const docs = getDocs(room);
  const myDoc = docs[myTeam];
  if (!myDoc) return [];

  const defender = room.players[room.field.defender];
  if (!defender) return [];

  const defTeam = defender.team;
  const defDoc = docs[defTeam];

  const space = room.field.limit - room.field.cards.length;
  if (space <= 0) return [];

  const ranksOnTable = new Set();
  for (const e of room.field.cards) {
    ranksOnTable.add(e.card.r);
    if (e.beatenBy) ranksOnTable.add(e.beatenBy.r);
  }

  const dumpMode = room.field.defenderGaveUp || room.field.askMore;
  const canForce = canForceDoc(room, botSeat, room.field.defender);

  const cand = bot.hand.filter(c => {
    if (c.r === myDoc) return false;
    if (isKozir(c, room)) return false;
    if (ranksOnTable.has(c.r)) return true;
    if (canForce && c.r === defDoc) return true;
    return false;
  });

  if (!cand.length) return [];

  cand.sort((a, b) => {
    const aForce = canForce && a.r === defDoc ? 0 : 1;
    const bForce = canForce && b.r === defDoc ? 0 : 1;
    if (aForce !== bForce) return aForce - bForce;
    return cardValue(a, room, botSeat) - cardValue(b, room, botSeat);
  });

  const defHand = defender.hand.length;
  const aggressive = dumpMode || defHand <= 3 || shouldPlayAggressive(room, botSeat);
  const threshold = aggressive ? 80 : 40 + profile.attackThreshold * 30;

  const chosen = [];
  for (const c of cand) {
    if (chosen.length >= space) break;
    const isForce = canForce && c.r === defDoc;
    if (isForce) {
      chosen.push(c);
      continue;
    }
    const val = cardValue(c, room, botSeat);
    if (!aggressive && val > threshold) continue;
    chosen.push(c);
  }

  if (chosen.length > 0) {
    const tag = chosen.some(c => canForce && c.r === defDoc)
      ? ' (НАВЯЗАННЫЙ ДОК)'
      : (dumpMode ? ' (мусор)' : '');
    blog(room, botSeat, `Подкидываю: ${chosen.map(c => c.r + c.s).join(' ')}${tag}`);
  }
  return chosen.map(c => c.id);
}