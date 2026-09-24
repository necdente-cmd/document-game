// Модалки: правила (теперь туториал), почта, профиль
import { state } from '../state.js';
import { showTutorial } from './tutorial.js';

// ==================== 📜 ПРАВИЛА (открывает туториал) ====================
export function showRules() {
  showTutorial();
}

// ==================== ✉️ ПОЧТА ====================
export function showMail() {
  const el = document.createElement('div');
  el.className = 'simple-modal';
  el.innerHTML = `
    <div class="simple-modal-inner" style="max-width:500px;">
      <h3>✉️ Почта</h3>
      <div class="body">
        <div style="opacity:.5; font-size:13px; text-align:center; padding:20px 0;">
          📭 Пока нет сообщений
        </div>
        <div style="opacity:.4; font-size:12px; text-align:center; margin-top:10px;">
          Новости и обновления будут появляться здесь
        </div>
      </div>
      <button class="close-btn" id="mailClose">Закрыть</button>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick = (e) => { if (e.target === el) el.remove(); };
  document.getElementById('mailClose').onclick = () => el.remove();
}

// ==================== 🧑 ПРОФИЛЬ ====================
export function showProfile() {
  const me = state.me;
  const name = me?.name || 'Игрок';
  const avatar = me?.avatar || '😎';

  const el = document.createElement('div');
  el.className = 'simple-modal';
  el.innerHTML = `
    <div class="simple-modal-inner" style="max-width:460px;">
      <h3>🧑 Профиль</h3>
      <div class="body" style="text-align:center;">
        <div style="font-size:64px; line-height:1; margin:8px 0 12px;">${avatar}</div>
        <div style="font-size:20px; font-weight:700; margin-bottom:4px;">${escapeHtml(name)}</div>
        <div style="opacity:.5; font-size:13px;">ID: ${me?.id ? me.id.slice(0, 8) : '—'}</div>

        <div style="margin-top:18px; padding-top:16px; border-top:1px solid rgba(255,255,255,.1);">
          <div class="about-row"><span>Версия</span><b>0.9</b></div>
          <div class="about-row"><span>Разработчик</span><b>Dr.Nec.D</b></div>
          <div class="about-row"><span>Партий сыграно</span><b>—</b></div>
          <div class="about-row"><span>Побед</span><b>—</b></div>
        </div>

        <div style="opacity:.5; font-size:12px; margin-top:14px;">
          Статистика появится в следующих версиях
        </div>
      </div>
      <button class="close-btn" id="profileClose">Закрыть</button>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick = (e) => { if (e.target === el) el.remove(); };
  document.getElementById('profileClose').onclick = () => el.remove();
}

// Утилита
function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[c]));
}