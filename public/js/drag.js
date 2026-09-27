import { state, vibrate } from './state.js';
import { socket } from './socket.js';
import { beatsUI } from './card.js';
import { toastErr } from './ui/toast.js';

let drag = null;
const MAGNET_RADIUS = 70;      // радиус примагничивания к карте врага
const DRAG_THRESHOLD = 6;      // порог, после которого начинается драг (px)
const FINGER_OFFSET = 55;      // на сколько поднять карту над пальцем (px)
const RETURN_MS = 280;

export function initDrag(onRender) {
  const hand = document.getElementById('hand');
  if (!hand) return;

  hand.addEventListener('pointerdown', e => {
    const el = e.target.closest('.card');
    if (!el) return;
    const s = state.server;
    if (!s || s.phase !== 'playing') return;

    const rect = el.getBoundingClientRect();
    drag = {
      cardId: el.dataset.id,
      el,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startLeft: rect.left,
      startTop: rect.top,
      isDragging: false,
      pointerId: e.pointerId,
      raf: 0,
      lastX: 0,
      lastY: 0,
    };
    try { el.setPointerCapture(e.pointerId); } catch {}
  });

  document.addEventListener('pointermove', e => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!drag.isDragging && dist > DRAG_THRESHOLD) {
      drag.isDragging = true;
      drag.el.style.position = 'fixed';
      drag.el.style.left = drag.startLeft + 'px';
      drag.el.style.top  = drag.startTop + 'px';
      drag.el.style.pointerEvents = 'none';
      drag.el.classList.add('dragging');
      vibrate(15);
    }
    if (!drag.isDragging) return;

    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    if (drag.raf) return;
    drag.raf = requestAnimationFrame(() => {
      if (!drag) return;
      drag.raf = 0;
      const x = drag.lastX - drag.offsetX;
      const y = drag.lastY - drag.offsetY - FINGER_OFFSET;
      drag.el.style.left = x + 'px';
      drag.el.style.top  = y + 'px';
      highlightAt(drag.lastX, drag.lastY);
    });
  });

  document.addEventListener('pointerup', e => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.raf) { cancelAnimationFrame(drag.raf); drag.raf = 0; }
    const wasDragging = drag.isDragging;
    const cardId = drag.cardId;
    const el = drag.el;
    const targetLeft = drag.startLeft;
    const targetTop  = drag.startTop;
    const dropX = e.clientX;
    const dropY = e.clientY;

    clearHighlight();

    if (wasDragging) {
      const handled = handleDrop(dropX, dropY, cardId);
      if (!handled) {
        animateReturn(el, targetLeft, targetTop);
      } else {
        el.classList.remove('dragging');
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        el.style.pointerEvents = '';
      }
      vibrate(30);
    } else {
      // короткий тап — без вибрации
      el.classList.remove('dragging');
      handleTap(cardId, onRender);
    }
    drag = null;
  });

  document.addEventListener('pointercancel', () => {
    if (!drag) return;
    if (drag.raf) { cancelAnimationFrame(drag.raf); drag.raf = 0; }
    animateReturn(drag.el, drag.startLeft, drag.startTop);
    clearHighlight();
    drag = null;
  });
}

// ====== ПЛАВНЫЙ ВОЗВРАТ КАРТЫ В РУКУ ======
function animateReturn(el, left, top) {
  if (!el) return;
  el.style.transition = `left ${RETURN_MS}ms cubic-bezier(.2,.8,.3,1),
                         top ${RETURN_MS}ms cubic-bezier(.2,.8,.3,1),
                         transform ${RETURN_MS}ms,
                         opacity ${RETURN_MS}ms`;
  el.style.left = left + 'px';
  el.style.top  = top + 'px';
  el.style.transform = 'scale(.4)';
  el.style.opacity = '0';
  setTimeout(() => {
    el.classList.remove('dragging');
    el.style.transition = '';
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.transform = '';
    el.style.opacity = '';
    el.style.pointerEvents = '';
  }, RETURN_MS + 20);
}

