import { state } from './state.js';
import { socket } from './socket.js';
import { beatsUI } from './card.js';

let drag = null;

export function initDrag(onRender) {
  const hand = document.getElementById('hand');
  const center = document.querySelector('.center');
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
      onRender,
    };
    el.setPointerCapture(e.pointerId);
  });

  hand.addEventListener('pointermove', e => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!drag.isDragging && dist > 10) {
      drag.isDragging = true;
      drag.el.classList.add('dragging');
    }
    if (drag.isDragging) {
      drag.el.style.left = (e.clientX - drag.offsetX) + 'px';
      drag.el.style.top  = (e.clientY - drag.offsetY) + 'px';
      highlightAt(e.clientX, e.clientY);
    }
  });

  hand.addEventListener('pointerup', e => {
    if (!drag || drag.pointerId !== e.pointerId) return;

    const wasDragging = drag.isDragging;
    const cardId = drag.cardId;
    const el = drag.el;

    el.classList.remove('dragging');
    el.style.left = '';
    el.style.top = '';

    if (wasDragging) {
      handleDrop(e.clientX, e.clientY, cardId, onRender);
    } else {
      handleTap(cardId, onRender);
    }
    clearHighlight();
    drag = null;
  });

  hand.addEventListener('pointercancel', () => {
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

function handleDrop(x, y, cardId, onRender) {
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
      if (entry.card.r === myDoc) return; // свой документ — не бить
      if (card.r === myDoc && card.s !== s.trumpSuit) return;
      if (!beatsUI(card, entry.card, s.trumpSuit)) return;
      socket.emit('defend', { targetId, withId: cardId });
      return;
    }
  }

  // Drop в поле — атака
  const center = document.querySelector('.center');
  if (center) {
    const rect = center.getBoundingClientRect();
    const inField = x >= rect.left - 40 && x <= rect.right + 40 &&
                    y >= rect.top - 40 && y <= rect.bottom + 40;
    if (inField) {
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