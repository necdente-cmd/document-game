import { state, saveMe, applyTheme, playerState, getAvatar, avatarHtml, savePrefs } from '../state.js';
import { socket, forceRefresh } from '../socket.js';
import { cardHtml, backPath, esc, renderHandFan, beatsUI } from '../card.js';
import { buildOverlays, bindOverlays } from '../ui/overlays.js';
import { maybeShowChampion } from '../ui/champion.js';
import { showHistory } from '../ui/history.js';
import { openSettings } from '../ui/settings.js';
import { openChat } from '../ui/chat.js';
import { initDrag } from '../drag.js';
import { EMOJIS } from '../emojis.js';
import { playSound } from '../sound.js';
import { toastErr, toastOk } from '../ui/toast.js';
import {
  enableVoice, disableVoice, setMicOn, unlockAudio,
  restartVoice, getVoiceDebugInfo, getAudioElements, streamIsLivePublic,
} from '../voice.js';
import { rankDisplay } from '../rank-display.js';
import { t } from '../i18n.js';

let sortMode = 0;
let infoOpen = false;
let iconsVisible = false;
let iconsTimer = null;

function playPendingFly() {
  const pf = state.pendingFly;
  if (!pf) return;
  state.pendingFly = null;
  requestAnimationFrame(() => {
    const newEl = document.querySelector(`.center .card[data-id="${pf.cardId}"]`);
    if (!newEl) return;
    const r = newEl.getBoundingClientRect();
    const dx = pf.from.left - r.left;
    const dy = pf.from.top  - r.top;
    const sx = pf.from.w / r.width;
    const sy = pf.from.h / r.height;
    newEl.style.transition = 'none';
    newEl.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    newEl.style.transformOrigin = 'top left';
    newEl.style.zIndex = '9999';
    newEl.style.pointerEvents = 'none';
    void newEl.offsetHeight;
    newEl.style.transition = 'transform 320ms cubic-bezier(.2,.7,.3,1)';
    newEl.style.transform = '';
    setTimeout(() => {
      newEl.style.transition = '';
      newEl.style.transformOrigin = '';
      newEl.style.zIndex = '';
      newEl.style.pointerEvents = '';
    }, 340);
  });
}

