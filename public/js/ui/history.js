import { state } from '../state.js';

export function showHistory() {
  const s = state.server;
  if (!s) return;
  const el = document.createElement('div');
  el.className = 'overlay';
  el.style.zIndex = 900;
  el.innerHTML = `
    <div class="ov-title">📜 История конов</div>
    <div class="history-list">
      ${(!s.roundHistory || s.roundHistory.length === 0)
        ? '<div class="ov-wait">Пока нет конов</div>'
        : s.roundHistory.map(r => `<div class="history-row">Кон ${r.n}: 🏆 Team ${r.winner ? 'B' : 'A'}</div>`).join('')}
    </div>
    <div class="ov-buttons"><button class="b1" id="closeHistory">Закрыть</button></div>
  `;
  document.body.appendChild(el);
  el.onclick = e => {
    if (e.target === el || e.target.id === 'closeHistory') el.remove();
  };
}