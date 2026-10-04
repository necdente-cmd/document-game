export const PROFILES = {
  aggressive: {
    key: 'aggressive',
    name: 'Агрессивный',
    icon: '⚔',
    attackThreshold: 0.35,   // ниже — атакует смелее (больше карт)
    defendThreshold: 0.75,   // выше — отбивается, даже если дорого
    riskAversion: 0.2,
    partnerWeight: 0.5,
  },
  cautious: {
    key: 'cautious',
    name: 'Осторожный',
    icon: '🛡',
    attackThreshold: 0.7,
    defendThreshold: 0.3,    // ниже — чаще поднимает, чтобы не палить карты
    riskAversion: 0.8,
    partnerWeight: 0.8,
  },
  balanced: {
    key: 'balanced',
    name: 'Сбалансированный',
    icon: '⚖',
    attackThreshold: 0.5,
    defendThreshold: 0.55,
    riskAversion: 0.5,
    partnerWeight: 0.65,
  },
};

export function getRandomProfile() {
  const keys = Object.keys(PROFILES);
  return { ...PROFILES[keys[(Math.random() * keys.length) | 0]] };
}