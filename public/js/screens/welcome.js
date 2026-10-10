import { loadName } from '../state.js';
import { showRules, showMail, showProfile, updateMailBadge } from '../ui/modals.js';
import { toggleMusic, isMusicOn } from '../music.js';
import { playSound } from '../sound.js';
import { t } from '../i18n.js';
import { createLangButton } from '../ui/lang-switch.js';
import { socket } from '../socket.js';

function getSavedMe() {
  try { return JSON.parse(localStorage.getItem('me') || 'null'); }
  catch { return null; }
}

export function renderWelcome(app, navigate) {
  const musicOn = isMusicOn();
  const savedMe = getSavedMe();
  const hasRoom = !!(savedMe && savedMe.roomId && savedMe.id);

  // Фоновые карты (декоративные)
  const floatCards = `
    <div class="wl-float wl-f1">♠</div>
    <div class="wl-float wl-f2">♥</div>
    <div class="wl-float wl-f3">♦</div>
    <div class="wl-float wl-f4">♣</div>
    <div class="wl-float wl-f5">A</div>
    <div class="wl-float wl-f6">K</div>
  `;

  app.innerHTML = `
    <div class="wl-page">
      <div class="wl-bg">${floatCards}</div>

      <!-- Верхняя панель иконок -->
      <div class="wl-topbar">
        <button id="btnLang"    class="wl-ico" title="Язык / Тил"></button>
        <button id="btnMusic"   class="wl-ico ${musicOn?'on':''}" title="${musicOn ? t('welcome.musicOn') : t('welcome.musicOff')}">${musicOn ? '🎵' : '🔇'}</button>
        <button id="btnMail"    class="wl-ico" title="${t('mail.title')}">✉️</button>
        <button id="btnProfile" class="wl-ico" title="${t('profile.title')}">🧑</button>
      </div>

      <!-- Логотип -->
      <div class="wl-logo-wrap">
        <img src="/logo.png" class="wl-logo" alt="Документ">
      </div>
      <div class="wl-title">${t('welcome.title')}</div>
      <div class="wl-sub">${t('welcome.subtitle')}</div>

      <!-- Кнопки -->
      <div class="wl-actions">
        ${hasRoom ? `
          <button id="goContinue" class="wl-btn wl-btn-continue">
            <span class="wl-btn-ico">▶</span>
            <span class="wl-btn-body">
              <span class="wl-btn-main">Продолжить</span>
              <span class="wl-btn-sub">${savedMe.roomId}</span>
            </span>
          </button>
        ` : ''}

        <button id="goCreate" class="wl-btn wl-btn-primary">
          <span class="wl-btn-ico">🎮</span>
          <span class="wl-btn-body">
            <span class="wl-btn-main">${t('welcome.createGame')}</span>
          </span>
        </button>

        <button id="goJoin" class="wl-btn wl-btn-secondary">
          <span class="wl-btn-ico">🔗</span>
          <span class="wl-btn-body">
            <span class="wl-btn-main">${t('welcome.joinByCode')}</span>
          </span>
        </button>

        <button id="goTutorial" class="wl-btn wl-btn-tertiary">
          <span class="wl-btn-ico">📚</span>
          <span class="wl-btn-body">
            <span class="wl-btn-main">${t('welcome.howToPlay')}</span>
          </span>
        </button>
      </div>

      <!-- Нижний колонтитул -->
      <div class="wl-footer">
        <button id="goFriends" class="wl-footer-btn">${t('welcome.friends')}</button>
        <button id="authorBtn" class="wl-footer-btn wl-footer-author">${t('welcome.author')}</button>
      </div>
    </div>
  `;

  // === Кнопки ===
  const continueBtn = document.getElementById('goContinue');
  if (continueBtn) {
    continueBtn.onclick = () => {
      playSound('button');
      // Пробуем переподключиться к сохранённой комнате
      const me = getSavedMe();
      if (!me) return navigate('welcome');
      socket.emit('joinRoom', {
        roomId: me.roomId,
        name: me.name,
        playerId: me.id,
        persistentId: null,
      }, (r) => {
        if (r && r.ok) {
          navigate('table');
        } else {
          // Комната недоступна — чистим и остаёмся
          try { localStorage.removeItem('me'); } catch {}
          alert('Комната больше недоступна');
          renderWelcome(app, navigate);
        }
      });
    };
  }

  document.getElementById('goCreate').onclick   = () => { playSound('button'); navigate('create'); };
  document.getElementById('goJoin').onclick     = () => { playSound('button'); navigate('join'); };
  document.getElementById('goTutorial').onclick = () => { playSound('button'); showRules(); };
  document.getElementById('btnMail').onclick    = () => { playSound('button'); showMail(); };
  document.getElementById('btnProfile').onclick = () => { playSound('button'); showProfile(); };

  const friendsBtn = document.getElementById('goFriends');
  if (friendsBtn) {
    friendsBtn.onclick = () => {
      playSound('button');
      // TODO: экран друзей. Пока — тост/заглушка
      alert('👥 Друзья — раздел в разработке');
    };
  }

  // 🌐 Кнопка языка
  const langContainer = document.getElementById('btnLang');
  if (langContainer) {
    const newLangBtn = createLangButton();
    langContainer.textContent = newLangBtn.textContent;
    langContainer.onclick = newLangBtn.onclick;
  }

  // 🎵 Музыка
  const musicBtn = document.getElementById('btnMusic');
  if (musicBtn) {
    musicBtn.onclick = () => {
      playSound('button');
      const on = toggleMusic();
      musicBtn.textContent = on ? '🎵' : '🔇';
      musicBtn.classList.toggle('on', on);
    };
  }

  // 🧑 Автор
  const authorBtn = document.getElementById('authorBtn');
  if (authorBtn) {
    authorBtn.onclick = () => showAboutDev();
  }

  // 📧 Бейдж писем
  updateMailBadge();
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