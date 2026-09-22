import { state, getAvatar, applyTheme, applyScale, loadPrefs } from '../state.js';
import { esc } from '../card.js';

export function openModal(title, bodyHtml) {
  const el = document.createElement('div');
  el.className = 'simple-modal';
  el.innerHTML = `
    <div class="simple-modal-inner">
      <h3>${title}</h3>
      <div class="body">${bodyHtml}</div>
      <button class="close-btn" id="closeModal">Закрыть</button>
    </div>`;
  document.body.appendChild(el);
  el.onclick = (e) => { if (e.target === el || e.target.id === 'closeModal') el.remove(); };
}

export function showRules() {
  openModal('📜 Правила игры', `
    <p><b>Цель:</b> победить в кону, собрав у себя все или часть своего документа, и бросить их в центр на своём ходу.</p>
    <p><b>Состав:</b> 36 карт, 4 игрока, 2 команды. Партнёры напротив. По 6 карт, козырь — нижняя карта колоды.</p>
    <p><b>Документ:</b> у каждой команды свой. Ступени: 6 → 10 → J → Q → K → A. Победа в кону поднимает команду на ступень.</p>
    <p><b>Своим документом нельзя заходить.</b> Бить — только если он козырь.</p>
    <p><b>Навязанный документ:</b> команда с высшим документом может дать противнику его же документ — тот обязан поднять.</p>
    <p><b>Фальш:</b> защитник может тапнуть карту врага, чтобы потребовать её возврата. Хозяин решает: Принять или Отказать.</p>
    <p><b>Своп:</b> если партнёр вышел, можно 1 раз за кон передать ему все карты и вернуться в игру.</p>
    <p><b>Победа:</b> команда дошла до A и выиграла кон на A — чемпион.</p>
  `);
}

export function showMail() {
  openModal('✉️ Почта', `
    <p>Здесь будут сообщения от разработчика и обновления игры.</p>
    <p style="opacity:.6">Пока пусто.</p>
  `);
}

export function showProfile() {
  const me = state.me;
  if (!me) return;
  openModal('🧑 Профиль', `
    <p><b>Имя:</b> ${esc(me.name)}</p>
    <p><b>Аватар:</b> <span style="font-size:28px;">${esc(me.avatar || '😎')}</span></p>
    <p><b>ID:</b> <code style="background:rgba(255,255,255,.1); padding:2px 6px; border-radius:4px;">${esc(me.id || '—')}</code></p>
    <p style="opacity:.6">Скоро: статистика партий, победы, лучший игрок.</p>
  `);
}

export function showLobbySettings() {
  const opts = JSON.parse(localStorage.getItem('opts') || '{}');
  const scale = opts.scale || 'medium';
  const theme = opts.theme || 'classic';
  const soundOn = localStorage.getItem('soundOn') !== '0';
  const vibOn = localStorage.getItem('vibrationOn') !== '0';

  const el = document.createElement('div');
  el.className = 'simple-modal';
  el.innerHTML = `
    <div class="simple-modal-inner">
      <h3>⚙️ Настройки</h3>
      <div class="body">
        <div class="toggle-row">
          <span>🔊 Звук</span>
          <div class="toggle ${soundOn?'on':''}" data-toggle="sound"></div>
        </div>
        <div class="toggle-row">
          <span>📳 Вибрация</span>
          <div class="toggle ${vibOn?'on':''}" data-toggle="vibration"></div>
        </div>

        <h4 style="margin-top:16px; margin-bottom:8px;">📐 Масштаб</h4>
        <div class="scale-row">
          <button data-scale="small"  class="${scale==='small'?'sel':''}">Маленький</button>
          <button data-scale="medium" class="${scale==='medium'?'sel':''}">Средний</button>
          <button data-scale="large"  class="${scale==='large'?'sel':''}">Большой</button>
        </div>

        <h4 style="margin-top:16px; margin-bottom:8px;">🎨 Тема стола</h4>
        <select id="themeSel" style="width:100%; padding:10px; border-radius:8px; border:none;
                background:rgba(255,255,255,.1); color:inherit; font-size:14px;">
          <option value="classic" ${theme==='classic'?'selected':''}>Классика</option>
          <option value="dark"    ${theme==='dark'?'selected':''}>Тёмная</option>
          <option value="neon"    ${theme==='neon'?'selected':''}>Неон</option>
          <option value="paper"   ${theme==='paper'?'selected':''}>Бумага</option>
        </select>
      </div>
      <button class="close-btn" id="closeModal">Закрыть</button>
    </div>`;
  document.body.appendChild(el);

  el.onclick = (e) => {
    if (e.target === el || e.target.id === 'closeModal') { el.remove(); return; }

    const t = e.target.closest('[data-toggle]');
    if (t) {
      const key = t.dataset.toggle;
      const storageKey = key === 'sound' ? 'soundOn' : 'vibrationOn';
      const cur = localStorage.getItem(storageKey) !== '0';
      localStorage.setItem(storageKey, cur ? '0' : '1');
      t.classList.toggle('on', !cur);
      loadPrefs();
      return;
    }

    const sc = e.target.closest('[data-scale]');
    if (sc) {
      const val = sc.dataset.scale;
      applyScale(val);
      const o = JSON.parse(localStorage.getItem('opts') || '{}');
      o.scale = val;
      localStorage.setItem('opts', JSON.stringify(o));
      [...el.querySelectorAll('.scale-row button')].forEach(b => b.classList.toggle('sel', b === sc));
      return;
    }
  };

  el.addEventListener('change', (e) => {
    if (e.target.id === 'themeSel') {
      const v = e.target.value;
      applyTheme(v);
      const o = JSON.parse(localStorage.getItem('opts') || '{}');
      o.theme = v;
      localStorage.setItem('opts', JSON.stringify(o));
    }
  });
}