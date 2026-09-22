import { HAND_SIZE, SWAP_TIMEOUT_MS } from '../constants.js';
import { shuffle, makeDeck } from '../utils.js';
import { docsOf, log, clearSwapTimer } from '../rooms.js';

export function startRound(r, starterSeat = 0) {
  clearSwapTimer(r);
  r.deck = shuffle(makeDeck());
  r.trumpCard = r.deck.shift();
  r.trumpSuit = r.trumpCard.s;
  r.field = null;
  r.pendingPass = null;
  r.pendingSwap = null;
  r.pendingStart = null;
  r.pendingFalsh = null;
  r.lastAttacker = null;
  r.lastTarget = null;
  r.forcedTarget = null;
  r.swapUsedByTeam = [false, false];
  if (!r.gameStartTime) r.gameStartTime = Date.now();
  r.phase = 'playing';

  for (const p of r.players) { p.hand = []; p.out = false; }
  for (let i = 0; i < HAND_SIZE; i++)
    for (const p of r.players) p.hand.push(r.deck.pop());

  r.turnSeat = starterSeat;
  const d = docsOf(r);
  log(r, `Козырь ${r.trumpSuit}. Док: A=${d[0]}, B=${d[1]}. Старт: ${r.players[starterSeat].name}`);
}

export function drawTo(r, prioritySeat = null) {
  const order = [];
  if (prioritySeat !== null && r.players[prioritySeat] && !r.players[prioritySeat].out) {
    order.push(prioritySeat);
  }
  let s = prioritySeat !== null ? prioritySeat : 0;
  for (let i = 0; i < 4; i++) {
    s = (s + 1) % 4;
    if (!r.players[s].out && !order.includes(s)) order.push(s);
  }

  let changed = true;
  while (changed && r.deck.length > 0) {
    changed = false;
    for (const seat of order) {
      const p = r.players[seat];
      if (p.hand.length < HAND_SIZE && r.deck.length > 0) {
        p.hand.push(r.deck.pop());
        changed = true;
      }
    }
  }

  if (r.deck.length === 0 && r.trumpCard) {
    let target = null;
    for (const seat of order) {
      const p = r.players[seat];
      if (p.hand.length < HAND_SIZE) { target = p; break; }
    }
    if (!target && order.length > 0) target = r.players[order[0]];
    if (target) {
      target.hand.push(r.trumpCard);
      r.trumpCard = null;
      log(r, `Козырная карта → ${target.name}`);
    }
  }
}