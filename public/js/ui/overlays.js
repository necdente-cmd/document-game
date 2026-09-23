import { state } from '../state.js';
import { cardHtml, esc } from '../card.js';
import { socket } from '../socket.js';

// Главная функция — возвращает HTML всех активных оверлеев
export function buildOverlays() {
  const s = state.server;
  if (!s) return '';

  const mySeat = s.mySeat;
  const myTeam = s.myTeam;
  const meP = s.players.find(p => p.seat === mySeat);
  const myPartnerSeat = (mySeat + 2) % 4;
  const myPartner = s.players.find(p => p.seat === myPartnerSeat);

  let html = '';

  // Передача документов
  const passPending = s.pendingPass;
  if (passPending) {
    const requester = s.players.find(p => p.seat === passPending.seat);
    const requesterTeam = requester?.team ?? -1;
    const iAmRequester = passPending.seat === mySeat;
    const iAmPartner = ((passPending.seat + 2) % 4) === mySeat;
    const iCanConfirm = !iAmRequester && !iAmPartner && myTeam !== requesterTeam;
    let inner = '';
    if (iCanConfirm) {
      inner = `<div class="ov-buttons">
        <button class="b1" id="confirmPassBtn">✅ Подтвердить</button>
        <button class="b2" id="cancelPassBtn">✖ Отклонить</button>
      </div>`;
    } else if (iAmRequester) {
      inner = `<div class="ov-wait">Ожидание подтверждения…</div>`;
    } else if (iAmPartner) {
      inner = `<div class="ov-wait">Ждём подтверждения противника…</div>`;
    } else {
      inner = `<div class="ov-wait">Ожидание…</div>`;
    }
    html += `<div class="overlay">
      <div class="ov-title">📢 ${esc(requester?.name || '?')} передаёт документы партнёру</div>
      <div class="ov-cards">${passPending.cards.map(c => cardHtml(c)).join('')}</div>
      ${inner}
    </div>`;
  }

  // Своп
  const swapPending = s.pendingSwap;
  if (swapPending) {
    const fromP = s.players.find(p => p.seat === swapPending.from);
    const toP = s.players.find(p => p.seat === swapPending.to);
    const iCanConfirm = swapPending.stage === 'opponentConfirm' && myTeam !== swapPending.team;
    const iCanDecide = swapPending.stage === 'partnerConfirm' && swapPending.to === mySeat;
    let inner = '';
    if (swapPending.stage === 'partnerConfirm') {
      inner = iCanDecide
        ? `<div class="ov-wait">Партнёр просит вернуть его. Отдадите все свои карты?</div>
           <div class="ov-buttons">
             <button class="b1" id="swapAcceptBtn">✅ Да</button>
             <button class="b2" id="swapRejectBtn">✖ Нет</button>
           </div>`
        : `<div class="ov-wait">Ожидание решения партнёра…</div>`;
    } else {
      inner = iCanConfirm
        ? `<div class="ov-wait">Хозяева передают карты. Подтвердите факт.</div>
           <div class="ov-buttons">
             <button class="b1" id="swapConfirmBtn">✅ Подтвердить</button>
           </div>`
        : `<div class="ov-wait">Ожидание…</div>`;
    }
    html += `<div class="overlay">
      <div class="ov-title">🔄 Своп: ${esc(fromP?.name || '?')} ↔ ${esc(toP?.name || '?')}</div>
      ${inner}
    </div>`;
  }

  // Фальш
  const falshPending = s.pendingFalsh;
  if (falshPending) {
    const iAmOwner = falshPending.owner === mySeat;
    const iAmDefender = falshPending.defender === mySeat;
    if (iAmOwner) {
      const defenderP = s.players.find(p => p.seat === falshPending.defender);
      const fcard = s.field?.cards.find(c => c.card.id === falshPending.cardId)?.card;
      html += `<div class="overlay" style="border-color:#e74c3c;">
        <div class="ov-title" style="color:#e74c3c;">🃏 ${esc(defenderP?.name || '?')} требует фальш</div>
        <div class="ov-cards">${fcard ? cardHtml(fcard) : ''}</div>
        <div class="ov-buttons">
          <button class="b1" id="falshAcceptBtn">✅ Принять</button>
          <button class="b3" id="falshRejectBtn">❌ Отказать</button>
        </div>
      </div>`;
    } else if (iAmDefender) {
      html += `<div class="overlay" style="border-color:#e74c3c;">
        <div class="ov-title" style="color:#e74c3c;">🃏 Ожидание ответа хозяина карты…</div>
      </div>`;
    }
  }

  // Выбор начала кона
  const startPending = s.pendingStart;
  if (startPending && s.phase === 'roundEnd' && myTeam === startPending.winningTeam) {
    html += `<div class="overlay">
      <div class="ov-title">🏆 Вы выиграли кон! Кто зайдёт в следующем?</div>
      <div class="ov-buttons">
        <button class="b1" id="startMeBtn">Я (${esc(meP?.name || '')})</button>
        <button class="b1" id="startPartnerBtn">Партнёр (${esc(myPartner?.name || '?')})</button>
      </div>
    </div>`;
  }

  return html;
}

// Привязка обработчиков оверлеев после рендера
export function bindOverlays() {
  const g = id => document.getElementById(id);

  const cp = g('confirmPassBtn'); if (cp) cp.onclick = () => socket.emit('passDocsConfirm');
  const xp = g('cancelPassBtn');  if (xp) xp.onclick = () => socket.emit('passDocsCancel');
  const sacc = g('swapAcceptBtn'); if (sacc) sacc.onclick = () => socket.emit('swapAccept');
  const srej = g('swapRejectBtn'); if (srej) srej.onclick = () => socket.emit('swapReject');
  const sc = g('swapConfirmBtn');  if (sc) sc.onclick = () => socket.emit('swapConfirm');
  const fa = g('falshAcceptBtn');  if (fa) fa.onclick = () => socket.emit('falshAccept');
  const fr = g('falshRejectBtn');  if (fr) fr.onclick = () => socket.emit('falshReject');
  const sm = g('startMeBtn');      if (sm) sm.onclick = () => socket.emit('chooseStart', { seat: state.server.mySeat });
  const sp = g('startPartnerBtn'); if (sp) sp.onclick = () => socket.emit('chooseStart', { seat: (state.server.mySeat + 2) % 4 });
}

// ==================== ЖИВЫЕ РЕАКЦИИ ====================
window.addEventListener('reaction', (e) => {
  const { seat, emoji } = e.detail;
  if (!state.server) return;
  const table = document.getElementById('table');
  if (!table) return;

  // Якорь: аватар игрока, или (для себя) область руки
  let r;
  const avatarEl = document.querySelector(`.seat[data-seat="${seat}"] .avatar`);
  if (avatarEl) {
    r = avatarEl.getBoundingClientRect();
  } else {
    const hand = document.getElementById('hand');
    r = hand ? hand.getBoundingClientRect()
             : { left: innerWidth/2, top: innerHeight-100, width: 0, height: 0 };
  }
  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;

  const el = document.createElement('div');
  el.className = 'reaction-fly';
  el.textContent = emoji;
  el.style.left = cx + 'px';
  el.style.top  = cy + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
});