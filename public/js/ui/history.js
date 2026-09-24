import { state } from '../state.js';
import { t } from '../i18n.js';

export function showHistory() {
  const s = state.server;
  if (!s) return;
  const el = document.createElement('div');
  el.className = 'overlay';
  el.style.zIndex = 900;
  el.innerHTML = `
    <div class="ov-title">${t('history.title')}</div>
    <div class="history-list">
      ${(!s.roundHistory || s.roundHistory.length === 0)
        ? `<div class="ov-wait">${t('history.empty')}</div>`
        : s.roundHistory.map(r => `<div class="history-row">${t('history.round', { n: r.n })}: ${t('history.wonBy', { team: r.winner ? 'B' : 'A' })}</div>`).join('')}
    </div>
    <div class="ov-buttons"><button class="b1" id="closeHistory">${t('common.close')}</button></div>
  `;
  document.body.appendChild(el);
  el.onclick = e => {
    if (e.target === el || e.target.id === 'closeHistory') el.remove();
  };
}