import { state, loadName, saveName, saveMe, loadAvatar, saveAvatar, AVATARS } from '../state.js';
import { socket } from '../socket.js';

export function renderJoin(app, navigate) {
  const savedName = loadName();
  let pickedAvatar = loadAvatar() || AVATARS[0];

  const avatarsHtml = AVATARS.map(a => `
    <div class="avatar-choice ${a===pickedAvatar?'sel':''}" data-avatar="${a}">${a}</div>
  `).join('');

  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh;">
      <h2 style="text-align:center;">Войти в игру</h2>
      <label>Ваше имя</label>
      <input id="name" placeholder="Имя" value="${savedName}">
      <label>Аватарка</label>
      <div class="avatar-picker" id="avatarPick">${avatarsHtml}</div>
      <label>Код комнаты</label>
      <input id="rid" placeholder="ABCD" style="text-transform:uppercase; letter-spacing:4px; text-align:center; font-size:22px; font-weight:700;">
      <button id="joinBtn">Войти</button>
      <button id="backBtn" style="background:#95a5a6; color:#000;">← Назад</button>
      <div class="err" id="err"></div>
    </div>`;

  document.getElementById('avatarPick').onclick = e => {
    const el = e.target.closest('[data-avatar]'); if (!el) return;
    pickedAvatar = el.dataset.avatar;
    [...document.querySelectorAll('#avatarPick .avatar-choice')].forEach(x => x.classList.toggle('sel', x === el));
  };
  document.getElementById('backBtn').onclick = () => navigate('welcome');
  document.getElementById('joinBtn').onclick = () => {
    const name = document.getElementById('name').value.trim() || 'Игрок';
    const rid = document.getElementById('rid').value.trim();
    if (!rid) return document.getElementById('err').textContent = 'Введите код';
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