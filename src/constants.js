export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const RV = Object.fromEntries(RANKS.map((r, i) => [r, 6 + i]));

export const LADDERS = {
  classic: ['6', '10', 'J', 'Q', 'K', 'A'],
  short:   ['6', '10', 'Q', 'A'],
};

export const MAX_ATTACK = 6;
export const HAND_SIZE = 6;
export const PORT = process.env.PORT || 3000;
export const DISCONNECT_TIMEOUT_MS = 30 * 60 * 1000;
export const SWAP_TIMEOUT_MS = 60 * 1000;

export const EMOJIS = [
  '👍','😂','😡','😭','🔥','💪','🤔','😎',
  '👏','😱','🤝','🎯','😤','🙈','💯','⚡',
];
