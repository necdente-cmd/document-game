import { state, saveMe } from '../state.js';
import { socket } from '../socket.js';
import { esc } from '../card.js';

// ==================== ФЕЙЕРВЕРК ====================
function startFireworks(canvas, durationMs = 8000) {
  const ctx = canvas.getContext('2d');
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  const onResize = () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  const particles = [];
  const rockets   = [];
  const colors = ['#f1c40f','#e74c3c','#3498db','#2ecc71','#9b59b6','#e67e22','#1abc9c','#fff'];

  function spawnRocket() {
    const x = W * 0.15 + Math.random() * W * 0.7;
    const targetY = H * 0.15 + Math.random() * H * 0.35;
    rockets.push({
      x, y: H + 10,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -(6 + Math.random() * 3),
      targetY,
      color: colors[Math.floor(Math.random() * colors.length)],
      trail: [],
    });
  }

  function explode(x, y, color) {
    const count = 40 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.15;
      const sp = 1.5 + Math.random() * 3.5;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        color: Math.random() < 0.3 ? '#fff' : color,
        size: 1.5 + Math.random() * 1.5,
      });
    }
  }

  const startedAt = Date.now();
  let rafId = 0;
  let nextLaunch = 0;

  function frame() {
    const elapsed = Date.now() - startedAt;
    if (elapsed > durationMs) {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, W, H);
      return;
    }

    // Trail-эффект: не стираем полностью, а затемняем
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);

    // Запуск новых ракет
    if (elapsed > nextLaunch) {
      spawnRocket();
      nextLaunch = elapsed + 250 + Math.random() * 400;
    }

    // Ракеты
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.06;
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 8) r.trail.shift();

      // Рисуем след
      ctx.beginPath();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.moveTo(r.trail[0].x, r.trail[0].y);
      for (let t = 1; t < r.trail.length; t++) {
        ctx.lineTo(r.trail[t].x, r.trail[t].y);
      }
      ctx.stroke();

      if (r.y <= r.targetY || r.vy >= 0) {
        explode(r.x, r.y, r.color);
        rockets.splice(i, 1);
      }
    }

    // Частицы
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(frame);
  }
  frame();
}

// ==================== ЭКРАН ЧЕМПИОНА ====================
export function maybeShowChampion(navigate) {
  const s = state.server;
  if (!s || s.phase !== 'gameEnd' || s.winnerTeam == null) return;
  if (document.getElementById('champOverlay')) return;

  const winTeam = s.winnerTeam;
  const winners = s.players.filter(p => p.team === winTeam).map(p => p.name).join(' и ');
  const minutes = s.gameStartTime ? Math.round((Date.now() - s.gameStartTime) / 60000) : 0;
  const stats = s.playerStats || [0,0,0,0];
  const bestScore = Math.max(...stats);
  const bestSeats = stats.map((v, i) => v === bestScore ? i : -1).filter(i => i >= 0);
  const bestNames = bestSeats.map(i => s.players.find(p => p.seat === i)?.name).filter(Boolean).join(', ');

  const el = document.createElement('div');
  el.className = 'champ-overlay';
  el.id = 'champOverlay';
  el.innerHTML = `
    <canvas id="fireworksCanvas" class="fireworks-canvas"></canvas>
    <div class="champ-content">
      <div class="champ-title">🏆 Team ${winTeam ? 'B' : 'A'} — ЧЕМПИОН!</div>
      <div class="champ-names">${esc(winners)}</div>
      <div class="champ-stats">
        Счёт: ${s.roundWins[0]} : ${s.roundWins[1]}<br>
        Время партии: ~${minutes} мин<br>
        Конов сыграно: ${(s.roundHistory || []).length}
      </div>
      <div class="champ-best">⭐ Лучший игрок: ${esc(bestNames || '—')} (${bestScore} кон.)</div>
      <div class="champ-buttons">
        <button id="playAgainBtn" style="background:#f1c40f; color:#000;">🔄 Играть снова</button>
        <button id="exitMenuBtn" style="background:#95a5a6; color:#000;">🚪 Выйти в меню</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  // Запускаем фейерверк
  const canvas = document.getElementById('fireworksCanvas');
  if (canvas) startFireworks(canvas, 12000);

  document.getElementById('playAgainBtn').onclick = () => { el.remove(); socket.emit('restartGame'); };
  document.getElementById('exitMenuBtn').onclick = () => {
    el.remove();
    socket.emit('leaveRoom');
    saveMe(null);
    state.server = null;
    navigate('welcome');
  };
}