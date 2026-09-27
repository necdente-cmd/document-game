// 🎛 Админка — логика
const API = '/api/admin';
let password = '';
let playersData = [];
let eventsData = [];
let mailsData = [];
let autoRefreshTimer = null;
let mailFormOpen = false;
let editingMailId = null;

// ==================== УТИЛИТЫ ====================
async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'X-Admin-Password': password,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function fmtTime(ts) {
  if (!ts) return '—';
  const d = new Date(Number(ts));
  const now = Date.now();
  const diff = now - Number(ts);
  if (diff < 60_000) return 'только что';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + ' мин назад';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + ' ч назад';
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function shortId(id) {
  if (!id) return '—';
  return String(id).slice(0, 10);
}

// ==================== КОРОТКИЙ АВАТАР ДЛЯ ТАБЛИЦЫ ====================
// IMG:data:...  → миниатюра с золотой рамкой (клик = открыть большое фото)
// avatar-N      → миниатюра готовая + подпись
// пусто         → прочерк
function shortAvatarHtml(avatar, size = 36) {
  if (!avatar) return '<span style="opacity:.3">—</span>';

  // Своё фото (base64)
  if (typeof avatar === 'string' && avatar.startsWith('IMG:')) {
    const src = avatar.slice(4);
    const id = 'av_' + Math.random().toString(36).slice(2, 8);
    // Сохраняем base64 в data-атрибут — не в DOM через inline
    // Используем короткий placeholder, реальный src выставляем через JS чтобы не раздувать HTML
    return `<img id="${id}"
                 data-avatar="${id}"
                 alt="фото"
                 title="Своё фото (клик — увеличить)"
                 style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;
                        vertical-align:middle;border:2px solid #f1c40f;cursor:zoom-in;
                        background:#222;"
                 class="avatar-thumb">`;
  }

  // Готовая аватарка "avatar-N" или "default"
  const name = String(avatar).replace(/[^a-z0-9_-]/gi, '');
  return `<img src="/avatars/${name}.png"
               alt="${name}"
               title="${name}"
               style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;
                      vertical-align:middle;border:2px solid rgba(255,255,255,.15);">
          <span style="opacity:.55;margin-left:6px;font-size:11px;vertical-align:middle;">${esc(name)}</span>`;
}

// Отрисовка base64-аватаров отдельным проходом (чтобы HTML таблицы не пух)
function paintAvatarThumbs() {
  document.querySelectorAll('.avatar-thumb[data-avatar]').forEach(img => {
    if (img.dataset.painted === '1') return;
    const p = playersData.find(x => x.name && img.closest('tr')?.innerText.includes(x.name));
    // Простой способ — берём из map по id ячейки, но у нас нет прямой связи.
    // Используем другой приём: аватар подставлен ниже, при рендере строки.
  });
}

// Модалка для просмотра большого фото
function openAvatarPreview(src, name) {
  const existing = document.getElementById('avatarPreviewModal');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'avatarPreviewModal';
  el.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;
                      display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:20px;`;
  el.innerHTML = `
    <div style="text-align:center;max-width:90vw;max-height:90vh;">
      <img src="${src}" style="max-width:100%;max-height:80vh;border-radius:12px;
                                box-shadow:0 10px 40px rgba(0,0,0,.8);border:3px solid #f1c40f;">
      <div style="color:#fff;margin-top:12px;font-size:14px;opacity:.8;">${esc(name || '')}</div>
      <div style="color:#aaa;margin-top:6px;font-size:12px;">Клик в любом месте — закрыть</div>
    </div>
  `;
  el.onclick = () => el.remove();
  document.body.appendChild(el);
}

// ==================== ЛОГИН ====================
function showLogin() {
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('dashboard').hidden = true;
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
}

function showDashboard() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('dashboard').hidden = false;
  loadAll();
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(loadAll, 30000);
}

async function tryLogin(pass) {
  password = pass;
  try {
    await api('/stats');
    localStorage.setItem('adminPass', pass);
    showDashboard();
    return true;
  } catch (e) {
    return false;
  }
}

function logout() {
  password = '';
  localStorage.removeItem('adminPass');
  showLogin();
}

// ==================== ЗАГРУЗКА ====================
async function loadAll() {
  try {
    const [stats, players, events, mails] = await Promise.all([
      api('/stats'),
      api('/players?limit=500'),
      api('/events?limit=200'),
      api('/mails'),
    ]);
    playersData = players.players || [];
    eventsData = events.events || [];
    mailsData = mails.mails || [];
    renderStats(stats);
    renderMails();
    renderPlayers();
    renderEvents();
    document.getElementById('updated').textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru-RU');
    document.getElementById('autoRefresh').textContent = '· автообновление 30с';
  } catch (e) {
    console.error(e);
    if (e.message === 'Unauthorized') logout();
  }
}

// ==================== РЕНДЕР: СТАТИСТИКА ====================
function renderStats(stats) {
  document.getElementById('statPlayers').textContent = stats.totalPlayers ?? '—';
  document.getElementById('statGames').textContent = stats.totalGames ?? '—';
  document.getElementById('statActive').textContent = stats.activeToday ?? '—';
}

// ==================== РЕНДЕР: ПОЧТА ====================
function renderMails() {
  const list = document.getElementById('mailsList');
  if (mailsData.length === 0) {
    list.innerHTML = '<div class="events-empty">Пока нет писем. Создайте первое!</div>';
    return;
  }
  list.innerHTML = mailsData.map(m => `
    <div class="mail-item">
      <div class="mail-item-head">
        <span class="mail-item-date">${fmtDate(m.date)}</span>
        <button class="mail-del" data-del="${m.id}" title="Удалить">🗑</button>
      </div>
      <div class="mail-item-title">${esc(m.title)}</div>
      <div class="mail-item-body">${esc(m.body).replace(/\n/g, '<br>')}</div>
    </div>
  `).join('');

  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.del;
      if (!confirm('Удалить это письмо у всех игроков?')) return;
      try {
        await api('/mails/' + id, { method: 'DELETE' });
        mailsData = mailsData.filter(m => String(m.id) !== String(id));
        renderMails();
      } catch (e) {
        alert('Ошибка удаления: ' + e.message);
      }
    };
  });
}

function openMailForm() {
  mailFormOpen = true;
  editingMailId = null;
  document.getElementById('mailTitle').value = '';
  document.getElementById('mailDate').value = '';
  document.getElementById('mailBody').value = '';
  document.getElementById('mailFormErr').textContent = '';
  document.getElementById('mailForm').hidden = false;
  document.getElementById('newMailBtn').hidden = true;
  document.getElementById('mailTitle').focus();
}

function closeMailForm() {
  mailFormOpen = false;
  editingMailId = null;
  document.getElementById('mailForm').hidden = true;
  document.getElementById('newMailBtn').hidden = false;
  document.getElementById('mailFormErr').textContent = '';
}

async function saveMail() {
  const title = document.getElementById('mailTitle').value.trim();
  const body = document.getElementById('mailBody').value.trim();
  const date = document.getElementById('mailDate').value || null;
  const errEl = document.getElementById('mailFormErr');

  if (!title) { errEl.textContent = '⚠ Укажите заголовок'; return; }
  if (!body)  { errEl.textContent = '⚠ Укажите текст письма'; return; }

  errEl.textContent = 'Отправка…';
  try {
    const r = await api('/mails', {
      method: 'POST',
      body: JSON.stringify({ title, body, date }),
    });
    if (!r.ok) throw new Error(r.err || 'Ошибка');
    closeMailForm();
    await loadAll();
  } catch (e) {
    errEl.textContent = '❌ ' + e.message;
  }
}

// ==================== РЕНДЕР: ИГРОКИ ====================
function renderPlayers() {
  const query = (document.getElementById('playerSearch').value || '').toLowerCase().trim();
  const filtered = query
    ? playersData.filter(p => (p.name || '').toLowerCase().includes(query))
    : playersData;

  const tbody = document.getElementById('playersBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;opacity:.5;padding:20px;">Нет игроков</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((p, i) => {
    const av = p.avatar || '';
    const rowId = 'av_' + i;

    if (typeof av === 'string' && av.startsWith('IMG:')) {
      // Своё фото — короткая ячейка с миниатюрой
      // base64 передаём через data-src, реальную ссылку ставим после рендера
      return `
        <tr>
          <td style="text-align:center;">
            <img data-preview="1"
                 data-avatar-src="${rowId}"
                 data-name="${esc(p.name || '')}"
                 alt="фото" title="Своё фото (клик — увеличить)"
                 class="avatar-thumb"
                 style="width:36px;height:36px;border-radius:50%;object-fit:cover;
                        vertical-align:middle;border:2px solid #f1c40f;cursor:zoom-in;
                        background:#222;">
          </td>
          <td><b>${esc(p.name || '—')}</b></td>
          <td><code title="${esc(p.persistent_id)}">${esc(shortId(p.persistent_id))}</code></td>
          <td>${fmtTime(p.first_seen)}</td>
          <td>${fmtTime(p.last_seen)}</td>
          <td class="num"><b>${p.games_played || 0}</b></td>
          <td class="num" style="color:#2ecc71;"><b>${p.games_won || 0}</b></td>
          <td class="num" style="color:#f1c40f;"><b>${p.rounds_won || 0}</b></td>
        </tr>`;
    }

    // Готовая аватарка
    const name = String(av || 'default').replace(/[^a-z0-9_-]/gi, '');
    return `
      <tr>
        <td style="text-align:center;">
          <img src="/avatars/${name}.png" alt="${name}" title="${name}"
               style="width:36px;height:36px;border-radius:50%;object-fit:cover;
                      vertical-align:middle;border:2px solid rgba(255,255,255,.15);">
          <span style="opacity:.55;margin-left:6px;font-size:11px;vertical-align:middle;">${esc(name)}</span>
        </td>
        <td><b>${esc(p.name || '—')}</b></td>
        <td><code title="${esc(p.persistent_id)}">${esc(shortId(p.persistent_id))}</code></td>
        <td>${fmtTime(p.first_seen)}</td>
        <td>${fmtTime(p.last_seen)}</td>
        <td class="num"><b>${p.games_played || 0}</b></td>
        <td class="num" style="color:#2ecc71;"><b>${p.games_won || 0}</b></td>
        <td class="num" style="color:#f1c40f;"><b>${p.rounds_won || 0}</b></td>
      </tr>`;
  }).join('');

  // Второй проход: подставляем base64 в миниатюры (чтобы HTML таблицы не пух)
  // Используем замыкание — у нас есть filtered массив.
  let idx = 0;
  const thumbCells = tbody.querySelectorAll('img.avatar-thumb[data-avatar-src]');
  thumbCells.forEach(img => {
    // Находим соответствующую запись игрока по порядку
    // (все строки с IMG: идут подряд, и мы их считаем)
    // Проще: перебрать filtered и найти по имени
    const name = img.dataset.name;
    const player = filtered.find(p =>
      (p.name || '') === name && typeof p.avatar === 'string' && p.avatar.startsWith('IMG:')
    );
    if (!player) return;
    const src = player.avatar.slice(4);
    img.src = src;
    img.onclick = () => openAvatarPreview(src, player.name);
  });
}

// ==================== РЕНДЕР: СОБЫТИЯ ====================
function renderEvents() {
  const filter = document.getElementById('eventFilter').value;
  const filtered = filter ? eventsData.filter(e => e.type === filter) : eventsData;

  const list = document.getElementById('eventsList');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="events-empty">Нет событий</div>';
    return;
  }

  const EVENT_ICON = {
    join: '🔵', reconnect: '🔄', gameStart: '🎮',
    roundWin: '🏆', gameWin: '👑', leave: '🔴',
  };
  const EVENT_LABEL = {
    join: 'вошёл', reconnect: 'переподключился', gameStart: 'игра началась',
    roundWin: 'кон выигран', gameWin: 'ПАРТИЯ ВЫИГРАНА', leave: 'вышел',
  };

  list.innerHTML = filtered.map(e => {
    const d = e.data || {};
    const icon = EVENT_ICON[e.type] || '·';
    const label = EVENT_LABEL[e.type] || e.type;
    const name = d.name ? esc(d.name) : shortId(e.persistent_id);
    const team = d.team != null ? `<span class="ev-team">Team ${d.team ? 'B' : 'A'}</span>` : '';
    return `
      <div class="event-row">
        <span class="ev-icon">${icon}</span>
        <span class="ev-time">${fmtTime(e.time)}</span>
        <span class="ev-text"><b>${name}</b> ${label}</span>
        ${team}
      </div>
    `;
  }).join('');
}

// ==================== ОБРАБОТЧИКИ ====================
document.getElementById('loginBtn').onclick = async () => {
  const pass = document.getElementById('passInput').value;
  if (!pass) return;
  const ok = await tryLogin(pass);
  if (!ok) {
    document.getElementById('loginErr').textContent = '❌ Неверный пароль';
    document.getElementById('passInput').value = '';
  }
};

document.getElementById('passInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('refreshBtn').onclick = () => loadAll();

document.getElementById('csvBtn').onclick = () => {
  const url = `${API}/players.csv?pass=${encodeURIComponent(password)}`;
  window.open(url, '_blank');
};

document.getElementById('logoutBtn').onclick = () => {
  if (confirm('Выйти из админки?')) logout();
};

// Почта
document.getElementById('newMailBtn').onclick = () => openMailForm();
document.getElementById('cancelMailBtn').onclick = () => closeMailForm();
document.getElementById('saveMailBtn').onclick = () => saveMail();

document.getElementById('playerSearch').addEventListener('input', renderPlayers);
document.getElementById('eventFilter').addEventListener('change', renderEvents);

// ==================== СТАРТ ====================
(async function init() {
  const saved = localStorage.getItem('adminPass');
  if (saved) {
    const ok = await tryLogin(saved);
    if (!ok) {
      localStorage.removeItem('adminPass');
      showLogin();
    }
  } else {
    showLogin();
  }
})();