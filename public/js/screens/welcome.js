import { loadName } from '../state.js';

export function renderWelcome(app, navigate) {
  const savedName = loadName();

  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh;">
      <h2 style="text-align:center; font-size:28px; margin-bottom:24px;">🃏 Документ</h2>
      <button id="goCreate" style="padding:20px; font-size:18px;">🎮 Создать игру</button>
      <button id="goJoin" style="padding:20px; font-size:18px; background:#95a5a6; color:#000;">🔗 Войти по коду</button>
      <div class="err" id="err"></div>
    </div>`;

  document.getElementById('goCreate').onclick = () => navigate('create');
  document.getElementById('goJoin').onclick = () => navigate('join');
}