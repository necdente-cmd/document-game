import { state } from '../state.js';
import { cardHtml, esc } from '../card.js';
import { socket } from '../socket.js';
import { showReaction } from './reactions.js';
import { t } from '../i18n.js';

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
        <button class="b1" id="confirmPassBtn">${t('common.confirm')}</button>
        <button class="b2" id="cancelPassBtn">${t('common.reject')}</button>
      </div>`;
    } else if (iAmRequester) {
      inner = `<div class="ov-wait">${t('ov.passDocs.waitConfirm')}</div>`;
    } else if (iAmPartner) {
      inner = `<div class="ov-wait">${t('ov.passDocs.waitPartner')}</div>`;
    } else {
      inner = `<div class="ov-wait">${t('ov.passDocs.wait')}</div>`;
    }
    html += `<div class="overlay">
      <div class="ov-title">${t('ov.passDocs.title', { name: requester?.name || '?' })}</div>
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
        ? `<div class="ov-wait">${t('ov.swap.partnerAsk')}</div>
           <div class="ov-buttons">
             <button class="b1" id="swapAcceptBtn">${t('common.yes')}</button>
             <button class="b2" id="swapRejectBtn">${t('common.no')}</button>
           </div>`
        : `<div class="ov-wait">${t('ov.swap.waitPartner')}</div>`;
    } else {
      inner = iCanConfirm
        ? `<div class="ov-wait">${t('ov.swap.opponentConfirm')}</div>
           <div class="ov-buttons">
             <button class="b1" id="swapConfirmBtn">${t('common.confirm')}</button>
           </div>`
        : `<div class="ov-wait">${t('ov.swap.wait')}</div>`;
    }
    html += `<div class="overlay">
      <div class="ov-title">${t('ov.swap.title', { from: fromP?.name || '?', to: toP?.name || '?' })}</div>
      ${inner}
    </div>`;
  }

  // Старт нового кона
  const startPending = s.pendingStart;
  if (startPending && s.phase === 'roundEnd' && myTeam === startPending.winningTeam) {
    html += `<div class="overlay">
      <div class="ov-title">${t('ov.start.title')}</div>
      <div class="ov-buttons">
        <button class="b1" id="startMeBtn">${t('ov.start.me', { name: meP?.name || '' })}</button>
        <button class="b1" id="startPartnerBtn">${t('ov.start.partner', { name: myPartner?.name || '?' })}</button>
      </div>
    </div>`;
  }

  return html;
}

export function bindOverlays() {
  const g = id => document.getElementById(id);

  const cp = g('confirmPassBtn'); if (cp) cp.onclick = () => socket.emit('passDocsConfirm');
  const xp = g('cancelPassBtn');  if (xp) xp.onclick = () => socket.emit('passDocsCancel');
  const sacc = g('swapAcceptBtn'); if (sacc) sacc.onclick = () => socket.emit('swapAccept');
  const srej = g('swapRejectBtn'); if (srej) srej.onclick = () => socket.emit('swapReject');
  const sc = g('swapConfirmBtn');  if (sc) sc.onclick = () => socket.emit('swapConfirm');
  const sm = g('startMeBtn');      if (sm) sm.onclick = () => socket.emit('chooseStart', { seat: state.server.mySeat });
  const sp = g('startPartnerBtn'); if (sp) sp.onclick = () => socket.emit('chooseStart', { seat: (state.server.mySeat + 2) % 4 });
}

// ==================== ЖИВЫЕ РЕАКЦИИ ====================
window.addEventListener('reaction', (e) => {
  const { seat, emoji } = e.detail;
  showReaction(seat, emoji);
});