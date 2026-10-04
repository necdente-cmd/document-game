import { RV } from '../../constants.js';
import { partnerOf, isKozir } from '../../utils.js';
import { cardValue, getDocs } from '../cards.js';
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
  if (!bot) return [];

  const myTeam = botSeat % 2;
  const docs = getDocs(room);
  const myDoc = docs[myTeam];
  if (!myDoc) {
    console.error(`[pickLeadCards] ${bot.name}: myDoc undefined (team=${myTeam})`);
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

  blog(room, botSeat, `Захожу ${best.r}${best.s} (${bestInfo})`);
  return [best.id];
}

export function pickExtraCards(room, botSeat, memory, profile) {
  if (!room.field) return [];
  const bot = room.players[botSeat];
  if (!bot) return [];

  // 🔒 Считаем команду и доки через botSeat (не через bot.team, чтобы избежать рассинхрона)
  const myTeam = botSeat % 2;
  const docs = getDocs(room);
  const myDoc = docs[myTeam];
  if (!myDoc) {
    console.error(`[pickExtraCards] ${bot.name}: myDoc undefined (team=${myTeam})`);
    return [];
  }

  const defender = room.players[room.field.defender];
  if (!defender) return [];

  const space = room.field.limit - room.field.cards.length;
  if (space <= 0) return [];

  const ranksOnTable = new Set();
  for (const e of room.field.cards) {
    ranksOnTable.add(e.card.r);
    if (e.beatenBy) ranksOnTable.add(e.beatenBy.r);
  }

  const dumpMode = room.field.defenderGaveUp || room.field.askMore;

  // 🔒 ТОЛЬКО карты того же ранга, что на столе.
  // 🚫 Никогда: свой док, любой козырь.
  // 🚫 Убрано правило "форс-док защитника" — оно давало фальш (6♠ при 7 на столе, если 6 = док).
  const cand = bot.hand.filter(c => {
    if (c.r === myDoc) return false;      // свой док
    if (isKozir(c, room)) return false;   // козырь
    return ranksOnTable.has(c.r);         // только ранг со стола
  });

  // 🛡 Двойная страховка: если вдруг что-то просочилось
  const safeCand = cand.filter(c => {
    if (c.r === myDoc) {
      console.error(`[pickExtraCards] BUG: own doc ${c.r}${c.s} slipped for ${bot.name} (team=${myTeam} myDoc=${myDoc})`);
      return false;
    }
    return true;
  });

  if (!safeCand.length) return [];

  safeCand.sort((a, b) => cardValue(a, room, botSeat) - cardValue(b, room, botSeat));

  const defHand = defender.hand.length;
  const aggressive = dumpMode || defHand <= 3 || shouldPlayAggressive(room, botSeat);
  const threshold = aggressive ? 80 : 40 + profile.attackThreshold * 30;

  const chosen = [];
  for (const c of safeCand) {
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