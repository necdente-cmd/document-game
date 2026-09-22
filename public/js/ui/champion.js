import { state, saveMe } from '../state.js';
import { socket } from '../socket.js';
import { esc } from '../card.js';

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
  `;
  document.body.appendChild(el);

  document.getElementById('playAgainBtn').onclick = () => { el.remove(); socket.emit('restartGame'); };
  document.getElementById('exitMenuBtn').onclick = () => {
    el.remove();
    socket.emit('leaveRoom');
    saveMe(null);
    state.server = null;
    navigate('welcome');
  };
}