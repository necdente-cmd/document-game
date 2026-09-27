import { state } from '../state.js';
import { showTutorial } from './tutorial.js';
import { t } from '../i18n.js';

// ==================== 📜 ПРАВИЛА ====================
export function showRules() {
  showTutorial();
}

// ==================== ✉️ ПОЧТА (читает с /api/mails) ====================
export async function showMail() {
  const el = document.createElement('div');
  el.className = 'simple-modal';
  el.id = 'mailModal';
  el.innerHTML = `
    <div class="simple-modal-inner" style="max-width:520px;">
      <h3>${t('mail.title')}</h3>
      <div class="mail-list" id="mailList">
        <div class="mail-loading">Загрузка…</div>
      </div>
      <button class="close-btn" id="mailClose">${t('common.close')}</button>
    </div>
  `;
  document.body.appendChild(el);

  try {
    const res = await fetch('/api/mails?t=' + Date.now());
    const mails = await res.json();

    const readIds = getReadMailIds();
    const list = document.getElementById('mailList');

    if (!mails || mails.length === 0) {
      list.innerHTML = `<div class="mail-empty">${t('mail.empty')}</div>`;
    } else {
      list.innerHTML = mails.map(m => {
        const isUnread = !readIds.includes(m.id);
        return `
          <div class="mail-item ${isUnread ? 'unread' : ''}" data-id="${m.id}">
            <div class="mail-head">
              <span class="mail-date">${formatDate(m.date)}</span>
              ${isUnread ? '<span class="mail-new">NEW</span>' : ''}
            </div>
            <div class="mail-title">${escapeHtml(m.title)}</div>
            <div class="mail-body">${escapeHtml(m.body).replace(/\n/g, '<br>')}</div>
          </div>
        `;
      }).join('');
    }

    markAllMailsAsRead(mails);
  } catch (e) {
    console.error('[mail] error:', e);
    document.getElementById('mailList').innerHTML =
      `<div class="mail-empty">Не удалось загрузить письма</div>`;
  }

  const close = () => { el.remove(); updateMailBadge(); };
  el.onclick = (e) => { if (e.target === el) close(); };
  document.getElementById('mailClose').onclick = close;
}

// ==================== 📧 БЕЙДЖ ====================
export async function updateMailBadge() {
  const btn = document.getElementById('btnMail');
  if (!btn) return;

  try {
    const res = await fetch('/api/mails?t=' + Date.now());
    const mails = await res.json();
    if (!mails || mails.length === 0) { removeBadge(btn); return; }

    const readIds = getReadMailIds();
    const unread = mails.filter(m => !readIds.includes(m.id)).length;

    if (unread <= 0) { removeBadge(btn); return; }

    let badge = btn.querySelector('.chat-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'chat-badge';
      btn.appendChild(badge);
    }
    badge.textContent = unread > 9 ? '9+' : String(unread);
  } catch (e) {
    removeBadge(btn);
  }
}

function removeBadge(btn) {
  const badge = btn.querySelector('.chat-badge');
  if (badge) badge.remove();
}

// ==================== УТИЛИТЫ ====================
function getReadMailIds() {
  try { return JSON.parse(localStorage.getItem('readMails') || '[]'); }
  catch { return []; }
}

function markAllMailsAsRead(mails) {
  if (!mails || mails.length === 0) return;
  const allIds = mails.map(m => m.id);
  const readIds = getReadMailIds();
  const merged = [...new Set([...readIds, ...allIds])];
  try { localStorage.setItem('readMails', JSON.stringify(merged)); } catch {}
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ==================== 🧑 ПРОФИЛЬ ====================
export function showProfile() {
  const me = state.me;
  const name = me?.name || t('common.player');
  const avatar = me?.avatar || '😎';

  const el = document.createElement('div');
  el.className = 'simple-modal';
  el.innerHTML = `
    <div class="simple-modal-inner" style="max-width:460px;">
      <h3>${t('profile.title')}</h3>
      <div class="body" style="text-align:center;">
        <div style="font-size:64px; line-height:1; margin:8px 0 12px;">${avatar}</div>
        <div style="font-size:20px; font-weight:700; margin-bottom:4px;">${escapeHtml(name)}</div>
        <div style="opacity:.5; font-size:13px;">${t('profile.id')}: ${me?.id ? me.id.slice(0, 8) : '—'}</div>
        <div style="margin-top:18px; padding-top:16px; border-top:1px solid rgba(255,255,255,.1);">
          <div class="about-row"><span>${t('about.version')}</span><b>0.9</b></div>
          <div class="about-row"><span>${t('about.developer')}</span><b>Dr.Nec.D</b></div>
          <div class="about-row"><span>${t('profile.gamesPlayed')}</span><b>—</b></div>
          <div class="about-row"><span>${t('profile.wins')}</span><b>—</b></div>
        </div>
        <div style="opacity:.5; font-size:12px; margin-top:14px;">
          ${t('profile.statsLater')}
        </div>
      </div>
      <button class="close-btn" id="profileClose">${t('common.close')}</button>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick = (e) => { if (e.target === el) el.remove(); };
  document.getElementById('profileClose').onclick = () => el.remove();
}