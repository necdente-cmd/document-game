import { state } from './state.js';

// Экранирование HTML
export const esc = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[c]));

// Стили карт → путь к PNG
export function cardPath(card, opts) {
  const style = (opts && opts.deckStyle) || 'figures';
  const suitMap = { '♠':'spade', '♥':'heart', '♦':'diamond', '♣':'club' };
  const rankMap = { '6':'6','7':'7','8':'8','9':'9','10':'10','J':'11','Q':'12','K':'13','A':'1' };
  const s = suitMap[card.s], r = rankMap[card.r];
  if (style === 'simple') return `/cards/simplecard_${s}_${r}.png`;
  return `/cards/card_${s}_${r}.png`;
}

// Путь к рубашке
export function backPath(opts) {
  const color = (opts && opts.backColor) || 'blue';
  return `/cards/${color}_back_suits_dark.png`;
}

// Рендер одной карты
export function cardHtml(card, options = {}) {
  const opts = options.deckStyle ? options : (state.server ? state.server.opts : {});
  const file = cardPath(card, opts);
  const cls = ['card', options.cls || ''].filter(Boolean).join(' ');
  return `<div class="${cls}" data-id="${card.id}">
    <img src="${file}" alt="${card.r}${card.s}" draggable="false">
  </div>`;
}

// Логика "бьёт ли карта карту" (для UI)
export function beatsUI(card, target, trumpSuit) {
  const RV = { '6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
  const kA = card.s === trumpSuit;
  const kB = target.s === trumpSuit;
  if (kA && !kB) return true;
  if (!kA && kB) return false;
  if (card.s !== target.s) return false;
  return RV[card.r] > RV[target.r];
}

// Позиция места игрока относительно меня
export function posClass(seat) {
  if (!state.server) return 'top';
  const mySeat = state.server.mySeat;
  return ['bottom','right','top','left'][((seat - mySeat + 4) % 4)] || 'top';
}