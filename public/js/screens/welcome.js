import { loadName } from '../state.js';
import { showRules, showMail, showProfile } from '../ui/modals.js';

export function renderWelcome(app, navigate) {
  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh; position:relative;">
      <div style="position:absolute; top:14px; right:14px; display:flex; gap:8px;">
        <button id="btnRules"   class="icon-btn" title="Правила">📜</button>
        <button id="btnMail"    class="icon-btn" title="Почта">✉️</button>
        <button id="btnProfile" class="icon-btn" title="Профиль">🧑</button>
      </div>

      <h2 style="text-align:center; font-size:30px; margin-top:40px; margin-bottom:32px;">🃏 Документ</h2>

      <button id="goCreate" style="padding:20px; font-size:18px;">🎮 Создать игру</button>
      <button id="goJoin" style="padding:20px; font-size:18px; background:#95a5a6; color:#000;">🔗 Войти по коду</button>

      <div style="position:absolute; bottom:14px; left:0; right:0; display:flex; justify-content:space-between; padding:0 20px; font-size:12px; opacity:.6;">
        <span>👥 Друзья</span>
        <span>Автор: necdente</span>
      </div>
    </div>
  `;

  document.getElementById('goCreate').onclick = () => navigate('create');
  document.getElementById('goJoin').onclick = () => navigate('join');
  document.getElementById('btnRules').onclick = () => showRules();
  document.getElementById('btnMail').onclick = () => showMail();
  document.getElementById('btnProfile').onclick = () => showProfile();
}