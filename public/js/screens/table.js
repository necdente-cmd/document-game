import { state, saveMe, applyTheme } from '../state.js';
import { socket } from '../socket.js';
import { cardHtml, backPath, beatsUI, posClass, esc } from '../card.js';
import { buildOverlays, bindOverlays } from '../ui/overlays.js';
import { maybeShowChampion } from '../ui/champion.js';
import { showHistory } from '../ui/history.js';

const EMOJIS = ['👍','😂','😡','😭','🔥','💪','🤔','😎','👏','😱','🤝','🎯','😤','🙈','💯','⚡'];

export function renderTable(app, navigate) {
  const s = state.server;
  if (!s) return;

  applyTheme(s.opts.theme);

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

  // Лобби
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
          ${s.players.map(p => `<div class="waiting-player ${p.isHost?'host':''}">${esc(p.name)}${p.isHost?' (хост)':''}</div>`).join('')}
        </div>
        ${isHost && playersCount === maxP
          ? `<button class="start-big" id="startBtn">▶ Начать игру</button>`
          : isHost ? `<div class="waiting-hint">Ждём игроков…</div>`
          : `<div class="waiting-hint">Ждём хоста…</div>`}
      </div>`;
  }

  // Баннер сверху
  let passNotice = '';
  if (s.field && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh) {
    if (bothPassed) passNotice = `<div class="pass-notice">⛔ Оба атакующих закрыты</div>`;
    else if (attackerPassed && !partnerOutV && !partnerPassed)
      passNotice = `<div class="pass-notice info">⏳ Атакующий сказал «Хватит» — ждём партнёра</div>`;
    else if (partnerPassed && !attackerOut && !attackerPassed)
      passNotice = `<div class="pass-notice info">⏳ Партнёр атакующего сказал «Хватит» — ждём атакующего</div>`;
  }
  if (waitingForSeat !== undefined) {
    const wname = s.players.find(p => p.seat === waitingForSeat)?.name || '?';
    passNotice = `<div class="pass-notice wait">⏳ Ждём ${esc(wname)} — отошёл, скоро вернётся</div>`;
  }

  // Сиденья
  const seats = s.players.filter(p => p.seat !== mySeat).map(p => {
    const isThisInPassed = passedSeats.includes(p.seat);
    const offlineBadge = !p.connected ? '<div class="badge-off">⚠ отошёл</div>' : '';
    return `
      <div class="seat ${posClass(p.seat)} ${p.seat===s.turnSeat?'active':''} ${p.out?'out':''} ${!p.connected?'offline':''}">
        ${esc(p.name)} ${p.team===myTeam?'★':'✗'}
        ${isThisInPassed ? '<div class="pass-badge">⛔ Хватит</div>' : ''}
        ${offlineBadge}
      </div>`;
  }).join('');

  // Колода и козырь
  let deckArea = '';
  if (isPlaying || s.phase === 'roundEnd' || s.phase === 'gameEnd') {
    const stack = Array.from({ length: 4 }).map((_, i) =>
      `<div class="card back ${isDealing ? 'deal' : ''}" style="top:${i*3}px;left:${i*3}px;z-index:${10+i}">
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

  // Поле боя
  const fieldHtml = s.field
    ? s.field.cards.map(e => {
        const isTarget = state.defendTarget === e.card.id;
        const canBeTarget = canDefend && !e.beatenBy && e.card.r !== myDoc;
        const cls = ['slot'];
        if (canBeTarget) cls.push('tappable');
        if (isTarget)    cls.push('selected');
        return `<div class="${cls.join(' ')}" data-field-card="${e.card.id}">
          ${cardHtml(e.card)}
          ${e.beatenBy ? cardHtml(e.beatenBy, { cls:'beaten' }) : ''}
        </div>`;
      }).join('')
    : `<div style="opacity:.5">— поле пусто —</div>`;

  // Кнопки
  const onlyDocsNow = s.myHand.length > 0 && s.myHand.every(c => c.r === myDoc);
  const canAttack = isMyTurn && !iAmOut && !s.field && !s.pendingPass && !s.pendingSwap && !s.pendingStart && waitingForSeat === undefined && !s.pendingFalsh;
  const canAdd = !iAmOut && s.field && (isAttacker || isPartnerOfAttacker) && !iHavePassed && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh;
  const canSayEnd = !iAmOut && s.field && (isAttacker || isPartnerOfAttacker) && !iHavePassed && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh;
  const canBito = canDefend && bothPassed && s.field.cards.every(x => x.beatenBy)
                  && !s.field.cards.some(x => x.card.r === myDoc)
                  && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh;
  const canPickUp = canDefend && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh;
  const canFalsh = canDefend && state.defendTarget && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh;
  const canThrow = isMyTurn && !iAmOut && onlyDocsNow && !s.pendingPass && !s.pendingSwap && partnerIsOut && !s.pendingFalsh;
  const canPassDocs = isMyTurn && !iAmOut && onlyDocsNow && !s.field && !s.pendingPass && !s.pendingSwap && !partnerIsOut && !s.pendingFalsh;
  const canSwapInitiate = isMyTurn && !iAmOut && !s.field && !s.pendingPass && !s.pendingSwap
                          && partnerIsOut && !s.swapUsedByTeam[myTeam] && !s.pendingFalsh;
  const canSwapAsk = iAmOut && !partnerIsOut && !s.pendingPass && !s.pendingSwap
                     && !s.swapUsedByTeam[myTeam] && s.turnSeat === myPartnerSeat && !s.pendingFalsh;

  const selectedOppDocs = s.myHand.filter(c => state.selected.has(c.id) && c.r === oppDoc && oppDoc !== myDoc);
  const isOnlyOppDocs = state.selected.size > 0 && selectedOppDocs.length === state.selected.size;

  // Рука
  const handHtml = s.myHand.map(c => cardHtml(c, {
    cls: [
      state.selected.has(c.id) ? 'sel' : '',
      c.r === myDoc ? 'doc' : '',
      (c.r === oppDoc && oppDoc !== myDoc) ? 'opp-doc' : '',
      isDealing ? 'deal' : ''
    ].filter(Boolean).join(' ')
  })).join('');

  // Подсказка
  let hintHtml = '';
  if (isOnlyOppDocs) {
    hintHtml = `<div class="hint" style="color:#e74c3c;">⚠ Навязываете документ противника — не бьётся, защитник обязан поднять</div>`;
  } else if (waitingForSeat !== undefined) {
    hintHtml = `<div class="hint">⏳ Ждём игрока — скоро вернётся</div>`;
  } else if (canDefend && !bothPassed && !s.pendingPass && !s.pendingSwap && !s.pendingFalsh) {
    const hasMyDoc = s.field.cards.some(x => !x.beatenBy && x.card.r === myDoc);
    if (hasMyDoc) hintHtml = `<div class="hint">⚠ На столе ваш документ — нужно поднять всё</div>`;
    else if (state.defendTarget) hintHtml = `<div class="hint">👆 Выберите свою карту или «Фальш»</div>`;
    else hintHtml = `<div class="hint">👆 Тапните карту врага — фальш, или тяните свою — бить</div>`;
  } else if (canDefend && bothPassed) {
    hintHtml = `<div class="hint">✋ Атакующие закрыты — решите: «Бито» или «Поднять»</div>`;
  }

  const overlays = buildOverlays();
  const emojiPanel = state.emojiOpen ? `<div class="emoji-bar" id="emojiBar">
    ${EMOJIS.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>` : '';
  const emojiBtn = isPlaying ? `<button class="emoji-toggle" id="emojiToggle">😀</button>${emojiPanel}` : '';
  const historyBtn = isPlaying ? `<button class="history-btn" id="historyBtn">📜</button>` : '';

  app.innerHTML = `
    <div class="table" id="table">
      ${lobbyBar}
      ${passNotice}
      ${deckArea}
      <button class="exit-btn" id="exitBtn" title="Выйти">✕</button>
      <div class="side">
        Козырь: <b>${esc(s.trumpSuit || '—')}</b><br>
        Мой док: <b>${esc(myDoc)}</b><br>
        Их док: <b>${esc(oppDoc)}</b><br>
        Счёт: ${s.roundWins[0]} : ${s.roundWins[1]}
      </div>
      ${seats}
      <div class="center">${fieldHtml}</div>
      ${overlays}
      ${emojiBtn}
      ${historyBtn}
    </div>
    <div class="hand" id="hand">${handHtml}</div>
    <div class="actions">
      ${hintHtml}
      ${(canAttack || canAdd)
        ? `<button class="${isOnlyOppDocs ? 'b4' : 'b1'}" id="attackBtn">${
            isOnlyOppDocs
              ? `📤 Навязать документ (${selectedOppDocs.length})`
              : (canAttack ? 'Атаковать' : 'Подкинуть')
          }</button>`
        : ''}
      ${canSayEnd ? `<button class="b2" id="endBtn">Хватит</button>` : ''}
      ${canPickUp ? `<button class="b3" id="pickBtn">Поднять всё</button>` : ''}
      ${canFalsh ? `<button class="b4" id="falshBtn">🃏 Фальш</button>` : ''}
      ${canBito ? `<button class="b1" id="bitoBtn">✔ Бито</button>` : ''}
      ${canThrow ? `<button class="b1" id="throwBtn">🏆 Бросить документы</button>` : ''}
      ${canPassDocs ? `<button class="b2" id="passBtn">Передать партнёру</button>` : ''}
      ${canSwapInitiate ? `<button class="b5" id="swapInitBtn">🔄 Отдать партнёру</button>` : ''}
      ${canSwapAsk ? `<button class="b5" id="swapAskBtn">🔄 Вернуться в игру</button>` : ''}
    </div>
    <div class="err" id="err"></div>
  `;

  // ============ ОБРАБОТЧИКИ ============

  const err = m => { const e = document.getElementById('err'); if (e) e.textContent = m; };
  const g = id => document.getElementById(id);

  // Клик по руке
  document.getElementById('hand').onclick = e => {
    const el = e.target.closest('.card'); if (!el) return;
    const id = el.dataset.id;

    if (canDefend) {
      if (!state.defendTarget) return err('Сначала тапните карту врага');
      const entry = s.field.cards.find(x => x.card.id === state.defendTarget);
      const card  = s.myHand.find(c => c.id === id);
      if (!entry || !card) return;
      if (entry.card.r === myDoc) return err('Нельзя бить свой документ');
      if (card.r === myDoc && card.s !== s.trumpSuit) return err('Свой документ бьёт только козырем');
      if (!beatsUI(card, entry.card, s.trumpSuit)) return err('Не бьёт');
      socket.emit('defend', { targetId: state.defendTarget, withId: id });
      state.defendTarget = null; state.selected.clear();
      return;
    }

    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    renderTable(app, navigate);
  };

  // Клик по полю (выбор цели защиты)
  const centerEl = document.querySelector('.center');
  if (centerEl) {
    centerEl.onclick = e => {
      const slot = e.target.closest('[data-field-card]'); if (!slot) return;
      if (!canDefend) return;
      const fid = slot.dataset.fieldCard;
      const entry = s.field.cards.find(x => x.card.id === fid);
      if (!entry || entry.beatenBy) return;
      if (entry.card.r === myDoc) return err('Это ваш документ — только поднять');
      state.defendTarget = (state.defendTarget === fid) ? null : fid;
      renderTable(app, navigate);
    };
  }

  // Лобби
  const cc = g('copyCode');
  if (cc) cc.onclick = async () => {
    const code = document.getElementById('roomCode').textContent;
    try { await navigator.clipboard.writeText(code); cc.textContent = '✅ ОК'; setTimeout(() => cc.textContent = '📋 Скопировать', 1500); } catch {}
  };
  const st = g('startBtn'); if (st) st.onclick = () => socket.emit('startGame');

  // Действия
  const atk = g('attackBtn'); if (atk) atk.onclick = () => {
    if (!state.selected.size) return err('Выберите карты');
    socket.emit('attack', { cardIds: [...state.selected] }); state.selected.clear();
  };
  const pk = g('pickBtn'); if (pk) pk.onclick = () => { socket.emit('pickUp'); state.defendTarget = null; };
  const en = g('endBtn'); if (en) en.onclick = () => socket.emit('endAttack');
  const bi = g('bitoBtn'); if (bi) bi.onclick = () => socket.emit('bito');
  const fl = g('falshBtn'); if (fl) fl.onclick = () => {
    if (!state.defendTarget) return err('Сначала тапните карту врага');
    socket.emit('falsh', { cardId: state.defendTarget }); state.defendTarget = null;
  };
  const th = g('throwBtn'); if (th) th.onclick = () => socket.emit('throwDocs');
  const ps = g('passBtn'); if (ps) ps.onclick = () => socket.emit('passDocsRequest');
  const si = g('swapInitBtn'); if (si) si.onclick = () => socket.emit('swapInitiate');
  const sa = g('swapAskBtn'); if (sa) sa.onclick = () => socket.emit('swapAsk');

  // Выход
  const ex = g('exitBtn'); if (ex) ex.onclick = () => {
    if (!confirm('Выйти из комнаты?')) return;
    socket.emit('leaveRoom');
    saveMe(null);
    state.server = null;
    navigate('welcome');
  };

  // Эмодзи
  const et = g('emojiToggle');
  if (et) et.onclick = () => { state.emojiOpen = !state.emojiOpen; renderTable(app, navigate); };
  const eb = g('emojiBar');
  if (eb) eb.onclick = e => {
    const b = e.target.closest('[data-e]'); if (!b) return;
    socket.emit('reaction', { emoji: b.dataset.e });
    state.emojiOpen = false;
    renderTable(app, navigate);
  };

  // История
  const hb = g('historyBtn');
  if (hb) hb.onclick = () => showHistory();

  // Оверлеи
  bindOverlays();

  // Экран чемпиона
  maybeShowChampion(navigate);
}