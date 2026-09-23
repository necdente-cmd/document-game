import { state, saveMe, applyTheme, playerState, getAvatar, savePrefs } from '../state.js';
import { socket } from '../socket.js';
import { cardHtml, backPath, esc, renderHandFan } from '../card.js';
import { buildOverlays, bindOverlays } from '../ui/overlays.js';
import { maybeShowChampion } from '../ui/champion.js';
import { showHistory } from '../ui/history.js';
import { openSettings } from '../ui/settings.js';
import { openChat } from '../ui/chat.js';
import { initDrag } from '../drag.js';
import { EMOJIS } from '../emojis.js';

let sortMode = 0;
let infoOpen = false;
let iconsVisible = false;
let iconsTimer = null;

// ==================== СВАЙП-ИКОНКИ СЛЕВА ====================
function ensureSwipeIcons() {
  let el = document.getElementById('swipeIcons');
  if (!el) {
    el = document.createElement('div');
    el.id = 'swipeIcons';
    el.className = 'swipe-icons';
    el.innerHTML = `
      <button class="icon-btn" id="sortBtn" title="Сортировка">🔄</button>
      <button class="icon-btn" id="emojiToggle" title="Смайлик">😀</button>
      <button class="icon-btn" id="chatBtn" title="Чат">💬</button>
      <button class="icon-btn ${infoOpen?'active':''}" id="infoBtn" title="Сведения">📊</button>
    `;
    document.body.appendChild(el);
  }
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
  iconsTimer = setTimeout(hideSwipeIcons, 3000);
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

  let startX = 0;
  let started = false;

  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.card')) return;
    if (e.target.closest('.swipe-icons')) return;
    if (e.target.closest('.emoji-bar')) return;
    if (e.target.closest('.chat-panel')) return;
    if (e.target.closest('.info-modal')) return;
    if (e.target.closest('.swipe-trigger')) return;
    if (e.target.closest('.settings-btn')) return;
    const x = e.touches[0].clientX;
    if (x < 40) {
      startX = x;
      started = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!started) return;
    const x = e.touches[0].clientX;
    const dx = x - startX;
    if (dx > 50) {
      showSwipeIcons();
      started = false;
    } else if (dx < -30 && iconsVisible) {
      hideSwipeIcons();
      started = false;
    }
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
    if (e.target.closest('#swipeTrigger')) {
      showSwipeIcons();
    }
  }, true);
}

// ==================== МОДАЛКА СВЕДЕНИЙ ====================
function showInfoModal() {
  const s = state.server;
  if (!s) return;
  const myTeam = s.myTeam;
  const myDoc = s.docs[myTeam];
  const oppDoc = s.docs[1 - myTeam];
  const el = document.createElement('div');
  el.className = 'info-modal';
  el.id = 'infoModal';
  el.innerHTML = `
    <div class="info-modal-inner">
      <h3>📊 Сведения</h3>
      <div class="info-row"><span>Козырь</span><b>${esc(s.trumpSuit || '—')}</b></div>
      <div class="info-row"><span>Мой док</span><b>${esc(myDoc)}</b></div>
      <div class="info-row"><span>Их док</span><b>${esc(oppDoc)}</b></div>
      <div class="info-row"><span>Счёт</span><b>${s.roundWins[0]} : ${s.roundWins[1]}</b></div>
      <button class="info-modal-close" id="infoClose">Закрыть</button>
    </div>
  `;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.onclick = (e) => { if (e.target === el) close(); };
  document.getElementById('infoClose').onclick = close;
}

