import * as mode4 from './4-players.js';
import * as mode3 from './3-players.js';
import * as mode2 from './2-players.js';

// Режим по общему количеству активных игроков
export function getMode(r) {
  const active = r.players.filter(p => !p.out).length;
  if (active >= 4) return mode4;
  if (active === 3) return mode3;
  return mode2;
}