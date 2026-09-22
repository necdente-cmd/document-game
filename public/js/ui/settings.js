import { state, savePrefs, applyScale } from '../state.js';
import { socket } from '../socket.js';
import { showHistory } from './history.js';

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

  panel.innerHTML = `
    <button class="close-btn" id="closeSettings">✕</button>
    <h3>⚙️ Настройки</h3>

    <div class="settings-section">
      <h4>Звук и вибрация</h4>
      <div class="toggle-row">
        <span>🔊 Звук</span>
        <div class="toggle ${state.soundOn ? 'on' : ''}" data-toggle="sound"></div>
      </div>
      <div class="toggle-row">
        <span>📳 Вибрация</span>
        <div class="toggle ${state.vibrationOn ? 'on' : ''}" data-toggle="vibration"></div>
      </div>
      <div class="toggle-row">
        <span>🎤 Микрофон</span>
        <div class="toggle ${state.micOn ? 'on' : ''}" data-toggle="mic"></div>
      </div>
    </div>

    <div class="settings-section">
      <h4>📐 Масштаб</h4>
      <div class="scale-row">
        <button data-scale="small"  class="${scale==='small'?'sel':''}">Маленький</button>
        <button data-scale="medium" class="${scale==='medium'?'sel':''}">Средний</button>
        <button data-scale="large"  class="${scale==='large'?'sel':''}">Большой</button>
      </div>
    </div>

    <div class="settings-section">
      <h4>История</h4>
      <button class="menu-btn" id="openHistory">📜 История конов</button>
    </div>

    <div class="settings-section">
      <h4>Комната</h4>
      <button class="menu-btn danger" id="leaveRoomBtn">🚪 Покинуть комнату</button>
    </div>
  `;

  panel.classList.add('open');

  document.getElementById('closeSettings').onclick = () => {
    panel.classList.remove('open');
    if (onClose) onClose();
  };

  panel.onclick = (e) => {
    const t = e.target.closest('[data-toggle]');
    if (t) {
      const key = t.dataset.toggle;
      if (key === 'sound')     { state.soundOn = !state.soundOn; t.classList.toggle('on', state.soundOn); }
      if (key === 'vibration') { state.vibrationOn = !state.vibrationOn; t.classList.toggle('on', state.vibrationOn); }
      if (key === 'mic')       { state.micOn = !state.micOn; t.classList.toggle('on', state.micOn); }
      savePrefs();
      return;
    }
    const sc = e.target.closest('[data-scale]');
    if (sc) {
      const val = sc.dataset.scale;
      applyScale(val);
      [...panel.querySelectorAll('.scale-row button')].forEach(b => b.classList.toggle('sel', b === sc));
      // сохранить в opts комнаты
      if (state.server?.opts) state.server.opts.scale = val;
      const opts = JSON.parse(localStorage.getItem('opts') || '{}');
      opts.scale = val;
      localStorage.setItem('opts', JSON.stringify(opts));
      return;
    }
  };

  document.getElementById('openHistory').onclick = () => showHistory();
  document.getElementById('leaveRoomBtn').onclick = () => {
    if (!confirm('Выйти из комнаты?')) return;
    socket.emit('leaveRoom');
    localStorage.removeItem('me');
    state.server = null; state.me = null;
    location.reload();
  };
}