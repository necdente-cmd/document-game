import { loadName, saveName, saveMe, loadOpts, saveOpts, applyTheme, getPlayerId, getFinalAvatar, loadMode, saveMode } from '../state.js';
import { socket } from '../socket.js';
import { rankDisplay } from '../rank-display.js';
import { t } from '../i18n.js';
import { renderAvatarPicker, bindAvatarPicker } from '../ui/avatar-picker.js';

export function renderCreate(app, navigate) {
  const savedName = loadName();
  const savedOpts = loadOpts();
  const deckStyle = savedOpts.deckStyle || 'figures';
  const backColor = savedOpts.backColor || 'blue';
  const docSet    = savedOpts.docSet    || 'classic';
  const theme     = savedOpts.theme     || 'classic';
  const mode      = loadMode();
  let pickedTheme  = theme;
  let pickedDocSet = docSet;
  let pickedMode   = mode;

  const backColors = ['black','blue','green','orange','purple','red'];
  const backs = backColors.map(c => `
    <div class="choice back-swatch ${c===backColor?'sel':''}" data-back="${c}">
      <img src="/cards/${c}_back_suits_dark.png" alt="${c}">
    </div>`).join('');

  const styles = `
    <div class="choice preview-card ${deckStyle==='figures'?'sel':''}" data-deck="figures">
      <img src="/cards/card_heart_12.png" alt="figures">
      <div class="deck-label">${t('create.deckFigures')}</div>
    </div>
    <div class="choice preview-card ${deckStyle==='simple'?'sel':''}" data-deck="simple">
      <img src="/cards/simplecard_heart_12.png" alt="simple">
      <div class="deck-label">${t('create.deckSimple')}</div>
    </div>
    <div class="choice preview-card ${deckStyle==='alt1'?'sel':''}" data-deck="alt1">
      <img src="/cards-alt1/12h.png" alt="alt1">
      <div class="deck-label">${t('create.deckAlt1')}</div>
    </div>
    <div class="choice preview-card ${deckStyle==='alt2'?'sel':''}" data-deck="alt2">
      <img src="/cards-alt2/12h.png" alt="alt2">
      <div class="deck-label">${t('create.deckAlt2')}</div>
    </div>
    <div class="choice preview-card ${deckStyle==='alt3'?'sel':''}" data-deck="alt3">
      <img src="/cards-alt3/queen_of_hearts.png" alt="alt3">
      <div class="deck-label">${t('create.deckAlt3')}</div>
    </div>`;

  const classicSteps = ['6','10','J','Q','K','A'];
  const shortSteps   = ['6','10','Q','A'];

  function stepsHtml(steps) {
    return steps.map((r, i) => `
      <span class="step-chip">${rankDisplay(r)}</span>
      ${i < steps.length - 1 ? '<span class="step-arrow">→</span>' : ''}
    `).join('');
  }

  const themesHtml = `
    <div class="theme-preview ${pickedTheme==='classic'?'sel':''}" data-theme-val="classic">
      <div class="tp-inner"></div>
      <div class="tp-label">${t('create.themeClassic')}</div>
    </div>
    <div class="theme-preview ${pickedTheme==='dark'?'sel':''}" data-theme-val="dark">
      <div class="tp-inner"></div>
      <div class="tp-label">${t('create.themeDark')}</div>
    </div>
    <div class="theme-preview ${pickedTheme==='neon'?'sel':''}" data-theme-val="neon">
      <div class="tp-inner"></div>
      <div class="tp-label">${t('create.themeNeon')}</div>
    </div>
    <div class="theme-preview ${pickedTheme==='paper'?'sel':''}" data-theme-val="paper">
      <div class="tp-inner"></div>
      <div class="tp-label">${t('create.themePaper')}</div>
    </div>
  `;

  const showBackSection = (deckStyle === 'figures' || deckStyle === 'simple' || deckStyle === 'alt3');

  app.innerHTML = `
    <div class="cr-page">
      <div class="cr-header">
        <button class="cr-back" id="backBtn" aria-label="Back">←</button>
        <div class="cr-title">${t('create.title')}</div>
        <div class="cr-header-spacer"></div>
      </div>

      <div class="cr-body">

        <!-- 👤 Профиль -->
        <section class="cr-section">
          <div class="cr-sec-title">👤 ${t('create.yourName')}</div>
          <input id="name" class="cr-input"
                 placeholder="${t('create.namePlaceholder')}"
                 value="${savedName}"
                 maxlength="20"
                 autocomplete="off">
          <div class="cr-sec-title" style="margin-top:14px;">${t('create.avatar')}</div>
          ${renderAvatarPicker()}
        </section>

        <!-- 🌱 Режим -->
        <section class="cr-section">
          <div class="cr-sec-title">🌱 ${t('mode.title')}</div>
          <div class="mode-grid" id="modePick">
            <div class="mode-card ${pickedMode==='beginner'?'sel':''}" data-mode="beginner">
              <div class="mode-title">🌱 ${t('mode.beginner')}</div>
              <div class="mode-hint">${t('mode.beginnerHint')}</div>
            </div>
            <div class="mode-card ${pickedMode==='veteran'?'sel':''}" data-mode="veteran">
              <div class="mode-title">🎖 ${t('mode.veteran')}</div>
              <div class="mode-hint">${t('mode.veteranHint')}</div>
            </div>
          </div>
        </section>

        <!-- 🎴 Колода -->
        <section class="cr-section">
          <div class="cr-sec-title">🎴 ${t('create.deckStyle')}</div>
          <div class="choice-row deck-row" id="deckPick">${styles}</div>

          <div id="backSection" style="${showBackSection ? '' : 'display:none'}">
            <div class="cr-sec-title" style="margin-top:14px;">${t('create.backColor')}</div>
            <div class="choice-row" id="backPick">${backs}</div>
          </div>
        </section>

        <!-- 🎯 Документы -->
        <section class="cr-section">
          <div class="cr-sec-title">🎯 ${t('create.docSteps')}</div>
          <div class="docset-grid" id="docsetPick">
            <div class="docset-card ${pickedDocSet==='classic'?'sel':''}" data-docset="classic">
              <div class="docset-name">${t('create.docClassic')}</div>
              <div class="docset-steps">${stepsHtml(classicSteps)}</div>
              <div class="docset-desc">${t('create.docClassicDesc')}</div>
            </div>
            <div class="docset-card ${pickedDocSet==='short'?'sel':''}" data-docset="short">
              <div class="docset-name">${t('create.docShort')}</div>
              <div class="docset-steps">${stepsHtml(shortSteps)}</div>
              <div class="docset-desc">${t('create.docShortDesc')}</div>
            </div>
          </div>
        </section>

        <!-- 🎨 Тема стола -->
        <section class="cr-section">
          <div class="cr-sec-title">🎨 ${t('create.tableTheme')}</div>
          <div class="theme-grid" id="themePick">${themesHtml}</div>
        </section>

        <div class="err" id="err"></div>

        <!-- Нижний отступ под sticky кнопку -->
        <div class="cr-footer-spacer"></div>
      </div>

      <!-- Sticky footer -->
      <div class="cr-footer">
        <button id="createBtn" class="cr-create" disabled>
          ${t('create.createRoom')}
        </button>
      </div>
    </div>`;

  let pickedDeck = deckStyle, pickedBack = backColor;

  bindAvatarPicker();

  // Валидация имени
  const nameInput = document.getElementById('name');
  const createBtn = document.getElementById('createBtn');

  function validateName() {
    const ok = (nameInput.value || '').trim().length > 0;
    createBtn.disabled = !ok;
    createBtn.classList.toggle('disabled', !ok);
  }
  nameInput.addEventListener('input', validateName);
  validateName();

  document.getElementById('modePick').onclick = e => {
    const el = e.target.closest('[data-mode]'); if (!el) return;
    pickedMode = el.dataset.mode;
    saveMode(pickedMode);
    [...document.querySelectorAll('#modePick .mode-card')].forEach(x => x.classList.toggle('sel', x === el));
  };

  document.getElementById('deckPick').onclick = e => {
    const el = e.target.closest('[data-deck]'); if (!el) return;
    pickedDeck = el.dataset.deck;
    [...document.querySelectorAll('#deckPick .choice')].forEach(x => x.classList.toggle('sel', x === el));
    const show = (pickedDeck === 'figures' || pickedDeck === 'simple' || pickedDeck === 'alt3');
    document.getElementById('backSection').style.display = show ? '' : 'none';
  };

  document.getElementById('backPick').onclick = e => {
    const el = e.target.closest('[data-back]'); if (!el) return;
    pickedBack = el.dataset.back;
    [...document.querySelectorAll('#backPick .choice')].forEach(x => x.classList.toggle('sel', x === el));
  };

  document.getElementById('docsetPick').onclick = e => {
    const el = e.target.closest('[data-docset]'); if (!el) return;
    pickedDocSet = el.dataset.docset;
    [...document.querySelectorAll('#docsetPick .docset-card')].forEach(x => x.classList.toggle('sel', x === el));
  };

  document.getElementById('themePick').onclick = e => {
    const el = e.target.closest('[data-theme-val]'); if (!el) return;
    pickedTheme = el.dataset.themeVal;
    [...document.querySelectorAll('#themePick .theme-preview')].forEach(x => x.classList.toggle('sel', x === el));
    applyTheme(pickedTheme);
  };

  document.getElementById('backBtn').onclick = () => navigate('welcome');

  createBtn.onclick = () => {
    const name = nameInput.value.trim() || t('common.player');
    const finalAvatar = getFinalAvatar();

    const opts = {
      maxPlayers: 4,
      docSet: pickedDocSet,
      theme: pickedTheme,
      deckStyle: pickedDeck,
      backColor: pickedBack,
      handSize: 6,
      scale: 'medium',
      avatar: finalAvatar,
      mode: pickedMode,
    };
    saveName(name);
    saveOpts(opts);
    applyTheme(opts.theme);
    saveMode(pickedMode);

    socket.emit('createRoom', { name, opts, persistentId: getPlayerId() }, async (r) => {
      if (!r.ok) return document.getElementById('err').textContent = r.err;
      saveMe({ name, id: r.playerId, roomId: r.roomId, avatar: finalAvatar, mode: pickedMode });
      try { await navigator.clipboard.writeText(r.roomId); } catch {}
      navigate('table');
    });
  };
}