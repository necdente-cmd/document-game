import { state, loadName, saveName, saveMe, loadAvatar, saveAvatar, AVATARS } from '../state.js';
import { socket } from '../socket.js';
import { t } from '../i18n.js';

export function renderJoin(app, navigate) {
  const savedName = loadName();
  let pickedAvatar = loadAvatar() || AVATARS[0];

  const avatarsHtml = AVATARS.map(a => `
    <div class="avatar-choice ${a===pickedAvatar?'sel':''}" data-avatar="${a}">${a}</div>
  `).join('');

  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh;">
      <h2 style="text-align:center;">${t('join.title')}</h2>
      <label>${t('create.yourName')}</label>
      <input id="name" placeholder="${t('create.namePlaceholder')}" value="${savedName}">
      <label>${t('create.avatar')}</label>
      <div class="avatar-picker" id="avatarPick">${avatarsHtml}</div>
      <label>${t('join.codeLabel')}</label>
      <input id="rid" placeholder="${t('join.codePlaceholder')}" style="text-transform:uppercase; letter-spacing:4px; text-align:center; font-size:22px; font-weight:700;">
      <button id="joinBtn">${t('join.enter')}</button>
      <button id="backBtn" style="background:#95a5a6; color:#000;">${t('common.back')}</button>
      <div class="err" id="err"></div>
    </div>`;

  document.getElementById('avatarPick').onclick = e => {
    const el = e.target.closest('[data-avatar]'); if (!el) return;
    pickedAvatar = el.dataset.avatar;
    [...document.querySelectorAll('#avatarPick .avatar-choice')].forEach(x => x.classList.toggle('sel', x === el));
  };
  document.getElementById('backBtn').onclick = () => navigate('welcome');
  document.getElementById('joinBtn').onclick = () => {
    const name = document.getElementById('name').value.trim() || t('common.player');
    const rid = document.getElementById('rid').value.trim();
    if (!rid) return document.getElementById('err').textContent = t('join.enterCode');
    saveName(name);
    saveAvatar(pickedAvatar);

    socket.emit('joinRoom', {
      roomId: rid, name,
      playerId: state.me?.id,
      avatar: pickedAvatar,
    }, (r) => {
      if (!r.ok) return document.getElementById('err').textContent = r.err;
      saveMe({ name, id: r.playerId, roomId: r.roomId, avatar: pickedAvatar });
      navigate('table');
    });
  };
}