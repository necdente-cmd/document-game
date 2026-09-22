import { LADDERS } from '../constants.js';
import { docsOf, log } from '../rooms.js';

export function winByThrow(r, team, winnerSeat) {
  r.roundWins[team]++;
  if (winnerSeat != null) r.playerStats[winnerSeat]++;
  r.roundHistory.push({ n: r.roundHistory.length + 1, winner: team });

  const ladder = LADDERS[r.opts.docSet];
  if (r.teamStep[team] === ladder.length - 1) {
    r.phase = 'gameEnd';
    r.winnerTeam = team;
    log(r, `🏆 Команда ${team ? 'B' : 'A'} — ЧЕМПИОН!`);
    return;
  }
  r.teamStep[team]++;
  r.phase = 'roundEnd';
  r.pendingStart = { winningTeam: team };
  log(r, `Команда ${team ? 'B' : 'A'} выиграла кон. Счёт ${r.roundWins[0]}:${r.roundWins[1]}`);
}

export function winByExit(r, team) {
  r.roundWins[team]++;
  r.roundHistory.push({ n: r.roundHistory.length + 1, winner: team });
  r.phase = 'roundEnd';
  r.pendingStart = { winningTeam: team };
  log(r, `Команда ${team ? 'B' : 'A'} выиграла кон (все вышли). Счёт ${r.roundWins[0]}:${r.roundWins[1]}`);
}

export function checkTeamExitWin(r) {
  for (const team of [0, 1]) {
    const members = r.players.filter(p => p.team === team);
    if (members.length && members.every(p => p.out)) {
      winByExit(r, team);
      return true;
    }
  }
  return false;
}

export function onlyDocs(r, p) {
  const doc = docsOf(r)[p.team];
  return p.hand.length > 0 && p.hand.every(c => c.r === doc);
}

export function hasDefenderDoc(r) {
  if (!r.field) return false;
  const defender = r.players[r.field.defender];
  const ddoc = docsOf(r)[defender.team];
  return r.field.cards.some(e => !e.beatenBy && e.card.r === ddoc);
}
