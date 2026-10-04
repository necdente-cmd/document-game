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

  if (style === 'figures' || !style) return `/cards/card_${s}_${r}.png`;
  if (style === 'simple') return `/cards/simplecard_${s}_${r}.png`;

  if (style === 'alt1' || style === 'alt2') {
    const letterMap = { spade:'s', heart:'h', diamond:'d', club:'c' };
    const folder = style === 'alt1' ? 'cards-alt1' : 'cards-alt2';
    return `/${folder}/${r}${letterMap[s]}.png`;
  }

  if (style === 'alt3') {
    const pluralMap = { spade:'spades', heart:'hearts', diamond:'diamonds', club:'clubs' };
    const nameMap = { '1':'ace', '11':'jack', '12':'queen', '13':'king' };
    const rankName = nameMap[r] || r;
    return `/cards-alt3/${rankName}_of_${pluralMap[s]}.png`;
  }

  return `/cards/card_${s}_${r}.png`;
}

export function backPath(opts) {
  const style = (opts && opts.deckStyle) || 'figures';
  if (style === 'alt1') return '/cards-alt1/back.png';
  if (style === 'alt2') return '/cards-alt2/back.png';
  const color = (opts && opts.backColor) || 'blue';
  return `/cards/${color}_back_suits_dark.png`;
}

// ❗ Безопасное экранирование для атрибутов
function attr(v) {
  return String(v).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function cardHtml(card, options = {}) {
  const opts = options.deckStyle ? options : (state.server ? state.server.opts : {});
  const file = cardPath(card, opts);
  const cls = ['card', options.cls || ''].filter(Boolean).join(' ');
  const style = options.style ? ` style="${options.style}"` : '';
  const dataAttrs = `data-id="${attr(card.id)}"` +
    (options.dataIndex !== undefined ? ` data-index="${options.dataIndex}"` : '');

  // Fallback: если PNG не загрузился — превращаем div в серую заглушку с рангом+мастью
  const onerror = `this.onerror=null;this.parentNode.classList.add('card-broken');this.style.display='none';`;

  return `<div class="${cls}" ${dataAttrs}${style} data-rank="${attr(card.r)}" data-suit="${attr(card.s)}">
    <img src="${file}" alt="${attr(card.r)}${attr(card.s)}" draggable="false" onerror="${onerror}">
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

export function renderHandFan(cards, options = {}) {
  const n = cards.length;
  if (n === 0) return '';

  const myDoc = options.myDoc || '';
  const oppDoc = options.oppDoc || '';
  const selected = options.selected || new Set();
  const isDealing = options.isDealing || false;
  const beatsTarget = options.beatsTarget || null;
  const trumpSuit = options.trumpSuit || null;

  const cssW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w'));
  const cardW = cssW > 0 ? cssW : 64;
  const gap = 4;
  const fullStep = cardW + gap;

  const viewportW = window.innerWidth || 400;
  const availW = Math.max(200, viewportW - 160);

  let step;
  if (n === 1) step = 0;
  else step = Math.max(15, Math.min(fullStep, availW / (n - 1)));

  const spread = (n - 1) * step;
  const angleStep = n > 1 ? Math.min(2.5, 15 / n) : 0;
  const arcHeight = 8;

  function cardBeatsIt(c) {
    if (!beatsTarget || !trumpSuit) return false;
    if (c.r === myDoc && c.s !== trumpSuit) return false;
    return beatsUI(c, beatsTarget, trumpSuit);
  }

  return cards.map((c, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const x = -spread / 2 + i * step;
    const angle = (t - 0.5) * angleStep * n / 2;
    const lift = Math.sin(t * Math.PI) * arcHeight;

    const canBeat = cardBeatsIt(c);

    const cls = [
      selected.has(c.id) ? 'sel' : '',
      c.r === myDoc ? 'doc' : '',
      (c.r === oppDoc && oppDoc !== myDoc) ? 'opp-doc' : '',
      isDealing ? 'deal' : '',
      canBeat ? 'can-beat' : '',
    ].filter(Boolean).join(' ');

    const style = `transform: translateX(${x.toFixed(1)}px) translateY(-${lift.toFixed(1)}px) rotate(${angle.toFixed(1)}deg); z-index: ${i + 1};`;
    return cardHtml(c, { cls, style, dataIndex: i });
  }).join('');
}