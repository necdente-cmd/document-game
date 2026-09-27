// 🐘 PostgreSQL — подключение и утилиты
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error:', err);
});

// ==================== ИНИЦИАЛИЗАЦИЯ СХЕМЫ ====================
export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        persistent_id TEXT PRIMARY KEY,
        name TEXT,
        avatar TEXT,
        first_seen BIGINT NOT NULL,
        last_seen BIGINT NOT NULL,
        games_played INT DEFAULT 0,
        games_won INT DEFAULT 0,
        rounds_won INT DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        time BIGINT NOT NULL,
        type TEXT NOT NULL,
        persistent_id TEXT,
        room_id TEXT,
        data JSONB
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_time ON events(time DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_events_persistent ON events(persistent_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen DESC);`);

    console.log('[db] ✅ Schema ready');
  } catch (e) {
    console.error('[db] init error:', e);
    throw e;
  } finally {
    client.release();
  }
}

// ==================== ИГРОКИ ====================
export async function logPlayerSeen(persistentId, name, avatar) {
  if (!persistentId) return;
  const now = Date.now();
  try {
    await pool.query(`
      INSERT INTO players (persistent_id, name, avatar, first_seen, last_seen)
      VALUES ($1, $2, $3, $4, $4)
      ON CONFLICT (persistent_id) DO UPDATE
        SET last_seen = EXCLUDED.last_seen,
            name = EXCLUDED.name,
            avatar = EXCLUDED.avatar;
    `, [persistentId, name || 'Игрок', avatar || '', now]);
  } catch (e) {
    console.error('[db] logPlayerSeen error:', e.message);
  }
}

export async function incrementStat(persistentId, field, amount = 1) {
  if (!persistentId) return;
  const allowed = ['games_played', 'games_won', 'rounds_won'];
  if (!allowed.includes(field)) return;
  try {
    await pool.query(
      `UPDATE players SET ${field} = ${field} + $1 WHERE persistent_id = $2`,
      [amount, persistentId]
    );
  } catch (e) {
    console.error('[db] incrementStat error:', e.message);
  }
}

export async function getPlayerStats(persistentId) {
  try {
    const r = await pool.query('SELECT * FROM players WHERE persistent_id = $1', [persistentId]);
    return r.rows[0] || null;
  } catch (e) {
    console.error('[db] getPlayerStats error:', e.message);
    return null;
  }
}

export async function getRecentPlayers(limit = 50) {
  try {
    const r = await pool.query(
      'SELECT * FROM players ORDER BY last_seen DESC LIMIT $1',
      [limit]
    );
    return r.rows;
  } catch (e) {
    console.error('[db] getRecentPlayers error:', e.message);
    return [];
  }
}

// ==================== СОБЫТИЯ ====================
export async function logEvent(type, persistentId, roomId, data = {}) {
  try {
    await pool.query(`
      INSERT INTO events (time, type, persistent_id, room_id, data)
      VALUES ($1, $2, $3, $4, $5)
    `, [Date.now(), type, persistentId || null, roomId || null, JSON.stringify(data)]);
  } catch (e) {
    console.error('[db] logEvent error:', e.message);
  }
}

export async function getRecentEvents(limit = 100) {
  try {
    const r = await pool.query(
      'SELECT * FROM events ORDER BY time DESC LIMIT $1',
      [limit]
    );
    return r.rows;
  } catch (e) {
    console.error('[db] getRecentEvents error:', e.message);
    return [];
  }
}

export async function getStats() {
  try {
    const players = await pool.query('SELECT COUNT(*) FROM players');
    const games = await pool.query("SELECT COUNT(*) FROM events WHERE type = 'gameStart'");
    const activeToday = await pool.query(
      'SELECT COUNT(*) FROM players WHERE last_seen > $1',
      [Date.now() - 24 * 60 * 60 * 1000]
    );
    return {
      totalPlayers: parseInt(players.rows[0].count),
      totalGames: parseInt(games.rows[0].count),
      activeToday: parseInt(activeToday.rows[0].count),
    };
  } catch (e) {
    console.error('[db] getStats error:', e.message);
    return { totalPlayers: 0, totalGames: 0, activeToday: 0 };
  }
}

export default pool;