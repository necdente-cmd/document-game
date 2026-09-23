import { state } from './state.js';
import { socket } from './socket.js';
import { beatsUI } from './card.js';

let drag = null;

export function initDrag(onRender) {
  const hand = document.getElementById('hand');
  if (!hand) return;

  hand.addEventListener('pointerdown', e => {
    const el = e.target.closest('.card');
    if (!el) return;
    if (!state.server || state.server.phase !== 'playing') return;

    const rect = el.getBoundingClientRect();
    drag = {
      cardId: el.dataset.id,
      el,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      isDragging: false,
      pointerId: e.pointerId,
    };
  });

  document.addEventListener('pointermove', e => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!drag.isDragging && dist > 4) {
      drag.isDragging = true;
      drag.el.classList.add('dragging');
    }
    if (drag.isDragging) {
      drag.el.style.left = (e.clientX - drag.offsetX) + 'px';
      drag.el.style.top  = (e.clientY - drag.offsetY) + 'px';
      highlightAt(e.clientX, e.clientY);
    }
  });

  document.addEventListener('pointerup', e => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const wasDragging = drag.isDragging;
    const cardId = drag.cardId;
    const el = drag.el;

    el.classList.remove('dragging');
    el.style.left = '';
    el.style.top = '';

    if (wasDragging) {
      handleDrop(e.clientX, e.clientY, cardId);
    } else {
      handleTap(cardId, onRender);
    }
    clearHighlight();
    drag = null;
  });

  document.addEventListener('pointercancel', () => {
    if (!drag) return;
    drag.el.classList.remove('dragging');
    drag.el.style.left = '';
    drag.el.style.top = '';
    clearHighlight();
    drag = null;
  });
}

function elementAt(x, y) {
  if (drag && drag.el) drag.el.style.pointerEvents = 'none';
  const el = document.elementFromPoint(x, y);
  if (drag && drag.el) drag.el.style.pointerEvents = '';
  return el;
}

function highlightAt(x, y) {
  clearHighlight();
  const el = elementAt(x, y);
  if (!el) return;
  const slot = el.closest('[data-field-card]');
  if (slot) slot.classList.add('drag-over');
}

function clearHighlight() {
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// Запомнить позицию карты для анимации полёта
function rememberFly(cardId) {
  const srcEl = document.querySelector(`#hand .card[data-id="${cardId}"]`);
  if (!srcEl) return;
  const r = srcEl.getBoundingClientRect();
  state.pendingFly = {
    cardId,
    from: { left: r.left, top: r.top, w: r.width, h: r.height },
  };
}

function handleDrop(x, y, cardId) {
  const s = state.server;
  if (!s) return;
  const card = s.myHand.find(c => c.id === cardId);
  if (!card) return;

  const el = elementAt(x, y);
  if (!el) return;

  const slot = el.closest('[data-field-card]');

  // Drop на карту врага — защита
  if (slot && s.field) {
    const targetId = slot.dataset.fieldCard;
    const entry = s.field.cards.find(e => e.card.id === targetId && !e.beatenBy);
    if (entry) {
      const myDoc = s.docs[s.myTeam];
      if (entry.card.r === myDoc) return;
      if (card.r === myDoc && card.s !== s.trumpSuit) return;
      if (!beatsUI(card, entry.card, s.trumpSuit)) return;
      rememberFly(cardId);
      socket.emit('defend', { targetId, withId: cardId });
      return;
    }
  }

  // Drop в поле — атака
  const center = document.querySelector('.center');
  if (center) {
    const rect = center.getBoundingClientRect();
    const inField = x >= rect.left - 60 && x <= rect.right + 60 &&
                    y >= rect.top - 60 && y <= rect.bottom + 60;
    if (inField) {
      rememberFly(cardId);
      socket.emit('attack', { cardIds: [cardId] });
      return;
    }
  }
}

function handleTap(cardId, onRender) {
  if (state.selected.has(cardId)) state.selected.delete(cardId);
  else state.selected.add(cardId);
  if (onRender) onRender();
}