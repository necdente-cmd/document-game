import { state, savePrefs, applyScale } from '../state.js';
import { socket } from '../socket.js';
import { showHistory } from './history.js';
import { t, getLang, setLang } from '../i18n.js';

export function openSettings(onClose) {
  let panel = document.getElementById('settingsPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'settings-panel';
    panel.id = 'settingsPanel';
    document.body.appendChild(panel);
  }

  const s = state.server || { swapUsedByTeam: [false, false] };
  const scale = document.documentElement.dataset.scale || 'medium';
  const curTheme = document.documentElement.dataset.theme || 'classic';
  const curLang = getLang();

  panel.innerHTML = `
    <button class="close-btn" id="closeSettings">✕</button>
    <h3>${t('settings.title')}</h3>

    <div class="settings-section">
      <h4>${t('settings.soundVibro')}</h4>
      <div class="toggle-row">
        <span>${t('settings.sound')}</span>
        <div class="toggle ${state.soundOn ? 'on' : ''}" data-toggle="sound"></div>
      </div>
      <div class="toggle-row">
        <span>${t('settings.vibration')}</span>
        <div class="toggle ${state.vibrationOn ? 'on' : ''}" data-toggle="vibration"></div>
      </div>
      <div class="toggle-row">
        <span>${t('settings.mic')}</span>
        <div class="toggle ${state.micOn ? 'on' : ''}" data-toggle="mic"></div>
      </div>
    </div>

    <div class="settings-section">
      <h4>${t('settings.language')}</h4>
      <div class="lang-row">
        <button class="lang-btn ${curLang==='ru'?'sel':''}" data-lang-set="ru">🇷🇺 Русский</button>
        <button class="lang-btn ${curLang==='ky'?'sel':''}" data-lang-set="ky">🇰🇬 Кыргызча</button>
      </div>
    </div>

    <div class="settings-section">
      <h4>${t('settings.scale')}</h4>
      <div class="scale-row">
        <button data-scale="small"  class="${scale==='small'?'sel':''}">${t('settings.scaleSmall')}</button>
        <button data-scale="medium" class="${scale==='medium'?'sel':''}">${t('settings.scaleMedium')}</button>
        <button data-scale="large"  class="${scale==='large'?'sel':''}">${t('settings.scaleLarge')}</button>
      </div>
    </div>

    <div class="settings-section">
      <h4>${t('settings.themeTitle')} <span style="font-weight:400;opacity:.6;font-size:11px;">${t('settings.themeHint')}</span></h4>
      <div class="theme-grid" id="settingsThemePick">
        <div class="theme-preview ${curTheme==='classic'?'sel':''}" data-theme-val="classic">
          <div class="tp-inner"></div>
          <div class="tp-label">${t('create.themeClassic')}</div>
        </div>
        <div class="theme-preview ${curTheme==='dark'?'sel':''}" data-theme-val="dark">
          <div class="tp-inner"></div>
          <div class="tp-label">${t('create.themeDark')}</div>
        </div>
        <div class="theme-preview ${curTheme==='neon'?'sel':''}" data-theme-val="neon">
          <div class="tp-inner"></div>
          <div class="tp-label">${t('create.themeNeon')}</div>
        </div>
        <div class="theme-preview ${curTheme==='paper'?'sel':''}" data-theme-val="paper">
          <div class="tp-inner"></div>
          <div class="tp-label">${t('create.themePaper')}</div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4>${t('settings.history')}</h4>
      <button class="menu-btn" id="openHistory">${t('settings.openHistory')}</button>
    </div>

    <div class="settings-section">
      <h4>${t('settings.room')}</h4>
      <button class="menu-btn danger" id="leaveRoomBtn">${t('settings.leaveRoom')}</button>
    </div>
  `;

  panel.classList.add('open');

  document.getElementById('closeSettings').onclick = () => {
    panel.classList.remove('open');
    if (onClose) onClose();
  };

  panel.onclick = (e) => {
    const tgl = e.target.closest('[data-toggle]');
    if (tgl) {
      const key = tgl.dataset.toggle;
      if (key === 'sound')     { state.soundOn = !state.soundOn; tgl.classList.toggle('on', state.soundOn); }
      if (key === 'vibration') { state.vibrationOn = !state.vibrationOn; tgl.classList.toggle('on', state.vibrationOn); }
      if (key === 'mic')       { state.micOn = !state.micOn; tgl.classList.toggle('on', state.micOn); }
      savePrefs();
      return;
    }

    // 🌐 Выбор языка
    const lb = e.target.closest('[data-lang-set]');
    if (lb) {
      const code = lb.dataset.langSet;
      setLang(code);
      [...panel.querySelectorAll('.lang-btn')].forEach(b => b.classList.toggle('sel', b === lb));
      // Перерисуем весь экран
      window.dispatchEvent(new CustomEvent('lang-change-requested'));
      // Закрыть настройки
      panel.classList.remove('open');
      if (onClose) onClose();
      return;
    }

    const sc = e.target.closest('[data-scale]');
    if (sc) {
      const val = sc.dataset.scale;
      applyScale(val);
      [...panel.querySelectorAll('.scale-row button')].forEach(b => b.classList.toggle('sel', b === sc));
      if (state.server?.opts) state.server.opts.scale = val;
      const opts = JSON.parse(localStorage.getItem('opts') || '{}');
      opts.scale = val;
      localStorage.setItem('opts', JSON.stringify(opts));
      return;
    }
    const th = e.target.closest('[data-theme-val]');
    if (th) {
      const val = th.dataset.themeVal;
      import('../state.js').then(m => m.applyTheme(val));
      [...panel.querySelectorAll('.theme-preview')].forEach(x => x.classList.toggle('sel', x === th));
      const opts = JSON.parse(localStorage.getItem('opts') || '{}');
      opts.theme = val;
      localStorage.setItem('opts', JSON.stringify(opts));
      return;
    }
  };

  document.getElementById('openHistory').onclick = () => showHistory();
  document.getElementById('leaveRoomBtn').onclick = () => {
    if (!confirm(t('settings.leaveConfirm'))) return;
    socket.emit('leaveRoom');
    localStorage.removeItem('me');
    state.server = null; state.me = null;
    location.reload();
  };
}