function playDealAnimation() {
  if (!state.dealKey) return;
  const cards = document.querySelectorAll('.hand .card');
  if (!cards.length) return;
  const deckEl = document.querySelector('.deck-area');
  const deckRect = deckEl
    ? deckEl.getBoundingClientRect()
    : { left: 20, top: 20, width: 60, height: 90 };
  const deckCx = deckRect.left + deckRect.width / 2;
  const deckCy = deckRect.top  + deckRect.height / 2;
  cards.forEach((el, i) => {
    const finalTransform = el.style.transform || '';
    const r = el.getBoundingClientRect();
    const cardCx = r.left + r.width / 2;
    const cardCy = r.top  + r.height / 2;
    const dx = deckCx - cardCx;
    const dy = deckCy - cardCy;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.35) rotate(-180deg)`;
    el.style.opacity = '0';
    void el.offsetHeight;
    el.style.transition = 'transform 0.55s cubic-bezier(.2,.7,.3,1), opacity 0.35s';
    const delay = 60 + i * 65;
    setTimeout(() => {
      el.style.transform = finalTransform;
      el.style.opacity = '1';
    }, delay);
    setTimeout(() => { el.style.transition = ''; }, delay + 620);
  });
}

function captureFieldForFly() {
  const fly = state.pendingFieldFly;
  if (!fly || fly.positions) return;
  fly.positions = [];
  document.querySelectorAll('.center .slot').forEach(slot => {
    slot.querySelectorAll('.card').forEach(cardEl => {
      const r = cardEl.getBoundingClientRect();
      const img = cardEl.querySelector('img');
      fly.positions.push({
        src: img ? img.src : '',
        left: r.left, top: r.top, w: r.width, h: r.height,
      });
    });
  });
}

function playPendingFieldFly() {
  const fly = state.pendingFieldFly;
  if (!fly) return;
  state.pendingFieldFly = null;
  if (!fly.positions || !fly.positions.length) return;
  const tableEl = document.getElementById('table');
  const tableRect = tableEl
    ? tableEl.getBoundingClientRect()
    : { right: window.innerWidth, left: 0, top: 0, bottom: window.innerHeight };
  let targetCx, targetCy, rot;
  if (fly.type === 'pickup') {
    const defEl = document.querySelector(`.seat[data-seat="${fly.defenderSeat}"] .avatar`);
    const r = defEl ? defEl.getBoundingClientRect() : null;
    if (r) {
      targetCx = r.left + r.width / 2;
      targetCy = r.top  + r.height / 2;
    } else {
      targetCx = tableRect.right + 60;
      targetCy = tableRect.top + 100;
    }
    rot = -15;
  } else {
    targetCx = tableRect.right + 80;
    targetCy = tableRect.top + 80;
    rot = 25;
  }
  fly.positions.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = p.src;
    img.style.cssText = `
      position: fixed;
      left: ${p.left}px;
      top: ${p.top}px;
      width: ${p.w}px;
      height: ${p.h}px;
      z-index: 9998;
      pointer-events: none;
      border-radius: 6px;
      box-shadow: 0 6px 16px rgba(0,0,0,.5);
      transition: all 0.55s cubic-bezier(.4,0,.5,1);
      transition-delay: ${i * 30}ms;
      will-change: transform, opacity;
    `;
    document.body.appendChild(img);
    requestAnimationFrame(() => {
      const dx = targetCx - (p.left + p.w / 2);
      const dy = targetCy - (p.top  + p.h / 2);
      img.style.transform = `translate(${dx}px, ${dy}px) scale(0.35) rotate(${rot}deg)`;
      img.style.opacity = '0';
    });
    setTimeout(() => img.remove(), 1000 + i * 30);
  });
}

function ensureSwipeIcons() {
  let el = document.getElementById('swipeIcons');
  if (!el) {
    el = document.createElement('div');
    el.id = 'swipeIcons';
    el.className = 'swipe-icons';
    el.innerHTML = `
      <button class="icon-btn" id="refreshBtn" title="Refresh">🔃</button>
      <button class="icon-btn" id="sortBtn" title="Sort">🔄</button>
      <button class="icon-btn" id="emojiToggle" title="Emoji">😀</button>
      <button class="icon-btn" id="chatBtn" title="${t('chat.title')}">💬</button>
      <button class="icon-btn ${infoOpen?'active':''}" id="infoBtn" title="${t('info.title')}">📊</button>
      <button class="icon-btn" id="debugBtn" title="Диагностика">🧪</button>
    `;
    document.body.appendChild(el);
  }
  let micBtn = document.getElementById('micBtn');
  if (!micBtn) {
    micBtn = document.createElement('button');
    micBtn.id = 'micBtn';
    micBtn.title = t('settings.mic');
    el.insertBefore(micBtn, el.querySelector('#chatBtn'));
  }
  micBtn.className = 'icon-btn ' + (
    state.voiceActive ? (state.micOn ? 'voice-on' : 'voice-muted') : ''
  );
  micBtn.textContent = state.voiceActive ? (state.micOn ? '🎤' : '🔇') : '🎤';

  let trig = document.getElementById('swipeTrigger');
  if (!trig) {
    trig = document.createElement('button');
    trig.id = 'swipeTrigger';
    trig.className = 'swipe-trigger';
    trig.textContent = '›';
    document.body.appendChild(trig);
  }
  return el;
}

function showSwipeIcons() {
  const el = document.getElementById('swipeIcons');
  const trig = document.getElementById('swipeTrigger');
  if (!el) return;
  iconsVisible = true;
  el.classList.add('show');
  if (trig) trig.classList.add('hidden');
  if (iconsTimer) clearTimeout(iconsTimer);
  iconsTimer = setTimeout(hideSwipeIcons, 4000);
}

function hideSwipeIcons() {
  const el = document.getElementById('swipeIcons');
  const trig = document.getElementById('swipeTrigger');
  if (!el) return;
  iconsVisible = false;
  el.classList.remove('show');
  if (trig) trig.classList.remove('hidden');
  if (iconsTimer) { clearTimeout(iconsTimer); iconsTimer = null; }
}

let swipeSetupDone = false;
function setupSwipe() {
  if (swipeSetupDone) return;
  swipeSetupDone = true;
  let startX = 0, started = false;
  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.card')) return;
    if (e.target.closest('.swipe-icons')) return;
    if (e.target.closest('.emoji-bar')) return;
    if (e.target.closest('.chat-panel')) return;
    if (e.target.closest('.info-modal')) return;
    if (e.target.closest('.swipe-trigger')) return;
    if (e.target.closest('.settings-btn')) return;
    const x = e.touches[0].clientX;
    if (x < 40) { startX = x; started = true; }
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!started) return;
    const dx = e.touches[0].clientX - startX;
    if (dx > 50) { showSwipeIcons(); started = false; }
    else if (dx < -30 && iconsVisible) { hideSwipeIcons(); started = false; }
  }, { passive: true });
  document.addEventListener('touchend', () => { started = false; }, { passive: true });
  document.addEventListener('click', (e) => {
    if (!iconsVisible) return;
    if (e.target.closest('.swipe-icons')) return;
    if (e.target.closest('.emoji-bar')) return;
    if (e.target.closest('.chat-panel')) return;
    if (e.target.closest('.info-modal')) return;
    if (e.target.closest('.swipe-trigger')) return;
    hideSwipeIcons();
  }, true);
  document.addEventListener('click', (e) => {
    if (e.target.closest('#swipeTrigger')) showSwipeIcons();
  }, true);
}

function showInfoModal() {
  const s = state.server;
  if (!s) return;
  const myTeam = s.myTeam;
  const myDoc = rankDisplay(s.docs[myTeam]);
  const oppDoc = rankDisplay(s.docs[1 - myTeam]);
  const el = document.createElement('div');
  el.className = 'info-modal';
  el.id = 'infoModal';
  el.innerHTML = `
    <div class="info-modal-inner">
      <h3>${t('info.title')}</h3>
      <div class="info-row"><span>${t('info.trump')}</span><b>${esc(s.trumpSuit || '—')}</b></div>
      <div class="info-row"><span>${t('info.myDoc')}</span><b>${esc(myDoc)}</b></div>
      <div class="info-row"><span>${t('info.oppDoc')}</span><b>${esc(oppDoc)}</b></div>
      <div class="info-row"><span>${t('info.score')}</span><b>${s.roundWins[0]} : ${s.roundWins[1]}</b></div>
      <button class="info-modal-close" id="infoClose">${t('common.close')}</button>
    </div>
  `;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.onclick = (e) => { if (e.target === el) close(); };
  document.getElementById('infoClose').onclick = close;
}

// 🧪 Диагностика голосового чата
function showVoiceDebug() {
  const el = document.createElement('div');
  el.className = 'simple-modal';
  el.style.zIndex = 99999;
  el.innerHTML = `
    <div class="simple-modal-inner" style="max-width:600px; font-family:monospace; font-size:12px;">
      <h3 style="font-family:inherit;">🧪 Диагностика голосового чата</h3>
      <div id="debugContent" style="max-height:70vh; overflow-y:auto; background:#000; color:#0f0; padding:12px; border-radius:8px; line-height:1.5; white-space:pre-wrap; word-break:break-all;"></div>
      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="simple-modal-close-btn" id="debugRestart" style="background:#e67e22; color:#fff;">🔄 Перезапустить голос</button>
        <button class="simple-modal-close-btn" id="debugCopy" style="background:#3498db; color:#fff;">📋 Копировать</button>
        <button class="simple-modal-close-btn" id="debugClose">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick = (e) => { if (e.target === el) el.remove(); };
  document.getElementById('debugClose').onclick = () => el.remove();
  document.getElementById('debugCopy').onclick = () => {
    const text = document.getElementById('debugContent').textContent;
    navigator.clipboard.writeText(text).then(() => {
      document.getElementById('debugCopy').textContent = '✅ Скопировано';
      setTimeout(() => document.getElementById('debugCopy').textContent = '📋 Копировать', 1500);
    });
  };
  document.getElementById('debugRestart').onclick = async () => {
    if (!confirm('Перезапустить голосовой чат?')) return;
    const btn = document.getElementById('debugRestart');
    btn.textContent = '⏳ Перезапуск…';
    try {
      await restartVoice();
      btn.textContent = '✅ Готово';
      setTimeout(() => { el.remove(); }, 1000);
    } catch (e) {
      btn.textContent = '❌ Ошибка';
    }
  };

  let info = '';
  info += '=== ДИАГНОСТИКА VOICE ===\n';
  info += 'Time: ' + new Date().toLocaleTimeString() + '\n\n';
  info += '=== USER AGENT ===\n' + navigator.userAgent + '\n\n';
  info += '=== MIC STATE ===\n';
  info += 'state.micOn: ' + (state.micOn ? '✅' : '❌') + '\n';
  info += 'state.voiceActive: ' + (state.voiceActive ? '✅' : '❌') + '\n';
  info += 'streamIsLive: ' + (streamIsLivePublic() ? '✅' : '❌') + '\n\n';
  info += '=== SOCKET ===\n';
  info += 'Connected: ' + (window.socket?.connected ? '✅' : '❌') + '\n';
  info += 'Socket ID: ' + (window.socket?.id || '—') + '\n';
  info += 'Me ID: ' + (state.me?.id || '—') + '\n';
  info += 'Room: ' + (state.me?.roomId || '—') + '\n\n';
  info += '=== PLAYERS ===\n';
  if (state.server?.players) {
    state.server.players.forEach(p => {
      info += `  ${p.name} (seat ${p.seat}) voiceEnabled: ${p.voiceEnabled ? '✅' : '❌'}\n`;
    });
  } else { info += '  — нет данных\n'; }
  info += '\n=== ACTIVE PEERS ===\n';
  const peersDebug = getVoiceDebugInfo();
  if (peersDebug.length === 0) {
    info += '  — нет активных соединений\n';
  } else {
    peersDebug.forEach(p => {
      info += `  ${p.id}: ICE=${p.ice}, Conn=${p.conn}, Signal=${p.signal}\n`;
    });
  }
  info += '\n=== AUDIO ELEMENTS ===\n';
  const audios = getAudioElements();
  if (audios.length === 0) info += '  — нет audio элементов\n';
  else audios.forEach(a => {
    info += `  ${a.id}: paused=${a.paused} muted=${a.muted} vol=${a.volume} hasSrc=${a.hasSrc} tracks=${a.srcTracks}\n`;
  });
  info += '\n=== TURN CREDENTIALS ===\n';
  fetch('/api/turn-test')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => { info += '✅ Ответ:\n' + JSON.stringify(data, null, 2) + '\n\n'; updateDebugContent(info); })
    .catch(e => { info += '❌ ' + e.message + '\n\n'; updateDebugContent(info); });

  info += '=== MIC TEST ===\n';
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const tracks = stream.getAudioTracks();
      info += '✅ getUserMedia OK, tracks: ' + tracks.length + '\n';
      tracks.forEach(t => { info += `  ${t.label || 'audio'} enabled=${t.enabled}\n`; });
      stream.getTracks().forEach(t => t.stop());
      updateDebugContent(info);
    })
    .catch(e => { info += '❌ ' + e.name + ' — ' + e.message + '\n'; updateDebugContent(info); });

  updateDebugContent(info);

  function updateDebugContent(text) {
    const content = document.getElementById('debugContent');
    if (content) content.textContent = text;
  }
}

