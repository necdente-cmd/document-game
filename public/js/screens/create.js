import { loadName, saveName, saveMe, loadOpts, saveOpts, applyTheme, loadAvatar, saveAvatar, AVATARS } from '../state.js';
import { socket } from '../socket.js';
import { rankDisplay } from '../rank-display.js';
import { t } from '../i18n.js';

export function renderCreate(app, navigate) {
  const savedName = loadName();
  const savedOpts = loadOpts();
  const deckStyle = savedOpts.deckStyle || 'figures';
  const backColor = savedOpts.backColor || 'blue';
  const docSet    = savedOpts.docSet    || 'classic';
  const theme     = savedOpts.theme     || 'classic';
  let pickedAvatar = loadAvatar() || AVATARS[0];
  let pickedTheme  = theme;
  let pickedDocSet = docSet;

  const backColors = ['black','blue','green','orange','purple','red'];
  const backs = backColors.map(c => `
    <div class="choice back-swatch ${c===backColor?'sel':''}" data-back="${c}">
      <img src="/cards/${c}_back_suits_dark.png" alt="${c}">
    </div>`).join('');

  const styles = `
    <div class="choice preview-card ${deckStyle==='figures'?'sel':''}" data-deck="figures">
      <img src="/cards/card_heart_12.png" alt="figures">
    </div>
    <div class="choice preview-card ${deckStyle==='simple'?'sel':''}" data-deck="simple">
      <img src="/cards/simplecard_heart_12.png" alt="simple">
    </div>`;

  const avatarsHtml = AVATARS.map(a => `
    <div class="avatar-choice ${a===pickedAvatar?'sel':''}" data-avatar="${a}">${a}</div>
  `).join('');

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

  app.innerHTML = `
    <div class="lobby">
      <h2 style="text-align:center;">${t('create.title')}</h2>
      <label>${t('create.yourName')}</label>
      <input id="name" placeholder="${t('create.namePlaceholder')}" value="${savedName}">
      <label>${t('create.avatar')}</label>
      <div class="avatar-picker" id="avatarPick">${avatarsHtml}</div>
      <label>${t('create.deckStyle')}</label>
      <div class="choice-row" id="deckPick">${styles}</div>
      <label>${t('create.backColor')}</label>
      <div class="choice-row" id="backPick">${backs}</div>

      <label>${t('create.docSteps')}</label>
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

      <label>${t('create.tableTheme')}</label>
      <div class="theme-grid" id="themePick">${themesHtml}</div>
      <button id="createBtn" style="padding:16px; margin-top:12px;">${t('create.createRoom')}</button>
      <button id="backBtn" style="background:#95a5a6; color:#000;">${t('common.back')}</button>
      <div class="err" id="err"></div>
    </div>`;

  let pickedDeck = deckStyle, pickedBack = backColor;

  document.getElementById('avatarPick').onclick = e => {
    const el = e.target.closest('[data-avatar]'); if (!el) return;
    pickedAvatar = el.dataset.avatar;
    [...document.querySelectorAll('#avatarPick .avatar-choice')].forEach(x => x.classList.toggle('sel', x === el));
  };
  document.getElementById('deckPick').onclick = e => {
    const el = e.target.closest('[data-deck]'); if (!el) return;
    pickedDeck = el.dataset.deck;
    [...document.querySelectorAll('#deckPick .choice')].forEach(x => x.classList.toggle('sel', x === el));
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

  document.getElementById('createBtn').onclick = () => {
    const name = document.getElementById('name').value.trim() || t('common.player');
    saveAvatar(pickedAvatar);
    const opts = {
      maxPlayers: 4,
      docSet: pickedDocSet,
      theme: pickedTheme,
      deckStyle: pickedDeck,
      backColor: pickedBack,
      handSize: 6,
      scale: 'medium',
      avatar: pickedAvatar,
    };
    saveName(name);
    saveOpts(opts);
    applyTheme(opts.theme);

    socket.emit('createRoom', { name, opts }, async (r) => {
      if (!r.ok) return document.getElementById('err').textContent = r.err;
      saveMe({ name, id: r.playerId, roomId: r.roomId, avatar: pickedAvatar });
      try { await navigator.clipboard.writeText(r.roomId); } catch {}
      navigate('table');
    });
  };
}