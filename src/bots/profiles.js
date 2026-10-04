export const PROFILES = {
  aggressive: {
    key: 'aggressive',
    name: 'Агрессивный',
    icon: '⚔',
    attackThreshold: 0.35,
    defendThreshold: 0.75,
    riskAversion: 0.2,
    partnerWeight: 0.5,
  },
  cautious: {
    key: 'cautious',
    name: 'Осторожный',
    icon: '🛡',
    attackThreshold: 0.7,
    defendThreshold: 0.3,
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

// 🎬 Профиль для всех ботов в симуляции (честный тест)
// Меняй на 'aggressive' или 'cautious' для сравнения
export const SIM_PROFILE_KEY = 'balanced';

export function getRandomProfile() {
  const keys = Object.keys(PROFILES);
  return { ...PROFILES[keys[(Math.random() * keys.length) | 0]] };
}

export function getProfileByKey(key) {
  return { ...(PROFILES[key] || PROFILES.balanced) };
}