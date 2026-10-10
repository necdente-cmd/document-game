import { RV, LADDERS } from '../../constants.js';
import { partnerOf, isKozir } from '../../utils.js';
import { cardValue, getDocs } from '../cards.js';
import { pDefenderBeats } from './probabilities.js';
import { pickExactWinner, isEndgame } from './endgame.js';
import { shouldPlayAggressive } from './evaluate.js';
import { partnerNeedsHelp, isSafeExtraForPartner } from './partnership.js';
import { log as rlog } from '../../rooms.js';

function blog(room, seat, msg) {
  const name = room.players[seat]?.name || `seat${seat}`;
  rlog(room, `[${name}] ${msg}`);
}

function isExpensiveTrump(card, room) {
  return isKozir(card, room) && RV[card.r] >= RV['Q'];
}

function canForceDoc(room, botSeat, defSeat) {
  const ladder = LADDERS[room.opts.docSet];
  const myDoc = ladder[room.teamStep[botSeat % 2]];
  const defDoc = ladder[room.teamStep[defSeat % 2]];
  return ladder.indexOf(myDoc) > ladder.indexOf(defDoc);
}

// ==================== ENDGAME ====================
export function tryEndgameLead(room, botSeat) {
  if (!isEndgame(room)) return null;
  const winner = pickExactWinner(room, botSeat);
  if (winner) {
    blog(room, botSeat, `Endgame: гарантированный заход ${winner.r}${winner.s}`);
    return [winner.id];
  }
  return null;
}

// ==================== ЗАХОД (первая атака) ====================
export function pickLeadCards(room, botSeat, memory, profile) {
  const endgameChoice = tryEndgameLead(room, botSeat);
  if (endgameChoice) return endgameChoice;

  const bot = room.players[botSeat];
  if (!bot) return [];

  const myTeam = botSeat % 2;
  const docs = getDocs(room);
  const myDoc = docs[myTeam];
  if (!myDoc) return [];

  const defenderSlot = (botSeat + 1) % 4;
  const defender = room.players[defenderSlot];
  const defenderCards = defender ? defender.hand.length : 0;
  const aggressive = shouldPlayAggressive(room, botSeat);

  // Все некозырные не-док карты
  const nonTrump = bot.hand.filter(c => c.r !== myDoc && !isKozir(c, room));
  const allCand = bot.hand.filter(c => c.r !== myDoc);

  // 🆕 Стратегия выбора:
  //  - Если врагов мало (<=3) → давим крупными
  //  - Если врагов много (>=5) → тихая разведка мелкими
  //  - Если есть пара одного ранга → заходим парой
  //  - Иначе — золотая середина по формуле

  let pool = nonTrump.length > 0 ? nonTrump : allCand;
  if (!pool.length) return [];

  // 🆕 Давим крупными если враг слаб
  if (aggressive && defenderCards <= 3) {
    // Ищем самую дорогую некозырную
    let best = null, bestVal = -1;
    for (const c of pool) {
      const v = cardValue(c, room, botSeat);
      if (v > bestVal) { bestVal = v; best = c; }
    }
    if (best) {
      blog(room, botSeat, `Захожу крупной ${best.r}${best.s} (враг слаб, val=${bestVal|0})`);
      return [best.id];
    }
  }

  // Обычный режим — ищем самую «безопасную» дешёвую
  let best = null, bestScore = Infinity, bestInfo = '';
  for (const c of pool) {
    const val = cardValue(c, room, botSeat);
    const risk = pDefenderBeats(room, botSeat, defenderSlot, c);
    const kozirPenalty = isKozir(c, room) ? 100 : 0;
    // 🆕 Меньше рискуем в начале игры, больше — в эндшпиле
    const riskWeight = aggressive ? 15 : 45;
    const score = val + kozirPenalty + risk * riskWeight;
    if (score < bestScore) {
      bestScore = score;
      best = c;
      bestInfo = `val=${val | 0} risk=${(risk * 100) | 0}%`;
    }
  }
  if (!best) return [];

  // 🆕 Заходим парой того же ранга (если есть и защитник может отбить 2)
  const sameRank = pool.filter(c => c.r === best.r && c.id !== best.id);
  if (sameRank.length > 0 && defenderCards >= 2) {
    const pair = [best, sameRank[0]];
    blog(room, botSeat, `Захожу парой ${best.r}${best.s}+${sameRank[0].s} (${bestInfo})`);
    return pair.map(c => c.id);
  }

  blog(room, botSeat, `Захожу ${best.r}${best.s} (${bestInfo})`);
  return [best.id];
}

// ==================== ПОДКИДЫВАНИЕ ====================
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

  // Кандидаты
  const cand = bot.hand.filter(c => {
    if (c.r === myDoc) return false;
    if (isKozir(c, room)) return false;
    if (ranksOnTable.has(c.r)) return true;
    if (canForce && c.r === defDoc) return true;
    return false;
  });

  if (!cand.length) return [];

  // Приоритет: навязанный док > безопасные для партнёра > дешёвые
  cand.sort((a, b) => {
    const aForce = canForce && a.r === defDoc ? 0 : 1;
    const bForce = canForce && b.r === defDoc ? 0 : 1;
    if (aForce !== bForce) return aForce - bForce;
    return cardValue(a, room, botSeat) - cardValue(b, room, botSeat);
  });

  const defHand = defender.hand.length;
  const aggressive = dumpMode || defHand <= 3 || shouldPlayAggressive(room, botSeat);

  // 🆕 Партнёрская логика: если партнёр защитник и вот-вот поднимет — не подкидываем
  const partnerIsDefender = partnerOf(botSeat) === room.field.defender;
  const partnerGiveup = partnerIsDefender && room.field.defenderGaveUp;
  if (partnerGiveup) {
    // Партнёр поднимает — не помогаем врагам, лучше не подкидывать
    return [];
  }

  const chosen = [];
  for (const c of cand) {
    if (chosen.length >= space) break;
    const isForce = canForce && c.r === defDoc;
    if (isForce) {
      chosen.push(c);
      continue;
    }
    const val = cardValue(c, room, botSeat);
    // 🆕 Мусор скидываем охотнее
    const threshold = aggressive ? 80 : 40 + profile.dumpJunk * 30;
    if (!aggressive && val > threshold) continue;
    // 🆕 Если партнёр в защите и не может побить эту карту — не подкидываем
    if (partnerIsDefender && !isSafeExtraForPartner(room, botSeat, c)) {
      continue;
    }
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