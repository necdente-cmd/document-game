export const PROFILES = {
  aggressive: {
    key: 'aggressive',
    name: 'Агрессивный',
    icon: '⚔',
    // Характер
    attackAggression: 0.8,      // 0..1 — насколько наступательно атакует
    defendStubbornness: 0.3,    // 0..1 — насколько упорно защищается (0 = поднимает охотно)
    riskTolerance: 0.7,         // 0..1 — терпимость к риску
    partnership: 0.4,           // 0..1 — насколько помогает партнёру
    dumpJunk: 0.3,              // 0..1 — насколько охотно скидывает мусор
  },
  cautious: {
    key: 'cautious',
    name: 'Осторожный',
    icon: '🛡',
    attackAggression: 0.3,
    defendStubbornness: 0.7,    // упорно защищается
    riskTolerance: 0.3,
    partnership: 0.8,           // сильно помогает партнёру
    dumpJunk: 0.7,              // охотно скидывает мусор
  },
  balanced: {
    key: 'balanced',
    name: 'Сбалансированный',
    icon: '⚖',
    attackAggression: 0.55,
    defendStubbornness: 0.5,
    riskTolerance: 0.5,
    partnership: 0.6,
    dumpJunk: 0.5,
  },
};

export const SIM_PROFILE_KEY = 'balanced';

export function getRandomProfile() {
  const keys = Object.keys(PROFILES);
  return { ...PROFILES[keys[(Math.random() * keys.length) | 0]] };
}

export function getProfileByKey(key) {
  return { ...(PROFILES[key] || PROFILES.balanced) };
}