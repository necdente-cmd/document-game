// 🇷🇺 Русское отображение рангов карт
// Данные на сервере остаются J/Q/K/A — это только для UI
const RANK_MAP = {
  'J': 'В',
  'Q': 'Д',
  'K': 'К',
  'A': 'Т',
};

export function rankDisplay(r) {
  return RANK_MAP[r] || r;
}

export function rankLadderDisplay(ladder) {
  return (ladder || []).map(rankDisplay).join(' · ');
}