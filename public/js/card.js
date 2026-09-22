import { state } from './state.js';

export const esc = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[c]));

export function cardPath(card, opts) {
  const style = (opts && opts.deckStyle) || 'figures';
  const suitMap = { '♠':'spade', '♥':'heart', '♦':'diamond', '♣':'club' };
  const rankMap = { '6':'6','7':'7','8':'8','9':'9','10':'10','J':'11','Q':'12','K':'13','A':'1' };
  const s = suitMap[card.s], r = rankMap[card.r];
  if (style === 'simple') return `/cards/simplecard_${s}_${r}.png`;
  return `/cards/card_${s}_${r}.png`;
}

export function backPath(opts) {
  const color = (opts && opts.backColor) || 'blue';
  return `/cards/${color}_back_suits_dark.png`;
}

export function cardHtml(card, options = {}) {
  const opts = options.deckStyle ? options : (state.server ? state.server.opts : {});
  const file = cardPath(card, opts);
  const cls = ['card', options.cls || ''].filter(Boolean).join(' ');
  const style = options.style ? ` style="${options.style}"` : '';
  const dataAttrs = `data-id="${card.id}"` + (options.dataIndex !== undefined ? ` data-index="${options.dataIndex}"` : '');
  return `<div class="${cls}" ${dataAttrs}${style}>
    <img src="${file}" alt="${card.r}${card.s}" draggable="false">
  </div>`;
}

export function beatsUI(card, target, trumpSuit) {
  const RV = { '6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
  const kA = card.s === trumpSuit;
  const kB = target.s === trumpSuit;
  if (kA && !kB) return true;
  if (!kA && kB) return false;
  if (card.s !== target.s) return false;
  return RV[card.r] > RV[target.r];
}

export function posClass(seat) {
  if (!state.server) return 'top';
  const mySeat = state.server.mySeat;
  return ['bottom','right','top','left'][((seat - mySeat + 4) % 4)] || 'top';
}

// ==================== ВЕЕР КАРТ (портрет) ====================
export function renderHandFan(cards, options = {}) {
  const n = cards.length;
  if (n === 0) return '';

  const myDoc = options.myDoc || '';
  const oppDoc = options.oppDoc || '';
  const selected = options.selected || new Set();
  const isDealing = options.isDealing || false;

  // Шаг = 80% ширины карты (видно 80% каждой карты)
  const step = 0.8;
  // Угол ±7° на крайних (6–8°)
  const maxAngle = 7;
  // Слабая дуга — 8px
  const arcHeight = 8;

  return cards.map((c, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;         // 0..1
    // Смещение относительно центра в долях ширины карты
    const xPct = (t - 0.5) * (n - 1) * step;
    const angle = (t - 0.5) * maxAngle * 2;
    const lift = Math.sin(t * Math.PI) * arcHeight;

    const cls = [
      selected.has(c.id) ? 'sel' : '',
      c.r === myDoc ? 'doc' : '',
      (c.r === oppDoc && oppDoc !== myDoc) ? 'opp-doc' : '',
      isDealing ? 'deal' : ''
    ].filter(Boolean).join(' ');

    const style = `transform: translateX(calc(var(--card-w) * ${xPct.toFixed(3)})) translateY(${(-lift).toFixed(1)}px) rotate(${angle.toFixed(2)}deg); z-index: ${i + 1};`;

    return cardHtml(c, { cls, style, dataIndex: i });
  }).join('');
}