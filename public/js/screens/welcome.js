import { loadName } from '../state.js';
import { showRules, showMail, showProfile } from '../ui/modals.js';
import { toggleMusic, isMusicOn } from '../music.js';
import { playSound } from '../sound.js';

export function renderWelcome(app, navigate) {
  const musicOn = isMusicOn();

  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh; position:relative;">
      <div style="position:absolute; top:14px; right:14px; display:flex; gap:8px;">
        <button id="btnMusic"   class="icon-btn ${musicOn?'active':''}" title="Музыка">${musicOn ? '🎵' : '🔇'}</button>
        <button id="btnRules"   class="icon-btn" title="Правила">📜</button>
        <button id="btnMail"    class="icon-btn" title="Почта">✉️</button>
        <button id="btnProfile" class="icon-btn" title="Профиль">🧑</button>
      </div>

      <h2 class="welcome-title">🃏 Документ</h2>
      <div class="welcome-sub">Карточная игра 2×2 · 36 карт</div>

      <button id="goCreate" class="welcome-btn primary">🎮 Создать игру</button>
      <button id="goJoin"   class="welcome-btn secondary">🔗 Войти по коду</button>

      <div class="welcome-footer">
        <span class="welcome-friends">👥 Друзья</span>
        <span class="welcome-author" id="authorBtn" title="О разработчике">Автор: <b>Dr.Nec.D</b></span>
      </div>
    </div>
  `;

  document.getElementById('goCreate').onclick = () => { playSound('button'); navigate('create'); };
  document.getElementById('goJoin').onclick   = () => { playSound('button'); navigate('join'); };
  document.getElementById('btnRules').onclick = () => { playSound('button'); showRules(); };
  document.getElementById('btnMail').onclick  = () => { playSound('button'); showMail(); };
  document.getElementById('btnProfile').onclick = () => { playSound('button'); showProfile(); };

  const musicBtn = document.getElementById('btnMusic');
  if (musicBtn) {
    musicBtn.onclick = () => {
      playSound('button');
      const on = toggleMusic();
      musicBtn.textContent = on ? '🎵' : '🔇';
      musicBtn.classList.toggle('active', on);
    };
  }

  // Тап по автору → модалка «О разработчике»
  const authorBtn = document.getElementById('authorBtn');
  if (authorBtn) {
    authorBtn.onclick = () => showAboutDev();
  }
}

function showAboutDev() {
  const el = document.createElement('div');
  el.className = 'simple-modal';
  el.innerHTML = `
    <div class="simple-modal-inner" style="max-width:400px; text-align:center;">
      <h3 style="margin-bottom:8px;">🎴 Документ</h3>
      <div style="opacity:.7; font-size:13px; margin-bottom:16px;">Карточная онлайн-игра 2×2</div>
      <div class="about-row"><span>Версия</span><b>0.9</b></div>
      <div class="about-row"><span>Разработчик</span><b>Dr.Nec.D</b></div>
      <div class="about-row"><span>Контакты</span><b>—</b></div>
      <div style="opacity:.5; font-size:12px; margin-top:16px;">© 2026 Dr.Nec.D · Все права защищены</div>
      <button class="simple-modal-close-btn" id="aboutClose">Закрыть</button>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick = (e) => { if (e.target === el) el.remove(); };
  document.getElementById('aboutClose').onclick = () => el.remove();
}