// ====== ПОДСВЕТКА ЦЕЛИ ======
function highlightAt(x, y) {
  clearHighlight();
  const s = state.server;
  if (!s) return;

  // Защитник — ищем ближайшую непобитую карту врага
  if (s.field && s.field.defender === s.mySeat) {
    const nearest = nearestFieldSlot(x, y, s);
    if (nearest && nearest.dist < MAGNET_RADIUS) nearest.slot.classList.add('drag-over');
    return;
  }

  // Атакующий / партнёр — подсветка поля
  if (!canActOnField(s)) return;
  const center = document.querySelector('.center');
  if (!center) return;
  const rect = center.getBoundingClientRect();
  if (x >= rect.left - 80 && x <= rect.right + 80 &&
      y >= rect.top - 120 && y <= rect.bottom + 80) {
    center.classList.add('drag-over-field');
  }
}

function clearHighlight() {
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.querySelectorAll('.drag-over-field').forEach(el => el.classList.remove('drag-over-field'));
}

function canActOnField(s) {
  const attackerSeat = s.field?.attacker;
  const partnerSeat = attackerSeat !== undefined ? (attackerSeat + 2) % 4 : -1;
  const isFirstAttack = !s.field && s.turnSeat === s.mySeat;
  const isPitchingIn = s.field && (s.mySeat === attackerSeat || s.mySeat === partnerSeat);
  return isFirstAttack || isPitchingIn;
}

function nearestFieldSlot(x, y, s) {
  let best = null, bestDist = Infinity;
  document.querySelectorAll('[data-field-card]').forEach(slot => {
    const fid = slot.dataset.fieldCard;
    const entry = s.field.cards.find(e => e.card.id === fid && !e.beatenBy);
    if (!entry || entry.isForced || entry.card.r === s.docs[s.myTeam]) return;
    const rect = slot.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const d = Math.hypot(x - cx, y - cy);
    if (d < bestDist) { best = { slot, entry }; bestDist = d; }
  });
  return best ? { ...best, dist: bestDist } : null;
}

// ====== DROP ======
function handleDrop(x, y, cardId) {
  const s = state.server;
  if (!s) return false;
  const card = s.myHand.find(c => c.id === cardId);
  if (!card) return false;

  // --- Защитник ---
  if (s.field && s.field.defender === s.mySeat) {
    const nearest = nearestFieldSlot(x, y, s);
    if (!nearest || nearest.dist >= MAGNET_RADIUS) return false;
    const myDoc = s.docs[s.myTeam];
    if (nearest.entry.isForced) { toastErr('Навязанный документ — только поднять'); return false; }
    if (nearest.entry.card.r === myDoc) { toastErr('Ваш документ — только поднять'); return false; }
    if (card.r === myDoc && card.s !== s.trumpSuit) { toastErr('Свой документ бьёт только козырем'); return false; }
    if (!beatsUI(card, nearest.entry.card, s.trumpSuit)) { toastErr('Не бьёт'); return false; }
    rememberFly(cardId);
    socket.emit('defend', { targetId: nearest.entry.card.id, withId: cardId });
    return true;
  }

  // --- Атакующий / партнёр ---
  if (!canActOnField(s)) return false;
  const center = document.querySelector('.center');
  if (!center) return false;
  const rect = center.getBoundingClientRect();
  const inField = x >= rect.left - 80 && x <= rect.right + 80 &&
                  y >= rect.top - 120 && y <= rect.bottom + 80;
  if (inField) {
    rememberFly(cardId);
    socket.emit('attack', { cardIds: [cardId] });
    return true;
  }
  return false;
}

function rememberFly(cardId) {
  const srcEl = document.querySelector(`#hand .card[data-id="${cardId}"]`);
  if (!srcEl) return;
  const r = srcEl.getBoundingClientRect();
  state.pendingFly = { cardId, from: { left: r.left, top: r.top, w: r.width, h: r.height } };
}

// ====== ТАП-ТАП ======
function handleTap(cardId, onRender) {
  const s = state.server;
  if (!s) return;

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

  if (state.selected.has(cardId)) state.selected.delete(cardId);
  else state.selected.add(cardId);
  if (onRender) onRender();
}