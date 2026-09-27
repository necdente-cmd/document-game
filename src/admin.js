// 🎛 Админ-API — только для разработчика
import { getRecentPlayers, getRecentEvents, getStats } from './db.js';

export function setupAdminRoutes(app) {
  const PASSWORD = process.env.ADMIN_PASSWORD || 'dokument2026';

  function checkAuth(req, res, next) {
    const pass = req.headers['x-admin-password'] || req.query.pass;
    if (pass !== PASSWORD) {
      return res.status(401).json({ ok: false, err: 'Неверный пароль' });
    }
    next();
  }

  // ==================== СТАТИСТИКА ====================
  app.get('/api/admin/stats', checkAuth, async (req, res) => {
    try {
      const stats = await getStats();
      res.json({ ok: true, ...stats });
    } catch (e) {
      res.status(500).json({ ok: false, err: e.message });
    }
  });

  // ==================== ИГРОКИ ====================
  app.get('/api/admin/players', checkAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
      const players = await getRecentPlayers(limit);
      res.json({ ok: true, players });
    } catch (e) {
      res.status(500).json({ ok: false, err: e.message });
    }
  });

  // ==================== СОБЫТИЯ ====================
  app.get('/api/admin/events', checkAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
      const events = await getRecentEvents(limit);
      res.json({ ok: true, events });
    } catch (e) {
      res.status(500).json({ ok: false, err: e.message });
    }
  });

  // ==================== CSV ЭКСПОРТ ====================
  app.get('/api/admin/players.csv', checkAuth, async (req, res) => {
    try {
      const players = await getRecentPlayers(10000);
      const header = 'persistent_id,name,avatar,first_seen,last_seen,games_played,games_won,rounds_won';
      const rows = players.map(p => [
        p.persistent_id,
        csvEscape(p.name),
        p.avatar,
        p.first_seen,
        p.last_seen,
        p.games_played,
        p.games_won,
        p.rounds_won,
      ].join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=players.csv');
      res.send('\uFEFF' + header + '\n' + rows); // BOM для Excel
    } catch (e) {
      res.status(500).json({ ok: false, err: e.message });
    }
  });
}

function csvEscape(s) {
  if (s == null) return '';
  s = String(s);
  if (/[,"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
