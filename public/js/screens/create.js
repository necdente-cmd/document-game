import { loadName, saveName, saveMe, loadOpts, saveOpts, applyTheme, loadAvatar, saveAvatar, AVATARS } from '../state.js';
import { socket } from '../socket.js';

export function renderCreate(app, navigate) {
  const savedName = loadName();
  const savedOpts = loadOpts();
  const deckStyle = savedOpts.deckStyle || 'figures';
  const backColor = savedOpts.backColor || 'blue';
  const docSet    = savedOpts.docSet    || 'classic';
  const theme     = savedOpts.theme     || 'classic';
  let pickedAvatar = loadAvatar() || AVATARS[0];

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

  app.innerHTML = `
    <div class="lobby">
      <h2 style="text-align:center;">Настройки игры</h2>
      <label>Ваше имя</label>
      <input id="name" placeholder="Имя" value="${savedName}">
      <label>Аватарка</label>
      <div class="avatar-picker" id="avatarPick">${avatarsHtml}</div>
      <label>Стиль колоды</label>
      <div class="choice-row" id="deckPick">${styles}</div>
      <label>Рубашка</label>
      <div class="choice-row" id="backPick">${backs}</div>
      <label>Ступени документов</label>
      <select id="docSet">
        <option value="classic" ${docSet==='classic'?'selected':''}>6 · 10 · J · Q · K · A</option>
        <option value="short"   ${docSet==='short'  ?'selected':''}>6 · 10 · Q · A</option>
      </select>
      <label>Тема стола</label>
      <select id="theme">
        <option value="classic" ${theme==='classic'?'selected':''}>Классика</option>
        <option value="dark"    ${theme==='dark'   ?'selected':''}>Тёмная</option>
        <option value="neon"    ${theme==='neon'   ?'selected':''}>Неон</option>
        <option value="paper"   ${theme==='paper'  ?'selected':''}>Бумага</option>
      </select>
      <button id="createBtn" style="padding:16px; margin-top:12px;">🎮 Создать комнату</button>
      <button id="backBtn" style="background:#95a5a6; color:#000;">← Назад</button>
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
  document.getElementById('theme').onchange = e => applyTheme(e.target.value);
  document.getElementById('backBtn').onclick = () => navigate('welcome');

  document.getElementById('createBtn').onclick = () => {
    const name = document.getElementById('name').value.trim() || 'Игрок';
    saveAvatar(pickedAvatar);
    const opts = {
      maxPlayers: 4,
      docSet: document.getElementById('docSet').value,
      theme: document.getElementById('theme').value,
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