function sortHand(hand, myDoc, trumpSuit) {
  const RV = { '6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
  const SO = { '♠':0, '♥':1, '♦':2, '♣':3 };
  const arr = [...hand];
  const isDoc = c => c.r === myDoc;
  const isKoz = c => c.s === trumpSuit;
  arr.sort((a, b) => {
    const aD = isDoc(a), bD = isDoc(b);
    if (aD && !bD) return -1;
    if (!aD && bD) return 1;
    if (aD && bD) return SO[a.s] - SO[b.s];
    if (sortMode === 0) {
      if (RV[b.r] !== RV[a.r]) return RV[b.r] - RV[a.r];
      return SO[a.s] - SO[b.s];
    }
    if (sortMode === 1) {
      if (SO[a.s] !== SO[b.s]) return SO[a.s] - SO[b.s];
      return RV[a.r] - RV[b.r];
    }
    const aK = isKoz(a), bK = isKoz(b);
    if (aK && !bK) return -1;
    if (!aK && bK) return 1;
    return RV[a.r] - RV[b.r];
  });
  return arr;
}

export function renderTable(app, navigate) {
  const s = state.server;
  if (!s) return;

  captureFieldForFly();
  applyTheme(s.opts.theme);
  setupSwipe();

  const mySeat = s.mySeat;
  const myTeam = s.myTeam;
  const myDoc = s.docs[myTeam];
  const oppDoc = s.docs[1 - myTeam];
  const meP = s.players.find(p => p.seat === mySeat);
  const iAmOut = meP?.out;
  const isMyTurn = s.turnSeat === mySeat;
  const canDefend = s.field && s.field.defender === mySeat;
  const isPlaying = s.phase === 'playing';
  const isDealing = state.dealKey > 0;

  const attackerSeat = s.field?.attacker;
  const partnerSeat = attackerSeat !== undefined ? (attackerSeat + 2) % 4 : -1;
  const attackerP = attackerSeat !== undefined ? s.players.find(p => p.seat === attackerSeat) : null;
  const partnerP  = partnerSeat !== -1 ? s.players.find(p => p.seat === partnerSeat) : null;
  const attackerOut = attackerP?.out || false;
  const partnerOutV = partnerP?.out || false;
  const isAttacker = attackerSeat === mySeat && !iAmOut;
  const isPartnerOfAttacker = partnerSeat === mySeat && !iAmOut;
  const passedSeats = s.field?.passedSeats || [];
  const iHavePassed = passedSeats.includes(mySeat);
  const attackerPassed = attackerOut || (attackerSeat !== undefined && passedSeats.includes(attackerSeat));
  const partnerPassed = partnerOutV || (partnerSeat !== -1 && passedSeats.includes(partnerSeat));
  const bothPassed = !!(s.field && attackerPassed && partnerPassed);

  const myPartnerSeat = (mySeat + 2) % 4;
  const myPartner = s.players.find(p => p.seat === myPartnerSeat);
  const partnerIsOut = myPartner ? myPartner.out : true;

  const waitingForSeat = s.players.find(p => !p.connected && !p.out && (
    (s.phase === 'playing') &&
    ((s.field && s.field.defender === p.seat) || (!s.field && s.turnSeat === p.seat))
  ))?.seat;

  const myTurnNow = isPlaying && isMyTurn && !iAmOut && !s.pendingPass && !s.pendingSwap;
  const iAmDefending = isPlaying && canDefend && !s.pendingPass && !s.pendingSwap;

  // 🎯 Вдогонку? — защитник не может побить ни одну непобитую
  let canAskMore = false;
  if (canDefend && s.field && !s.field.askMore) {
    const unbeaten = s.field.cards.filter(x => !x.beatenBy && !x.isForced && x.card.r !== myDoc);
    if (unbeaten.length > 0) {
      let canBeatAny = false;
      for (const entry of unbeaten) {
        for (const c of s.myHand) {
          if (c.r === myDoc && c.s !== s.trumpSuit) continue;
          if (beatsUI(c, entry.card, s.trumpSuit)) { canBeatAny = true; break; }
        }
        if (canBeatAny) break;
      }
      if (!canBeatAny) canAskMore = true;
    }
  }

  // ==================== ЛОББИ ====================
  let lobbyBar = '';
  if (s.phase === 'lobby') {
    const playersCount = s.players.length;
    const maxP = s.opts.maxPlayers;
    const isHost = meP?.isHost;
    const emptySlots = Math.max(0, maxP - playersCount);

    const playerCards = s.players.map(p => `
      <div class="wp-card ${p.isHost?'host':''}">
        <div class="wp-avatar">${avatarHtml(getAvatar(p.seat))}</div>
        <div class="wp-name">${esc(p.name)}</div>
        ${p.isHost ? `<div class="wp-host">${t('lobby.host')}</div>` : ''}
      </div>
    `).join('');

    const emptyCards = Array.from({ length: emptySlots }).map(() => `
      <div class="wp-card wp-empty">
        <div class="wp-avatar">·</div>
        <div class="wp-name">${t('lobby.waitingSlot')}</div>
      </div>
    `).join('');

    lobbyBar = `
      <div class="waiting">
        <img src="/logo.png" class="lobby-logo" alt="Документ">
        <div class="waiting-label">${t('lobby.roomCode')}</div>
        <button class="waiting-code" id="roomCode" title="${t('lobby.copyCode')}">${esc(s.id)}</button>
        <div class="waiting-players-grid">
          ${playerCards}${emptyCards}
        </div>
        ${playersCount === maxP ? `
          <div class="seat-order-block">
            <div class="so-title">${t('lobby.seating')}${isHost ? ' ' + t('lobby.seatingHint') : ''}</div>
            <div class="so-grid">
              ${[0,1,2,3].map(slot => {
                const posName = ['A1','B2','A3','B4'][slot];
                const teamCls = slot % 2 === 0 ? 'team-a' : 'team-b';
                const playerAtSlot = s.players.find(p => p.seat === slot);
                if (!playerAtSlot) return '';
                const avatar = avatarHtml(getAvatar(playerAtSlot.seat));
                const isMe = playerAtSlot.id === meP?.id;
                const isPicked = state.swapPick === playerAtSlot.id;
                const teamIcon = slot % 2 === 0 ? '★' : '✗';
                const clickable = isHost ? 'so-clickable' : '';
                return `
                  <div class="so-player ${teamCls} ${isPicked ? 'picked' : ''} ${clickable}" data-player-id="${playerAtSlot.id}">
                    <span class="so-pos">${posName}</span>
                    <span class="so-avatar">${avatar}</span>
                    <span class="so-name">${esc(playerAtSlot.name)}${isMe ? ' <small>' + t('lobby.you') + '</small>' : ''}</span>
                    <span class="so-team">${teamIcon}</span>
                  </div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
        <div class="waiting-status">
          ${playersCount} / ${maxP} ${t('lobby.players')} ${playersCount < maxP ? '<span class="dots"><span>.</span><span>.</span><span>.</span></span>' : ''}
        </div>
        ${isHost && playersCount === maxP
          ? `<button class="start-big" id="startBtn">${t('lobby.startGame')}</button>`
          : isHost ? `<div class="waiting-hint">${t('lobby.waitingPlayers')}</div>`
          : `<div class="waiting-hint">${t('lobby.waitingHost')}</div>`}
      </div>`;
  }

  let passNotice = '';
  if (s.field && !s.pendingPass && !s.pendingSwap) {
    if (bothPassed) passNotice = `<div class="pass-notice">${t('notice.bothPassed')}</div>`;
    else if (attackerPassed && !partnerOutV && !partnerPassed)
      passNotice = `<div class="pass-notice info">${t('notice.attackerPassed')}</div>`;
    else if (partnerPassed && !attackerOut && !attackerPassed)
      passNotice = `<div class="pass-notice info">${t('notice.partnerPassed')}</div>`;
  }
  if (waitingForSeat !== undefined) {
    const wname = s.players.find(p => p.seat === waitingForSeat)?.name || '?';
    passNotice = `<div class="pass-notice wait">${t('notice.waitingSeat', { name: wname })}</div>`;
  }

  const seats = s.players.filter(p => p.seat !== mySeat).map(p => {
    const isThisInPassed = passedSeats.includes(p.seat);
    const offlineBadge = !p.connected ? `<div class="badge-off">⚠ ${t('state.offline')}</div>` : '';
    const posArr = ['bottom','left','top','right'];
    const pos = posArr[((p.seat - mySeat + 4) % 4)] || 'top';
    const st = playerState(s, p.seat);
    const stCls = st === 'бьёт' ? 'beat' : st === 'думает' ? 'think' : st === 'ходит' ? 'move'
                : st === 'отошёл' ? 'out' : '';
    const isSpeaking = (state.voiceSpeakingSeats || []).includes(p.seat);
    const isPartner = p.team === myTeam;
    let stText = st;
    if (st === 'бьёт')     stText = t('state.beat');
    if (st === 'думает')   stText = t('state.think');
    if (st === 'ходит')    stText = t('state.move');
    if (st === 'поднимает') stText = t('state.pickup');
    if (st === 'вышел')    stText = t('state.out');
    if (st === 'отошёл')   stText = t('state.offline');
    return `
      <div class="seat ${pos} ${p.seat===s.turnSeat?'active':''} ${p.out?'out':''} ${!p.connected?'offline':''} ${isSpeaking?'speaking':''} ${isPartner?'is-partner':'is-enemy'}" data-seat="${p.seat}">
        <div class="name">${esc(p.name)} ${isPartner?'★':'✗'}</div>
        <div class="avatar">${avatarHtml(getAvatar(p.seat))}</div>
        ${st ? `<div class="state ${stCls}">${stText}</div>` : ''}
        ${isThisInPassed ? '<div class="pass-badge">⛔ Пас</div>' : ''}
        ${offlineBadge}
      </div>`;
  }).join('');

  let deckArea = '';
  if (isPlaying || s.phase === 'roundEnd' || s.phase === 'gameEnd') {
    if (s.deckEmpty && s.trumpReminder) {
      const isRed = s.trumpReminder === '♥' || s.trumpReminder === '♦';
      deckArea = `
        <div class="deck-area">
          <div class="trump-reminder ${isRed ? 'red' : 'black'}">${s.trumpReminder}</div>
        </div>`;
    } else {
      const stack = Array.from({ length: 4 }).map((_, i) =>
        `<div class="card back ${isDealing ? 'deal' : ''}" style="top:${i*2}px;left:${i*2}px;z-index:${10+i}">
          <img src="${backPath(s.opts)}" alt="•" draggable="false">
        </div>`).join('');
      deckArea = `
        <div class="deck-area">
          <div class="deck-wrapper">
            <div class="deck-stack">${stack}</div>
            ${s.trumpCard ? `<div class="trump-under">${cardHtml(s.trumpCard)}</div>` : ''}
          </div>
        </div>`;
    }
  }

  const fieldHtml = s.field
    ? s.field.cards.map(e => {
        const canBeTarget = canDefend && !e.beatenBy && e.card.r !== myDoc && !e.isForced;
        const cls = ['slot'];
        if (canBeTarget) cls.push('tappable');
        if (e.isForced) cls.push('forced');
        if (state.defendTarget === e.card.id) cls.push('selected-target');
        return `<div class="${cls.join(' ')}" data-field-card="${e.card.id}">
          ${cardHtml(e.card)}
          ${e.beatenBy ? cardHtml(e.beatenBy, { cls:'beaten' }) : ''}
        </div>`;
      }).join('')
    : `<div style="opacity:.5">—</div>`;

  const onlyDocsNow = s.myHand.length > 0 && s.myHand.every(c => c.r === myDoc);
  const allBeaten = s.field && s.field.cards.length > 0 && s.field.cards.every(x => x.beatenBy);

  let centerActionBtn = '';
  let centerActionCls = 'b2';
  let centerActionId = '';

  if (canDefend && s.field && s.field.cards.length > 0) {
    centerActionBtn = t('btn.pickUp'); centerActionCls = 'b3'; centerActionId = 'pickUpBtn';
  }
  else if (isMyTurn && !iAmOut && !s.field && partnerIsOut && onlyDocsNow) {
    centerActionBtn = t('btn.throwDocs'); centerActionCls = 'b1'; centerActionId = 'throwBtn';
  }
  else if (isMyTurn && !iAmOut && !s.field && partnerIsOut && !s.swapUsedByTeam[myTeam] && !onlyDocsNow && s.myHand.length > 0) {
    centerActionBtn = t('btn.giveCards'); centerActionCls = 'b5'; centerActionId = 'swapInitBtn';
  }
  else if (iAmOut && !partnerIsOut && s.turnSeat === myPartnerSeat && !s.field && !s.swapUsedByTeam[myTeam]) {
    centerActionBtn = t('btn.return'); centerActionCls = 'b5'; centerActionId = 'swapAskBtn';
  }
  else if (isMyTurn && !iAmOut && !s.field && !partnerIsOut && onlyDocsNow) {
    centerActionBtn = t('btn.passDocs'); centerActionCls = 'b2'; centerActionId = 'passBtn';
  }
  else if ((isAttacker || isPartnerOfAttacker) && !iHavePassed) {
    centerActionBtn = t('btn.pass'); centerActionCls = 'b2'; centerActionId = 'pasBtn';
  }

  const extraActions = [];
  if (canDefend && allBeaten && bothPassed && !s.pendingPass && !s.pendingSwap) {
    extraActions.push(`<button class="b1" id="bitoBtn">${t('btn.bito')}</button>`);
  }
  if (canAskMore && !s.pendingPass && !s.pendingSwap) {
    extraActions.push(`<button class="b4" id="askMoreBtn">${t('btn.askMore')}</button>`);
  }

  let beatsTarget = null;
  if (canDefend && state.defendTarget && s.field) {
    const entry = s.field.cards.find(x => x.card.id === state.defendTarget && !x.beatenBy);
    if (entry && !entry.isForced && entry.card.r !== myDoc) beatsTarget = entry.card;
  }

  const sortedHand = sortHand(s.myHand, myDoc, s.trumpSuit);
  const handHtml = renderHandFan(sortedHand, {
    myDoc, oppDoc,
    selected: state.selected,
    isDealing,
    beatsTarget,
    trumpSuit: s.trumpSuit,
  });

  let hintHtml = '';
  if (waitingForSeat !== undefined) {
    hintHtml = `<div class="hint">${t('hint.waitingSeat')}</div>`;
  } else if (canDefend && !bothPassed && !s.pendingPass && !s.pendingSwap) {
    const hasMyDoc = s.field.cards.some(x => !x.beatenBy && x.card.r === myDoc && !x.isForced);
    if (hasMyDoc) hintHtml = `<div class="hint">${t('hint.hasYourDoc')}</div>`;
    else if (state.defendTarget) hintHtml = `<div class="hint">${t('hint.pullCard')}</div>`;
    else hintHtml = `<div class="hint">${t('hint.tapEnemyCard')}</div>`;
  } else if (canDefend && bothPassed) {
    hintHtml = `<div class="hint">${t('hint.decideBito')}</div>`;
  } else if (isAttacker || isPartnerOfAttacker) {
    hintHtml = `<div class="hint">${t('hint.pullToField')}</div>`;
  } else if (isMyTurn) {
    hintHtml = `<div class="hint">${t('hint.yourTurn')}</div>`;
  }

  const emojiPanel = state.emojiOpen ? `<div class="emoji-bar" id="emojiBar">
    ${EMOJIS.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>` : '';

  const overlays = buildOverlays();

  const showScore = isPlaying || s.phase === 'roundEnd';
  const scoreCorner = showScore
    ? `<div class="score-corner">${s.roundWins[myTeam]} : ${s.roundWins[1 - myTeam]}</div>`
    : '';

  let turnBanner = '';
  if (myTurnNow && !s.field) {
    turnBanner = `<div class="turn-banner attack">${t('banner.yourTurn')}</div>`;
  } else if (myTurnNow && s.field && attackerSeat === mySeat) {
    turnBanner = `<div class="turn-banner attack">${t('banner.yourTurnAttack')}</div>`;
  } else if (iAmDefending && !state.defendTarget) {
    turnBanner = `<div class="turn-banner defend">${t('banner.yourDefend')}</div>`;
  } else if (iAmDefending && state.defendTarget) {
    turnBanner = `<div class="turn-banner defend">${t('banner.beatSelected')}</div>`;
  } else if ((isAttacker || isPartnerOfAttacker) && !iHavePassed) {
    turnBanner = `<div class="turn-banner attack-sub">${t('banner.canPass')}</div>`;
  }

  app.innerHTML = `
    <div class="table ${myTurnNow ? 'my-turn' : ''} ${iAmDefending ? 'my-defend' : ''}" id="table">
      ${lobbyBar}
      ${passNotice}
      ${turnBanner}
      ${scoreCorner}
      ${deckArea}

      <button class="settings-btn" id="settingsBtn" title="${t('settings.title')}">⚙️</button>

      ${seats}
      <div class="center">
        ${!s.field ? `<img src="/logo.png" class="field-watermark" alt="">` : ''}
        ${fieldHtml}
      </div>

      ${overlays}
      ${emojiPanel}
    </div>

    <div class="bottom-bar">
      <div class="hand" id="hand">${handHtml}</div>

      <div class="extra-actions">${extraActions.join('')}</div>

      ${centerActionBtn ? `<button class="action-center ${centerActionCls}" id="${centerActionId}">${centerActionBtn}</button>` : ''}
    </div>

    <div class="actions">${hintHtml}</div>
  `;

  playPendingFly();
  playPendingFieldFly();
  playDealAnimation();

  ensureSwipeIcons();
  bindSwipeIconHandlers(app, navigate);
  if (iconsVisible) {
    const el = document.getElementById('swipeIcons');
    if (el) el.classList.add('show');
  }

  const err = (m) => toastErr(m);
  const g = id => document.getElementById(id);

  initDrag(() => renderTable(app, navigate));

  const centerEl = document.querySelector('.center');
  if (centerEl) {
    centerEl.onclick = e => {
      const slot = e.target.closest('[data-field-card]');
      if (slot && canDefend) {
        const fid = slot.dataset.fieldCard;
        const entry = s.field.cards.find(x => x.card.id === fid);
        if (!entry || entry.beatenBy) return;
        if (entry.isForced) return err(t('err.forcedDocPickUpAll'));
        if (entry.card.r === myDoc) return err(t('err.yourDocPickUpAll'));
        state.defendTarget = (state.defendTarget === fid) ? null : fid;
        renderTable(app, navigate);
        return;
      }
      if (!slot && isMyTurn && !iAmOut && !s.field && state.selected.size > 0) {
        const cardIds = [...state.selected];
        state.selected.clear();
        socket.emit('attack', { cardIds });
        return;
      }
    };
  }

  const roomCodeEl = g('roomCode');
  if (roomCodeEl) {
    roomCodeEl.onclick = async () => {
      try {
        await navigator.clipboard.writeText(s.id);
        toastOk(t('toast.codeCopied') + ': ' + s.id);
      } catch {
        toastErr(t('toast.copyFailed'));
      }
    };
  }

  if (meP?.isHost && s.phase === 'lobby') {
    document.querySelectorAll('.so-player').forEach(el => {
      el.onclick = () => {
        const playerId = el.dataset.playerId;
        if (!playerId) return;
        if (!state.swapPick) {
          state.swapPick = playerId;
          playSound('button');
          renderTable(app, navigate);
          return;
        }
        if (state.swapPick === playerId) {
          state.swapPick = null;
          playSound('button');
          renderTable(app, navigate);
          return;
        }
        const p1 = s.players.find(p => p.id === state.swapPick);
        const p2 = s.players.find(p => p.id === playerId);
        if (!p1 || !p2) return;
        const sorted = s.players.slice().sort((a,b) => a.seat - b.seat);
        const order = sorted.map(p => p.id);
        order[p1.seat] = p2.id;
        order[p2.seat] = p1.id;
        state.swapPick = null;
        playSound('falsh');
        socket.emit('setSeatOrder', { order });
      };
    });
  } else {
    state.swapPick = null;
  }

  const st = g('startBtn'); if (st) st.onclick = () => { playSound('button'); socket.emit('startGame'); };

  const pu = g('pickUpBtn');   if (pu) pu.onclick = () => { playSound('button'); socket.emit('pickUp'); state.defendTarget = null; };
  const th = g('throwBtn');    if (th) th.onclick = () => { playSound('button'); socket.emit('throwDocs'); };
  const si = g('swapInitBtn'); if (si) si.onclick = () => { playSound('button'); socket.emit('swapInitiate'); };
  const sa = g('swapAskBtn');  if (sa) sa.onclick = () => { playSound('button'); socket.emit('swapAsk'); };
  const ps = g('passBtn');     if (ps) ps.onclick = () => { playSound('button'); socket.emit('passDocsRequest'); };
  const pas = g('pasBtn');     if (pas) pas.onclick = () => { playSound('button'); socket.emit('endAttack'); };
  const bi = g('bitoBtn');     if (bi) bi.onclick = () => { playSound('button'); socket.emit('bito'); };
  const am = g('askMoreBtn');  if (am) am.onclick = () => { playSound('button'); socket.emit('askMore'); };

  const eb = g('emojiBar');
  if (eb) eb.onclick = e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    socket.emit('reaction', { emoji: b.dataset.e });
    state.emojiOpen = false;
    renderTable(app, navigate);
  };

  const sb = g('settingsBtn');
  if (sb) sb.onclick = () => { playSound('button'); openSettings(() => renderTable(app, navigate)); };

  bindOverlays();
  maybeShowChampion(navigate);
  import('../ui/chat.js').then(m => m.updateChatBadge?.());

  if (!window.__voiceSpeakingBound) {
    window.__voiceSpeakingBound = true;
    window.addEventListener('voice-speaking-change', () => {
      if (document.getElementById('table')) {
        renderTable(app, navigate);
      }
    });
  }
}

function bindSwipeIconHandlers(app, navigate) {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.onclick = () => {
    playSound('button');
    refreshBtn.classList.add('spin');
    setTimeout(() => refreshBtn.classList.remove('spin'), 800);
    forceRefresh();
    toastOk(t('toast.refreshed'));
    setTimeout(hideSwipeIcons, 300);
  };
  const sortBtn = document.getElementById('sortBtn');
  if (sortBtn) sortBtn.onclick = () => {
    playSound('button'); hideSwipeIcons();
    sortMode = (sortMode + 1) % 3;
    renderTable(app, navigate);
  };
  const emojiToggle = document.getElementById('emojiToggle');
  if (emojiToggle) emojiToggle.onclick = () => {
    playSound('button'); hideSwipeIcons();
    state.emojiOpen = !state.emojiOpen;
    renderTable(app, navigate);
  };
  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.onclick = async () => {
    playSound('button');
    unlockAudio();
    if (!state.voiceActive) {
      const ok = await enableVoice();
      if (ok) {
        state.micOn = true;
        setMicOn(true);
        try { localStorage.setItem('micOn', '1'); } catch {}
        toastOk(t('toast.micOn'));
      } else {
        toastErr(t('toast.micError'));
      }
    } else {
      state.micOn = !state.micOn;
      setMicOn(state.micOn);
      try { localStorage.setItem('micOn', state.micOn ? '1' : '0'); } catch {}
    }
    hideSwipeIcons();
    renderTable(app, navigate);
  };
  const chatBtn = document.getElementById('chatBtn');
  if (chatBtn) chatBtn.onclick = () => { hideSwipeIcons(); openChat(); };
  const infoBtn = document.getElementById('infoBtn');
  if (infoBtn) infoBtn.onclick = () => {
    playSound('button'); hideSwipeIcons();
    infoOpen = !infoOpen;
    if (infoOpen) showInfoModal();
    else { const m = document.getElementById('infoModal'); if (m) m.remove(); }
  };
  const debugBtn = document.getElementById('debugBtn');
  if (debugBtn) debugBtn.onclick = () => {
    playSound('button');
    hideSwipeIcons();
    showVoiceDebug();
  };
}