// 🎛 Админка — логика
const API = '/api/admin';
let password = '';
let playersData = [];
let eventsData = [];
let autoRefreshTimer = null;

// ==================== УТИЛИТЫ ====================
async function api(path) {
  const res = await fetch(API + path, {
    headers: { 'X-Admin-Password': password },
  });
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error('HTTP ' + res.status);
  }
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

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function shortId(id) {
  if (!id) return '—';
  return String(id).slice(0, 10);
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
    await api('/stats'); // проверка
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
    const [stats, players, events] = await Promise.all([
      api('/stats'),
      api('/players?limit=500'),
      api('/events?limit=200'),
    ]);
    playersData = players.players || [];
    eventsData = events.events || [];
    renderStats(stats);
    renderPlayers();
    renderEvents();
    document.getElementById('updated').textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru-RU');
    document.getElementById('autoRefresh').textContent = '· автообновление 30с';
  } catch (e) {
    console.error(e);
    if (e.message === 'Unauthorized') {
      logout();
    }
  }
}

// ==================== РЕНДЕР ====================
function renderStats(stats) {
  document.getElementById('statPlayers').textContent = stats.totalPlayers ?? '—';
  document.getElementById('statGames').textContent = stats.totalGames ?? '—';
  document.getElementById('statActive').textContent = stats.activeToday ?? '—';
}

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

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td style="text-align:center;font-size:20px;">${esc(p.avatar || '👤')}</td>
      <td><b>${esc(p.name || '—')}</b></td>
      <td><code title="${esc(p.persistent_id)}">${esc(shortId(p.persistent_id))}</code></td>
      <td>${fmtTime(p.first_seen)}</td>
      <td>${fmtTime(p.last_seen)}</td>
      <td class="num"><b>${p.games_played || 0}</b></td>
      <td class="num" style="color:#2ecc71;"><b>${p.games_won || 0}</b></td>
      <td class="num" style="color:#f1c40f;"><b>${p.rounds_won || 0}</b></td>
    </tr>
  `).join('');
}

function renderEvents() {
  const filter = document.getElementById('eventFilter').value;
  const filtered = filter ? eventsData.filter(e => e.type === filter) : eventsData;

  const list = document.getElementById('eventsList');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="events-empty">Нет событий</div>';
    return;
  }

  const EVENT_ICON = {
    join: '🔵',
    reconnect: '🔄',
    gameStart: '🎮',
    roundWin: '🏆',
    gameWin: '👑',
    leave: '🔴',
  };
  const EVENT_LABEL = {
    join: 'вошёл',
    reconnect: 'переподключился',
    gameStart: 'игра началась',
    roundWin: 'кон выигран',
    gameWin: 'ПАРТИЯ ВЫИГРАНА',
    leave: 'вышел',
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