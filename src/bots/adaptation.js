import { cardValue, isKozir } from './cards.js';
import { partnerOf } from '../utils.js';
import { log as rlog } from '../rooms.js';

// Хранилище: botId → статистика
const adaptationByBot = new Map();

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function getAdaptation(botId) {
  if (!adaptationByBot.has(botId)) {
    adaptationByBot.set(botId, {
      attacks: { total: 0, sumValue: 0, trumps: 0, pairs: 0 },
      defends: {
        total: 0,
        beats: 0,
        pickups: 0,
        sumFieldBeat: 0,
        sumFieldPickup: 0,
        expensiveTrump: 0,
      },
      extras: { total: 0, sumCount: 0, junk: 0 },
      passes: { afterOne: 0, afterTwo: 0, afterThreePlus: 0, total: 0 },
      lastAdaptedProfile: null,
      observations: 0,
    });
  }
  return adaptationByBot.get(botId);
}

export function resetAdaptation(botId) {
  adaptationByBot.delete(botId);
}

/**
 * Единая точка: вызывать из actions.js после действия партнёра-ЧЕЛОВЕКА.
 * Итерирует по ботам, чей партнёр = actorSeat, и записывает действие.
 */
export function noteForBotsWhosePartnerIs(r, actorSeat, action, meta = {}) {
  const actor = r.players[actorSeat];
  if (!actor || actor.isBot) return; // только за человеком наблюдаем

  for (const bot of r.players) {
    if (!bot.isBot) continue;
    if (partnerOf(bot.seat) !== actorSeat) continue;
    recordPartnerAction(bot, action, { ...meta, room: r, botSeat: bot.seat });
  }
}

export function recordPartnerAction(bot, action, meta = {}) {
  const ad = getAdaptation(bot.id);
  ad.observations++;

  switch (action) {
    case 'attack': {
      ad.attacks.total++;
      const { cards, room, botSeat } = meta;
      if (cards && cards.length > 0 && room && botSeat != null) {
        const avg = cards.reduce((s, c) => s + cardValue(c, room, botSeat), 0) / cards.length;
        ad.attacks.sumValue += avg;
        if (cards.some(c => c.s === room.trumpSuit)) ad.attacks.trumps++;
        if (cards.length >= 2 && cards[0].r === cards[1].r) ad.attacks.pairs++;
      }
      break;
    }

    case 'defend': {
      ad.defends.total++;
      ad.defends.beats++;
      const { fieldValue, usedExpensiveTrump } = meta;
      if (typeof fieldValue === 'number') ad.defends.sumFieldBeat += fieldValue;
      if (usedExpensiveTrump) ad.defends.expensiveTrump++;
      break;
    }

    case 'pickup': {
      ad.defends.total++;
      ad.defends.pickups++;
      const { fieldValue } = meta;
      if (typeof fieldValue === 'number') ad.defends.sumFieldPickup += fieldValue;
      break;
    }

    case 'extra': {
      ad.extras.total++;
      const { count, isJunk } = meta;
      if (typeof count === 'number') ad.extras.sumCount += count;
      if (isJunk) ad.extras.junk++;
      break;
    }

    case 'pass': {
      ad.passes.total++;
      const { fieldCount } = meta;
      if (fieldCount <= 1) ad.passes.afterOne++;
      else if (fieldCount === 2) ad.passes.afterTwo++;
      else ad.passes.afterThreePlus++;
      break;
    }
  }
}

/**
 * Возвращает адаптированный профиль (копию baseProfile с изменёнными параметрами).
 * Требует ≥10 наблюдений, иначе возвращает baseProfile как есть.
 */
export function computeAdaptedProfile(baseProfile, bot) {
  if (!bot) return baseProfile;
  const ad = getAdaptation(bot.id);
  if (ad.observations < 10) return baseProfile;

  // 1) Агрессивность атаки ← средняя ценность заходов партнёра
  const avgLeadValue = ad.attacks.total > 0
    ? ad.attacks.sumValue / ad.attacks.total
    : 40;
  // avgLeadValue от 15 (мелкие) до 100 (крупные) → маппим на 0.2..0.9
  const observedAggression = clamp((avgLeadValue - 15) / 85, 0.2, 0.9);

  // 2) Упорство защиты ← % отбитий vs подъёмов
  const beatRatio = ad.defends.total > 0
    ? ad.defends.beats / ad.defends.total
    : 0.5;
  const observedStubbornness = clamp(beatRatio, 0.2, 0.9);

  // 3) Терпимость к риску ← то же + % использования Q/K/A
  const trumpUse = ad.defends.total > 0
    ? ad.defends.expensiveTrump / ad.defends.total
    : 0;
  const observedRisk = clamp(0.3 + trumpUse * 0.6, 0.2, 0.8);

  // 4) Партнёрство ← как часто партнёр подкидывает
  const avgExtras = ad.extras.total > 0 ? ad.extras.sumCount / ad.extras.total : 1;
  const observedPartnership = clamp(0.3 + (avgExtras - 1) * 0.3, 0.2, 0.9);

  // 5) Скидывание мусора ← % мусорных подкидываний
  const junkRatio = ad.extras.total > 0 ? ad.extras.junk / ad.extras.total : 0.5;
  const observedDump = clamp(junkRatio, 0.2, 0.9);

  // 🎯 Плавное смещение: 60% наблюдаемое + 40% базовое
  // Так бот не «метается» от одного действия
  const adapt = (base, observed) => clamp(base * 0.4 + observed * 0.6, 0.2, 0.9);

  return {
    ...baseProfile,
    attackAggression: adapt(baseProfile.attackAggression ?? 0.5, observedAggression),
    defendStubbornness: adapt(baseProfile.defendStubbornness ?? 0.5, observedStubbornness),
    riskTolerance: adapt(baseProfile.riskTolerance ?? 0.5, observedRisk),
    partnership: adapt(baseProfile.partnership ?? 0.5, observedPartnership),
    dumpJunk: adapt(baseProfile.dumpJunk ?? 0.5, observedDump),
    // Помечаем что профиль адаптирован
    _adapted: true,
    _observations: ad.observations,
  };
}

/**
 * Лог для отладки — показывает текущую статистику и адаптированные параметры.
 */
export function logAdaptationStatus(bot, baseProfile) {
  const ad = getAdaptation(bot.id);
  const adapted = computeAdaptedProfile(baseProfile, bot);
  if (!adapted._adapted) return;

  console.log(`[${bot.name}] 🎓 Адаптация к партнёру (${ad.observations} наблюдений):`);
  console.log(`  attackAggression:   ${baseProfile.attackAggression?.toFixed(2) ?? '?'} → ${adapted.attackAggression.toFixed(2)}`);
  console.log(`  defendStubbornness: ${baseProfile.defendStubbornness?.toFixed(2) ?? '?'} → ${adapted.defendStubbornness.toFixed(2)}`);
  console.log(`  riskTolerance:      ${baseProfile.riskTolerance?.toFixed(2) ?? '?'} → ${adapted.riskTolerance.toFixed(2)}`);
  console.log(`  partnership:        ${baseProfile.partnership?.toFixed(2) ?? '?'} → ${adapted.partnership.toFixed(2)}`);
  console.log(`  dumpJunk:           ${baseProfile.dumpJunk?.toFixed(2) ?? '?'} → ${adapted.dumpJunk.toFixed(2)}`);
}