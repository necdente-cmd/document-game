import { state, loadName, saveName, saveMe, getPlayerId, getFinalAvatar, loadMode, saveMode } from '../state.js';
import { socket } from '../socket.js';
import { t, getLang } from '../i18n.js';
import { renderAvatarPicker, bindAvatarPicker } from '../ui/avatar-picker.js';
import { playSound } from '../sound.js';

// 🎯 Ripple-эффект
function attachRipple(el) {
  if (!el || el.__ripple) return;
  el.__ripple = true;
  el.addEventListener('pointerdown', (e) => {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.35);
      transform: scale(0);
      pointer-events: none;
      animation: wlRipple 0.6s ease-out;
    `;
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  });
}

export function renderJoin(app, navigate) {
  const savedName = loadName();
  const mode = loadMode();
  let pickedMode = mode;

  app.innerHTML = `
    <div class="jn-page">

      <!-- Заголовок -->
      <div class="jn-header">
        <button class="jn-back" id="backBtn" title="${t('common.back')}">←</button>
        <h1 class="jn-title">${t('join.title')}</h1>
        <div class="jn-header-spacer"></div>
      </div>

      <!-- Скролл-область -->
      <div class="jn-body">

        <!-- Имя -->
        <div class="jn-section">
          <label class="jn-label">${t('create.yourName')}</label>
          <input
            id="name"
            class="jn-input"
            placeholder="${t('create.namePlaceholder')}"
            value="${savedName}"
            maxlength="20"
            autocomplete="off"
          >
        </div>

        <!-- Аватар -->
        <div class="jn-section">
          <label class="jn-label">${t('create.avatar')}</label>
          ${renderAvatarPicker()}
        </div>

        <!-- Режим -->
        <div class="jn-section">
          <label class="jn-label">${t('mode.title')}</label>
          <div class="mode-grid" id="modePick">
            <div class="mode-card ${pickedMode==='beginner'?'sel':''}" data-mode="beginner">
              <div class="mode-title">🌱 ${t('mode.beginner')}</div>
              <div class="mode-hint">${t('mode.beginnerHint')}</div>
            </div>
            <div class="mode-card ${pickedMode==='veteran'?'sel':''}" data-mode="veteran">
              <div class="mode-title">🎖 ${t('mode.veteran')}</div>
              <div class="mode-hint">${t('mode.veteranHint')}</div>
            </div>
          </div>
        </div>

        <!-- Код комнаты -->
        <div class="jn-section">
          <label class="jn-label">${t('join.codeLabel')}</label>
          <input
            id="rid"
            class="jn-input jn-input-code"
            placeholder="${t('join.codePlaceholder')}"
            maxlength="4"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
          >
        </div>

        <div class="jn-err" id="err"></div>

      </div>

      <!-- Sticky footer -->
      <div class="jn-footer">
        <button class="jn-btn jn-btn-primary" id="joinBtn">
          <span class="jn-btn-ico">🚪</span>
          <span class="jn-btn-text">${t('join.enter')}</span>
        </button>
      </div>

    </div>
  `;

  bindAvatarPicker();

  const nameEl = document.getElementById('name');
  const ridEl = document.getElementById('rid');
  const errEl = document.getElementById('err');

  // Всегда большие буквы для кода
  ridEl.addEventListener('input', () => {
    ridEl.value = ridEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  // Enter для перехода
  const onEnter = (e) => {
    if (e.key === 'Enter') document.getElementById('joinBtn').click();
  };
  nameEl.addEventListener('keydown', onEnter);
  ridEl.addEventListener('keydown', onEnter);

  // Режим
  document.getElementById('modePick').onclick = e => {
    const el = e.target.closest('[data-mode]'); if (!el) return;
    playSound('button');
    pickedMode = el.dataset.mode;
    saveMode(pickedMode);
    [...document.querySelectorAll('#modePick .mode-card')]
      .forEach(x => x.classList.toggle('sel', x === el));
  };

  // Назад
  const backBtn = document.getElementById('backBtn');
  attachRipple(backBtn);
  backBtn.onclick = () => {
    playSound('button');
    navigate('welcome');
  };

  // Войти
  const joinBtn = document.getElementById('joinBtn');
  attachRipple(joinBtn);
  joinBtn.onclick = () => {
    playSound('button');
    const name = nameEl.value.trim() || t('common.player');
    const rid = ridEl.value.trim();

    if (!rid) {
      errEl.textContent = t('join.enterCode');
      errEl.classList.add('show');
      ridEl.focus();
      return;
    }
    if (rid.length < 3) {
      errEl.textContent = 'Код слишком короткий';
      errEl.classList.add('show');
      ridEl.focus();
      return;
    }

    errEl.classList.remove('show');
    saveName(name);
    saveMode(pickedMode);

    const finalAvatar = getFinalAvatar();

    socket.emit('joinRoom', {
      roomId: rid,
      name,
      playerId: state.me?.id,
      persistentId: getPlayerId(),
      avatar: finalAvatar,
      mode: pickedMode,
    }, (r) => {
      if (!r.ok) {
        errEl.textContent = r.err || 'Ошибка';
        errEl.classList.add('show');
        return;
      }
      saveMe({
        name,
        id: r.playerId,
        roomId: r.roomId,
        avatar: finalAvatar,
        mode: pickedMode,
      });
      navigate('table');
    });
  };
}