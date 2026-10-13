import { escapeHtml } from './html.js';

const STAT_KEYS = ['points', 'rebounds', 'assists', 'steals', 'blocks'];

export function computeStandings(leagueTeams, games) {
  const records = Object.fromEntries(leagueTeams.map((t) => [t.id, { teamId: t.id, name: t.name, wins: 0, losses: 0 }]));
  for (const game of games) {
    for (const teamId of game.teams) {
      if (!records[teamId]) continue;
      if (teamId === game.winnerId) records[teamId].wins += 1;
      else records[teamId].losses += 1;
    }
  }
  return Object.values(records).sort((a, b) => b.wins - a.wins);
}

// Your record against each team you have faced this season.
export function headToHead(completedGames) {
  const byTeam = new Map();
  for (const g of completedGames) {
    const row = byTeam.get(g.opponentTeamId) || { name: g.opponentName, wins: 0, losses: 0 };
    if (g.winnerId === g.userTeamId) row.wins += 1;
    else row.losses += 1;
    byTeam.set(g.opponentTeamId, row);
  }
  return [...byTeam.values()].sort((a, b) => b.wins + b.losses - (a.wins + a.losses) || a.name.localeCompare(b.name));
}

export function formatGameLog(completedGames) {
  return completedGames.map((g) => ({
    gameId: g.gameId,
    opponentName: g.opponentName,
    result: g.winnerId === g.userTeamId ? 'W' : 'L',
    score: `${g.userScore}-${g.opponentScore}`,
  }));
}

// Final-review fix: current-season per-game stats were never surfaced on
// the dashboard even though they're stored on each completed game.
export function computePlayerAverages(completedGames) {
  if (completedGames.length === 0) {
    return Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  }
  return Object.fromEntries(
    STAT_KEYS.map((k) => [k, completedGames.reduce((sum, g) => sum + g.userPlayerLine[k], 0) / completedGames.length])
  );
}

export function currentStreak(completedGames) {
  if (completedGames.length === 0) return null;
  const lastResult = completedGames[completedGames.length - 1].winnerId === completedGames[completedGames.length - 1].userTeamId;
  let count = 0;
  for (let i = completedGames.length - 1; i >= 0; i -= 1) {
    const won = completedGames[i].winnerId === completedGames[i].userTeamId;
    if (won !== lastResult) break;
    count += 1;
  }
  return { type: lastResult ? 'W' : 'L', count };
}

function careerLine(s) {
  const bits = [`Season ${s.year}: ${s.record.wins}-${s.record.losses}`];
  if (s.averages) bits.push(`(${formatAverages(s.averages)})`);
  if (s.playoffs?.champion) bits.push('— Champions 🏆');
  else if (s.playoffs?.made) bits.push(`— ${s.playoffs.eliminatedIn}`);
  if (s.awards?.mvp) bits.push('— MVP');
  else if (s.awards?.allStar) bits.push('— All-Star');
  return bits.join(' ');
}

function formatAverages(averages) {
  return STAT_KEYS.filter((k) => typeof averages[k] === 'number')
    .map((k) => `${averages[k].toFixed(1)} ${k}`)
    .join(' / ');
}

export function renderDashboard(rootEl, careerState) {
  const { player, team, season, careerHistory } = careerState;
  const gameLog = formatGameLog(season.completedGames);
  // Final-review fix: standings previously left the user's own team out
  // entirely, so the dashboard never showed where the user stood.
  const h2h = headToHead(season.completedGames);
  const averages = computePlayerAverages(season.completedGames);
  const streak = currentStreak(season.completedGames);
  const titles = careerHistory.filter((s) => s.playoffs?.champion).length;

  rootEl.innerHTML = `
    <section id="player-card" class="card">
      <h2>${escapeHtml(player.name)}</h2>
      <p>${player.position} — ${player.archetype} — Age ${player.age} — ${escapeHtml(team.name)}</p>
      <ul class="attribute-list">${Object.entries(player.attributes).map(([k, v]) => `<li>${k}: ${v}</li>`).join('')}</ul>
    </section>
    <section id="season-record" class="card">
      <p id="season-progress">Season ${season.year} · Game ${Math.min(82, season.completedGames.length + 1)} of 82 · Record ${season.record.wins}-${season.record.losses}${
        streak ? ` · ${streak.type}${streak.count} streak` : ''
      }</p>
      <p id="perfect-season-banner" class="${season.perfectSeasonAlive ? 'banner-alive' : 'banner-ended'}">
        ${season.perfectSeasonAlive ? '82-0 chase alive!' : 'Perfect season ended'}
      </p>
      <p>This season: ${formatAverages(averages)}</p>
    </section>
    <section id="game-log" class="card">
      <h3>Game Log${gameLog.length > 10 ? ` · last 10 of ${gameLog.length}` : ''}</h3>
      <ul>${gameLog
        .slice(-10)
        .reverse()
        .map((g) => `<li><strong class="${g.result === 'W' ? 'up' : 'down'}">${g.result}</strong> vs ${escapeHtml(g.opponentName)} (${g.score})</li>`)
        .join('')}</ul>
    </section>
    <section id="standings" class="card">
      <details>
        <summary>Your record vs the league</summary>
        <ul>${h2h.length === 0 ? '<li>No games yet</li>' : h2h.map((r) => `<li>${escapeHtml(r.name)}: ${r.wins}-${r.losses}</li>`).join('')}</ul>
      </details>
    </section>
    <section id="career-history" class="card">
      <h3>Career${titles > 0 ? ` · ${titles} title${titles === 1 ? '' : 's'} 🏆` : ''}</h3>
      <ul>${careerHistory.map((s) => `<li>${careerLine(s)}</li>`).join('')}</ul>
    </section>
  `;
}
