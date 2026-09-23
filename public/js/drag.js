import { state } from './state.js';
import { socket } from './socket.js';
import { beatsUI } from './card.js';
import { toastErr } from './ui/toast.js';

let drag = null;
const MAGNET_RADIUS = 80;

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

// ====== МАГНИТ: подсветка ближайшей цели ======
function highlightAt(x, y) {
  clearHighlight();
  const s = state.server;
  if (!s) return;

  // Если защитник — ищем ближайшую карту врага
  if (s.field && s.field.defender === s.mySeat) {
    let nearest = null, nearestDist = Infinity;
    document.querySelectorAll('[data-field-card]').forEach(slot => {
      const fid = slot.dataset.fieldCard;
      const entry = s.field.cards.find(e => e.card.id === fid && !e.beatenBy);
      if (!entry) return;
      const rect = slot.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < nearestDist) { nearest = slot; nearestDist = d; }
    });
    if (nearest && nearestDist < MAGNET_RADIUS) nearest.classList.add('drag-over');
    return;
  }

  // Атакующий — подсвечиваем поле
  const center = document.querySelector('.center');
  if (center) {
    const rect = center.getBoundingClientRect();
    if (x >= rect.left - 80 && x <= rect.right + 80 &&
        y >= rect.top - 120 && y <= rect.bottom + 80) {
      center.classList.add('drag-over-field');
    }
  }
}

function clearHighlight() {
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.querySelectorAll('.drag-over-field').forEach(el => el.classList.remove('drag-over-field'));
}

function rememberFly(cardId) {
  const srcEl = document.querySelector(`#hand .card[data-id="${cardId}"]`);
  if (!srcEl) return;
  const r = srcEl.getBoundingClientRect();
  state.pendingFly = { cardId, from: { left: r.left, top: r.top, w: r.width, h: r.height } };
}

// ====== ДРОП: расширенные зоны + магнит ======
function handleDrop(x, y, cardId) {
  const s = state.server;
  if (!s) return;
  const card = s.myHand.find(c => c.id === cardId);
  if (!card) return;

  // Защитник — ищем карту врага в радиусе магнита
  if (s.field && s.field.defender === s.mySeat) {
    let nearest = null, nearestDist = Infinity;
    document.querySelectorAll('[data-field-card]').forEach(slot => {
      const fid = slot.dataset.fieldCard;
      const entry = s.field.cards.find(e => e.card.id === fid && !e.beatenBy);
      if (!entry) return;
      const rect = slot.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const d = Math.hypot(x - cx, y - cy);
      if (d < nearestDist) { nearest = entry; nearestDist = d; }
    });
    if (nearest && nearestDist < MAGNET_RADIUS) {
      const myDoc = s.docs[s.myTeam];
      if (nearest.card.r === myDoc) return toastErr('Ваш документ — только поднять');
      if (card.r === myDoc && card.s !== s.trumpSuit) return toastErr('Свой документ бьёт только козырем');
      if (!beatsUI(card, nearest.card, s.trumpSuit)) return toastErr('Не бьёт');
      rememberFly(cardId);
      socket.emit('defend', { targetId: nearest.card.id, withId: cardId });
      return;
    }
    return;
  }

  // Атакующий — drop в область поля
  const center = document.querySelector('.center');
  if (center) {
    const rect = center.getBoundingClientRect();
    const inField = x >= rect.left - 80 && x <= rect.right + 80 &&
                    y >= rect.top - 120 && y <= rect.bottom + 80;
    if (inField) {
      rememberFly(cardId);
      socket.emit('attack', { cardIds: [cardId] });
      return;
    }
  }
}

// ====== ТАП-ТАП: клик по своей карте ======
function handleTap(cardId, onRender) {
  const s = state.server;
  if (!s) return;

  // Защитник + есть цель → пробуем побить
  if (s.field && s.field.defender === s.mySeat && state.defendTarget) {
    const entry = s.field.cards.find(x => x.card.id === state.defendTarget && !x.beatenBy);
    const myCard = s.myHand.find(c => c.id === cardId);
    if (entry && myCard) {
      const myDoc = s.docs[s.myTeam];
      if (entry.card.r === myDoc) {
        toastErr('Ваш документ — только поднять');
        state.defendTarget = null;
        if (onRender) onRender();
        return;
      }
      if (myCard.r === myDoc && myCard.s !== s.trumpSuit) {
        toastErr('Свой документ бьёт только козырем');
        state.selected.clear();
        state.selected.add(cardId);
        state.defendTarget = null;
        if (onRender) onRender();
        return;
      }
      if (!beatsUI(myCard, entry.card, s.trumpSuit)) {
        toastErr('Эта карта не бьёт');
        state.selected.clear();
        state.selected.add(cardId);
        state.defendTarget = null;
        if (onRender) onRender();
        return;
      }
      state.defendTarget = null;
      state.selected.clear();
      socket.emit('defend', { targetId: entry.card.id, withId: cardId });
      return;
    }
  }

  // Обычный toggle (для мультиатаки)
  if (state.selected.has(cardId)) state.selected.delete(cardId);
  else state.selected.add(cardId);
  if (onRender) onRender();
}