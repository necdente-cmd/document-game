import { loadName } from '../state.js';
import { showRules, showMail, showProfile } from '../ui/modals.js';
import { toggleMusic, isMusicOn } from '../music.js';
import { playSound } from '../sound.js';
import { t } from '../i18n.js';
import { createLangButton } from '../ui/lang-switch.js';

export function renderWelcome(app, navigate) {
  const musicOn = isMusicOn();

  app.innerHTML = `
    <div class="lobby" style="justify-content:center; min-height:100dvh; position:relative;">
      <div style="position:absolute; top:14px; right:14px; display:flex; gap:8px;">
        <button id="btnLang"    class="icon-btn" title="Язык / Тил"></button>
        <button id="btnMusic"   class="icon-btn ${musicOn?'active':''}" title="${t('welcome.musicOn')}">${musicOn ? '🎵' : '🔇'}</button>
        <button id="btnMail"    class="icon-btn" title="${t('mail.title')}">✉️</button>
        <button id="btnProfile" class="icon-btn" title="${t('profile.title')}">🧑</button>
      </div>

      <h2 class="welcome-title">🃏 ${t('welcome.title')}</h2>
      <div class="welcome-sub">${t('welcome.subtitle')}</div>

      <button id="goCreate" class="welcome-btn primary">${t('welcome.createGame')}</button>
      <button id="goJoin"   class="welcome-btn secondary">${t('welcome.joinByCode')}</button>
      <button id="goTutorial" class="welcome-btn tertiary">${t('welcome.howToPlay')}</button>

      <div class="welcome-footer">
        <span class="welcome-friends">${t('welcome.friends')}</span>
        <span class="welcome-author" id="authorBtn" title="О разработчике">${t('welcome.author')}</span>
      </div>
    </div>
  `;

  document.getElementById('goCreate').onclick   = () => { playSound('button'); navigate('create'); };
  document.getElementById('goJoin').onclick     = () => { playSound('button'); navigate('join'); };
  document.getElementById('goTutorial').onclick = () => { playSound('button'); showRules(); };
  document.getElementById('btnMail').onclick    = () => { playSound('button'); showMail(); };
  document.getElementById('btnProfile').onclick = () => { playSound('button'); showProfile(); };

  // 🌐 Кнопка языка
  const langContainer = document.getElementById('btnLang');
  if (langContainer) {
    const newLangBtn = createLangButton();
    // Переносим содержимое (текст, onclick) в существующую кнопку
    langContainer.textContent = newLangBtn.textContent;
    langContainer.onclick = newLangBtn.onclick;
    // Синхронизация флага после клика
    langContainer.dataset.langBtn = '1';
  }

  const musicBtn = document.getElementById('btnMusic');
  if (musicBtn) {
    musicBtn.onclick = () => {
      playSound('button');
      const on = toggleMusic();
      musicBtn.textContent = on ? '🎵' : '🔇';
      musicBtn.classList.toggle('active', on);
    };
  }

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
      <h3 style="margin-bottom:8px;">🎴 ${t('about.title')}</h3>
      <div style="opacity:.7; font-size:13px; margin-bottom:16px;">${t('about.subtitle')}</div>
      <div class="about-row"><span>${t('about.version')}</span><b>0.9</b></div>
      <div class="about-row"><span>${t('about.developer')}</span><b>Dr.Nec.D</b></div>
      <div class="about-row"><span>${t('about.contacts')}</span><b>—</b></div>
      <div style="opacity:.5; font-size:12px; margin-top:16px;">${t('about.rights')}</div>
      <button class="simple-modal-close-btn" id="aboutClose">${t('common.close')}</button>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick = (e) => { if (e.target === el) el.remove(); };
  document.getElementById('aboutClose').onclick = () => el.remove();
}