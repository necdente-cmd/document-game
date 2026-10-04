import { makeDeck } from '../utils.js';

// Память ботов живёт рядом с комнатой. Общая на всех ботов в комнате —
// всё равно они видят одинаковую публичную информацию.
const memoByRoom = new Map();

export function getMemory(room) {
  let m = memoByRoom.get(room.id);
  if (!m) {
    m = { seen: new Set() }; // id карт, которые бот видел покинувшими чью-то руку
    memoByRoom.set(room.id, m);
  }
  return m;
}

export function resetMemory(room) {
  const m = memoByRoom.get(room.id);
  if (m) m.seen.clear();
}

export function clearMemory(room) {
  memoByRoom.delete(room.id);
}

// Вызывать из actions.js: attack, defend, pickUp, askMore (карты со стола).
export function notePlayed(room, card) {
  if (!card || !card.id) return;
  getMemory(room).seen.add(card.id);
}

export function notePlayedBatch(room, cards) {
  for (const c of cards) notePlayed(room, c);
}

// Какие карты бот не видел: не в руке, не сыграны.
// Возвращает массив card-объектов из полной колоды.
export function unseenFromRoom(room, botSeat) {
  const m = getMemory(room);
  const botHand = room.players[botSeat]?.hand || [];
  const known = new Set(m.seen);
  for (const c of botHand) known.add(c.id);
  return makeDeck().filter(c => !known.has(c.id));
}

// Сколько неизвестных карт у противника (эвристика для Smart).
// Приблизительно: totalUnseen - cardsInDeck - cardsInPartnerHand.
// Партнёрские карты бот не видит, поэтому считаем «неизвестное у врагов»:
export function unseenCountForEnemies(room, botSeat) {
  const unseen = unseenFromRoom(room, botSeat);
  const deckLeft = room.deck.length + (room.trumpCard ? 1 : 0);
  const partner = room.players[(botSeat + 2) % 4];
  const partnerHand = partner ? partner.hand.length : 0;
  // Неизвестное у противников ≈ всё, что не ушло в колоду и не у партнёра.
  // Партнёр у нас свой, но мы его руки не знаем, поэтому оставляем ему «долю».
  return Math.max(0, unseen.length - deckLeft - partnerHand);
}