// ==================== СОРТИРОВКА РУКИ ====================
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

  let lobbyBar = '';
  if (s.phase === 'lobby') {
    const playersCount = s.players.length;
    const maxP = s.opts.maxPlayers;
    const isHost = meP?.isHost;
    lobbyBar = `
      <div class="waiting">
        <div class="waiting-title">Код комнаты</div>
        <div class="waiting-code" id="roomCode">${esc(s.id)}</div>
        <button class="copy-btn" id="copyCode">📋 Скопировать</button>
        <div class="waiting-info">Игроков: <b>${playersCount} / ${maxP}</b></div>
        <div class="waiting-players">
          ${s.players.map(p => `<div class="waiting-player ${p.isHost?'host':''}">${getAvatar(p.seat)} ${esc(p.name)}${p.isHost?' (хост)':''}</div>`).join('')}
        </div>
        ${isHost && playersCount === maxP
          ? `<button class="start-big" id="startBtn">▶ Начать игру</button>`
          : isHost ? `<div class="waiting-hint">Ждём игроков…</div>`
          : `<div class="waiting-hint">Ждём хоста…</div>`}
      </div>`;
  }

  let passNotice = '';
  if (s.field && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh) {
    if (bothPassed) passNotice = `<div class="pass-notice">⛔ Оба атакующих пасанули</div>`;
    else if (attackerPassed && !partnerOutV && !partnerPassed)
      passNotice = `<div class="pass-notice info">⏳ Атакующий пасанул — ждём партнёра</div>`;
    else if (partnerPassed && !attackerOut && !attackerPassed)
      passNotice = `<div class="pass-notice info">⏳ Партнёр пасанул — ждём атакующего</div>`;
  }
  if (waitingForSeat !== undefined) {
    const wname = s.players.find(p => p.seat === waitingForSeat)?.name || '?';
    passNotice = `<div class="pass-notice wait">⏳ Ждём ${esc(wname)} — отошёл</div>`;
  }

  const seats = s.players.filter(p => p.seat !== mySeat).map(p => {
    const isThisInPassed = passedSeats.includes(p.seat);
    const offlineBadge = !p.connected ? '<div class="badge-off">⚠ отошёл</div>' : '';
    const posArr = ['bottom','right','top','left'];
    const pos = posArr[((p.seat - mySeat + 4) % 4)] || 'top';
    const st = playerState(s, p.seat);
    const stCls = st === 'бьёт' ? 'beat' : st === 'думает' ? 'think' : st === 'ходит' ? 'move'
                : st === 'отошёл' ? 'out' : '';
    return `
      <div class="seat ${pos} ${p.seat===s.turnSeat?'active':''} ${p.out?'out':''} ${!p.connected?'offline':''}" data-seat="${p.seat}">
        <div class="name">${esc(p.name)} ${p.team===myTeam?'★':'✗'}</div>
        <div class="avatar">${getAvatar(p.seat)}</div>
        ${st ? `<div class="state ${stCls}">${st}</div>` : ''}
        ${isThisInPassed ? '<div class="pass-badge">⛔ Пас</div>' : ''}
        ${offlineBadge}
      </div>`;
  }).join('');

  let deckArea = '';
  if (isPlaying || s.phase === 'roundEnd' || s.phase === 'gameEnd') {
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

  const fieldHtml = s.field
    ? s.field.cards.map(e => {
        const canBeTarget = canDefend && !e.beatenBy && e.card.r !== myDoc;
        const cls = ['slot'];
        if (canBeTarget) cls.push('tappable');
        return `<div class="${cls.join(' ')}" data-field-card="${e.card.id}">
          ${cardHtml(e.card)}
          ${e.beatenBy ? cardHtml(e.beatenBy, { cls:'beaten' }) : ''}
        </div>`;
      }).join('')
    : `<div style="opacity:.5">— поле пусто —</div>`;

  const onlyDocsNow = s.myHand.length > 0 && s.myHand.every(c => c.r === myDoc);
  const allBeaten = s.field && s.field.cards.length > 0 && s.field.cards.every(x => x.beatenBy);

  let centerActionBtn = '';
  let centerActionCls = 'b2';
  let centerActionId = '';

  if (canDefend && s.field && s.field.cards.length > 0) {
    centerActionBtn = '📥<br>ПОДНЯТЬ';
    centerActionCls = 'b3';
    centerActionId = 'pickUpBtn';
  }
  else if (isMyTurn && !iAmOut && !s.field && partnerIsOut && onlyDocsNow) {
    centerActionBtn = '🏆<br>БРОСИТЬ';
    centerActionCls = 'b1';
    centerActionId = 'throwBtn';
  }
  else if (isMyTurn && !iAmOut && !s.field && partnerIsOut && !s.swapUsedByTeam[myTeam] && !onlyDocsNow && s.myHand.length > 0) {
    centerActionBtn = '🔄<br>ОТДАТЬ';
    centerActionCls = 'b5';
    centerActionId = 'swapInitBtn';
  }
  else if (iAmOut && !partnerIsOut && s.turnSeat === myPartnerSeat && !s.field && !s.swapUsedByTeam[myTeam]) {
    centerActionBtn = '🔄<br>ВЕРНУТЬСЯ';
    centerActionCls = 'b5';
    centerActionId = 'swapAskBtn';
  }
  else if (isMyTurn && !iAmOut && !s.field && !partnerIsOut && onlyDocsNow) {
    centerActionBtn = '📤<br>ПЕРЕДАТЬ';
    centerActionCls = 'b2';
    centerActionId = 'passBtn';
  }
  else if ((isAttacker || isPartnerOfAttacker) && !iHavePassed) {
    centerActionBtn = '✋<br>ПАС';
    centerActionCls = 'b2';
    centerActionId = 'pasBtn';
  }

  const extraActions = [];
  if (canDefend && allBeaten && bothPassed && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh) {
    extraActions.push(`<button class="b1" id="bitoBtn">✔ БИТО</button>`);
  }
  if (canDefend && state.defendTarget) {
    extraActions.push(`<button class="b4" id="falshBtn">🃏 ФАЛЬШ</button>`);
  }

  const sortedHand = sortHand(s.myHand, myDoc, s.trumpSuit);
  const handHtml = renderHandFan(sortedHand, { myDoc, oppDoc, selected: state.selected, isDealing });

  let hintHtml = '';
  if (waitingForSeat !== undefined) {
    hintHtml = `<div class="hint">⏳ Ждём игрока — скоро вернётся</div>`;
  } else if (canDefend && !bothPassed && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh) {
    const hasMyDoc = s.field.cards.some(x => !x.beatenBy && x.card.r === myDoc);
    if (hasMyDoc) hintHtml = `<div class="hint">⚠ На столе ваш документ — нужно поднять всё</div>`;
    else if (state.defendTarget) hintHtml = `<div class="hint">👆 Жмите ФАЛЬШ или тяните свою карту на карту врага</div>`;
    else hintHtml = `<div class="hint">👆 Ты защищаешься — тапни карту врага, потом тяни свою</div>`;
  } else if (canDefend && bothPassed) {
    hintHtml = `<div class="hint">✋ Все пасанули — решите: БИТО или Поднять</div>`;
  } else if (isAttacker || isPartnerOfAttacker) {
    hintHtml = `<div class="hint">👆 Ты ходишь — тяни карту в поле</div>`;
  } else if (isMyTurn) {
    hintHtml = `<div class="hint">👆 Твой ход</div>`;
  }

  const emojiPanel = state.emojiOpen ? `<div class="emoji-bar" id="emojiBar">
    ${EMOJIS.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>` : '';

  const overlays = buildOverlays();

  app.innerHTML = `
    <div class="table" id="table">
      ${lobbyBar}
      ${passNotice}
      ${deckArea}

      <button class="settings-btn" id="settingsBtn" title="Настройки">⚙️</button>

      ${seats}
      <div class="center">${fieldHtml}</div>

      ${overlays}
      ${emojiPanel}
    </div>

    <div class="bottom-bar">
      <div class="hand" id="hand">${handHtml}</div>

      <div class="extra-actions">${extraActions.join('')}</div>

      ${centerActionBtn ? `<button class="action-center ${centerActionCls}" id="${centerActionId}">${centerActionBtn}</button>` : ''}
    </div>

    <div class="actions">${hintHtml}</div>
    <div class="err" id="err"></div>
  `;

  ensureSwipeIcons();
  bindSwipeIconHandlers(app, navigate);
  if (iconsVisible) {
    const el = document.getElementById('swipeIcons');
    if (el) el.classList.add('show');
  }

  const err = m => { const e = document.getElementById('err'); if (e) e.textContent = m; };
  const g = id => document.getElementById(id);

  initDrag(() => renderTable(app, navigate));

  const centerEl = document.querySelector('.center');
  if (centerEl) {
    centerEl.onclick = e => {
      const slot = e.target.closest('[data-field-card]'); if (!slot) return;
      if (!canDefend) return;
      const fid = slot.dataset.fieldCard;
      const entry = s.field.cards.find(x => x.card.id === fid);
      if (!entry || entry.beatenBy) return;
      if (entry.card.r === myDoc) return err('Ваш документ — только поднять');
      state.defendTarget = (state.defendTarget === fid) ? null : fid;
      renderTable(app, navigate);
    };
  }

  const cc = g('copyCode');
  if (cc) cc.onclick = async () => {
    const code = document.getElementById('roomCode').textContent;
    try { await navigator.clipboard.writeText(code); cc.textContent = '✅ ОК'; setTimeout(() => cc.textContent = '📋 Скопировать', 1500); } catch {}
  };
  const st = g('startBtn'); if (st) st.onclick = () => socket.emit('startGame');

  const pu = g('pickUpBtn');   if (pu) pu.onclick = () => { socket.emit('pickUp'); state.defendTarget = null; };
  const th = g('throwBtn');    if (th) th.onclick = () => socket.emit('throwDocs');
  const si = g('swapInitBtn'); if (si) si.onclick = () => socket.emit('swapInitiate');
  const sa = g('swapAskBtn');  if (sa) sa.onclick = () => socket.emit('swapAsk');
  const ps = g('passBtn');     if (ps) ps.onclick = () => socket.emit('passDocsRequest');
  const pas = g('pasBtn');     if (pas) pas.onclick = () => socket.emit('endAttack');

  const bi = g('bitoBtn');     if (bi) bi.onclick = () => socket.emit('bito');
  const fl = g('falshBtn');    if (fl) fl.onclick = () => {
    if (!state.defendTarget) return err('Сначала тапните карту врага');
    socket.emit('falsh', { cardId: state.defendTarget });
    state.defendTarget = null;
  };

  const eb = g('emojiBar');
  if (eb) eb.onclick = e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    socket.emit('reaction', { emoji: b.dataset.e });
    state.emojiOpen = false;
    renderTable(app, navigate);
  };

  const sb = g('settingsBtn');
  if (sb) sb.onclick = () => openSettings(() => renderTable(app, navigate));

    bindOverlays();
  maybeShowChampion(navigate);

  // Восстанавливаем бейдж чата после ре-рендера
  import('../ui/chat.js').then(m => m.updateChatBadge?.());
}

// Обработчики свайп-иконок
function bindSwipeIconHandlers(app, navigate) {
  const sortBtn = document.getElementById('sortBtn');
  if (sortBtn) sortBtn.onclick = () => {
    hideSwipeIcons();
    sortMode = (sortMode + 1) % 3;
    renderTable(app, navigate);
  };
  const emojiToggle = document.getElementById('emojiToggle');
  if (emojiToggle) emojiToggle.onclick = () => {
    hideSwipeIcons();
    state.emojiOpen = !state.emojiOpen;
    renderTable(app, navigate);
  };
  const chatBtn = document.getElementById('chatBtn');
  if (chatBtn) chatBtn.onclick = () => {
    hideSwipeIcons();
    openChat();
  };
  const infoBtn = document.getElementById('infoBtn');
  if (infoBtn) infoBtn.onclick = () => {
    hideSwipeIcons();
    infoOpen = !infoOpen;
    if (infoOpen) showInfoModal();
    else { const m = document.getElementById('infoModal'); if (m) m.remove(); }
  };
}