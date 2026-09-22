import { state, loadName, saveName, saveMe, loadOpts, saveOpts } from '../state.js';
import { socket } from '../socket.js';

export function renderWelcome(app, navigate) {
  const savedName = loadName();

  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh;">
      <h2 style="text-align:center; font-size:28px; margin-bottom:24px;">🃏 Документ</h2>
      <label>Ваше имя</label>
      <input id="name" placeholder="Имя" value="${savedName}">
      <button id="goCreate" style="padding:20px; font-size:18px;">🎮 Создать игру</button>
      <button id="goJoin" style="padding:20px; font-size:18px; background:#95a5a6; color:#000;">🔗 Войти по коду</button>
      <div class="err" id="err"></div>
    </div>
  `;

  document.getElementById('goCreate').onclick = () => {
    const name = document.getElementById('name').value.trim() || 'Игрок';
    saveName(name);
    const opts = {
      maxPlayers: 4,
      docSet: 'classic',
      theme: 'classic',
      deckStyle: 'figures',
      backColor: 'blue',
      handSize: 6,
      scale: 'medium',
    };
    saveOpts(opts);

    socket.emit('createRoom', { name, opts }, async (r) => {
      if (!r.ok) {
        document.getElementById('err').textContent = r.err;
        return;
      }
      saveMe({ name, id: r.playerId, roomId: r.roomId });
      try { await navigator.clipboard.writeText(r.roomId); } catch {}
      navigate('table');
    });
  };

  document.getElementById('goJoin').onclick = () => {
    navigate('join');
  };
}