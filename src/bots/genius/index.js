import { partnerOf, bothPartnersPassed } from '../../utils.js';
import { getDocs } from '../cards.js';
import { pickLeadCards } from './attack.js';
import { defendDecision } from './defend.js';
import { passDecision } from './pass.js';
import { iAmSoloOnTeam } from './partnership.js';

function onlyDocs(room, seat) {
  const p = room.players[seat];
  const doc = getDocs(room)[p.team];
  return p.hand.length > 0 && p.hand.every(c => c.r === doc);
}

export function botDecideGenius(room, botSeat, memory, profile) {
  const bot = room.players[botSeat];
  if (!bot) return [];

  if (bot.out) {
    const partner = room.players[partnerOf(botSeat)];
    if (!partner || partner.out) return [];
    if (room.field) return [];
    if (room.turnSeat !== partner.seat) return [];
    if (room.swapUsedByTeam[bot.team]) return [];
    if (room.pendingSwap) return [];
    return [{ action: 'swapAsk' }];
  }

  if (room.field) {
    const f = room.field;

    if (f.defender === botSeat) {
      if (f.defenderGaveUp) return [];
      const hasUnbeaten = f.cards.some(e => !e.beatenBy);
      if (!hasUnbeaten) {
        if (bothPartnersPassed(room)) {
          const hasDocOnTable = f.cards.some(e => e.card.r === getDocs(room)[bot.team]);
          if (hasDocOnTable) return [{ action: 'pickUp' }];
          return [{ action: 'bito' }];
        }
        return [];
      }
      return [defendDecision(room, botSeat, memory, profile)];
    }

    const attacker = f.attacker;
    const partner = partnerOf(attacker);
    if (botSeat === attacker || botSeat === partner) {
      if (f.passedSeats.includes(botSeat)) return [];
      const d = passDecision(room, botSeat, memory, profile);
      return d ? [d] : [];
    }
    return [];
  }

  if (room.turnSeat !== botSeat) return [];

  // Только доки?
  if (onlyDocs(room, botSeat)) {
    const partner = room.players[partnerOf(botSeat)];
    if (partner && partner.out) return [{ action: 'throwDocs' }];
    if (partner && !partner.out) return [{ action: 'passDocsRequest' }];
    return [];
  }

  // Своп если партнёр вышел и у нас сильная рука
  const partner = room.players[partnerOf(botSeat)];
  if (partner && partner.out && !room.swapUsedByTeam[bot.team]) {
    const trumps = bot.hand.filter(c => c.s === room.trumpSuit).length;
    // 🆕 Только при сильной руке + если у нас >=3 козырей или >=2 крупных
    const strongTrumps = bot.hand.filter(c => c.s === room.trumpSuit && ['Q','K','A'].includes(c.r)).length;
    if (trumps >= 3 || strongTrumps >= 2) {
      return [{ action: 'swapInitiate' }];
    }
  }

  const ids = pickLeadCards(room, botSeat, memory, profile);
  if (!ids.length) return [];
  return [{ action: 'attack', cardIds: ids }];
}