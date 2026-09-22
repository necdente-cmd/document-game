import { state, getAvatar } from '../state.js';
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
    <p><b>ID:</b> <code style="background:rgba(255,255,255,.1); padding:2px 6px; border-radius:4px;">${esc(me.id || '—')}</code></p>
    <p style="opacity:.6">Скоро: статистика партий, победы, лучший игрок.</p>
  `);
}