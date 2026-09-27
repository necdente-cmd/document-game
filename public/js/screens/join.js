import { state, loadName, saveName, saveMe, getPlayerId, getFinalAvatar } from '../state.js';
import { socket } from '../socket.js';
import { t } from '../i18n.js';
import { renderAvatarPicker, bindAvatarPicker } from '../ui/avatar-picker.js';

export function renderJoin(app, navigate) {
  const savedName = loadName();

  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh;">
      <h2 style="text-align:center;">${t('join.title')}</h2>
      <label>${t('create.yourName')}</label>
      <input id="name" placeholder="${t('create.namePlaceholder')}" value="${savedName}">
      <label>${t('create.avatar')}</label>
      ${renderAvatarPicker()}
      <label>${t('join.codeLabel')}</label>
      <input id="rid" placeholder="${t('join.codePlaceholder')}" style="text-transform:uppercase; letter-spacing:4px; text-align:center; font-size:22px; font-weight:700;">
      <button id="joinBtn">${t('join.enter')}</button>
      <button id="backBtn" style="background:#95a5a6; color:#000;">${t('common.back')}</button>
      <div class="err" id="err"></div>
    </div>`;

  bindAvatarPicker();

  document.getElementById('backBtn').onclick = () => navigate('welcome');

  document.getElementById('joinBtn').onclick = () => {
    const name = document.getElementById('name').value.trim() || t('common.player');
    const rid = document.getElementById('rid').value.trim();
    if (!rid) return document.getElementById('err').textContent = t('join.enterCode');
    saveName(name);

    const finalAvatar = getFinalAvatar();

    socket.emit('joinRoom', {
      roomId: rid, name,
      playerId: state.me?.id,
      persistentId: getPlayerId(),
      avatar: finalAvatar,
    }, (r) => {
      if (!r.ok) return document.getElementById('err').textContent = r.err;
      saveMe({ name, id: r.playerId, roomId: r.roomId, avatar: finalAvatar });
      navigate('table');
    });
  };
}