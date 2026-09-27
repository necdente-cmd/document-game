// 🎛 Админ-API — только для разработчика
import {
  getRecentPlayers, getRecentEvents, getStats,
  getAllMails, createMail, deleteMail,
} from './db.js';

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

  // ==================== ПОЧТА (CRUD) ====================
  app.get('/api/admin/mails', checkAuth, async (req, res) => {
    try {
      const mails = await getAllMails(200);
      res.json({ ok: true, mails });
    } catch (e) {
      res.status(500).json({ ok: false, err: e.message });
    }
  });

  app.post('/api/admin/mails', checkAuth, async (req, res) => {
    try {
      const { title, body, date } = req.body || {};
      if (!title || !body) {
        return res.status(400).json({ ok: false, err: 'Укажите заголовок и текст' });
      }
      const mail = await createMail({
        title: String(title).trim().slice(0, 200),
        body: String(body).trim().slice(0, 5000),
        date: date || null,
      });
      res.json({ ok: true, mail });
    } catch (e) {
      res.status(500).json({ ok: false, err: e.message });
    }
  });

  app.delete('/api/admin/mails/:id', checkAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) return res.status(400).json({ ok: false, err: 'Неверный ID' });
      await deleteMail(id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, err: e.message });
    }
  });

  // ==================== ПУБЛИЧНЫЙ API ДЛЯ ИГРОКОВ ====================
  app.get('/api/mails', async (req, res) => {
    try {
      const mails = await getAllMails(100);
      res.json(mails);
    } catch (e) {
      res.status(500).json([]);
    }
  });

  // ⚠️ ПУБЛИЧНЫЙ endpoint для диагностики TURN (без пароля)
  app.get('/api/turn-test', async (req, res) => {
    try {
      const { getIceServers } = await import('./turn.js');
      res.json(getIceServers());
    } catch (e) {
      res.status(500).json({ err: e.message });
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
      res.send('\uFEFF' + header + '\n' + rows);
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