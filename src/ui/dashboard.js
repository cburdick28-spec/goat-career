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

function formatAverages(averages) {
  return STAT_KEYS.map((k) => `${averages[k].toFixed(1)} ${k}`).join(' / ');
}

export function renderDashboard(rootEl, careerState) {
  const { player, team, season, careerHistory } = careerState;
  const gameLog = formatGameLog(season.completedGames);
  // Final-review fix: standings previously left the user's own team out
  // entirely, so the dashboard never showed where the user stood.
  const standings = computeStandings([team, ...season.leagueTeams], season.completedGames);
  const averages = computePlayerAverages(season.completedGames);

  rootEl.innerHTML = `
    <section id="player-card" class="card">
      <h2>${player.name}</h2>
      <p>${player.position} — ${player.archetype} — Age ${player.age}</p>
      <ul class="attribute-list">${Object.entries(player.attributes).map(([k, v]) => `<li>${k}: ${v}</li>`).join('')}</ul>
    </section>
    <section id="season-record" class="card">
      <p>Record: ${season.record.wins}-${season.record.losses}</p>
      <p id="perfect-season-banner" class="${season.perfectSeasonAlive ? 'banner-alive' : 'banner-ended'}">
        ${season.perfectSeasonAlive ? '82-0 chase alive!' : 'Perfect season ended'}
      </p>
      <p>This season: ${formatAverages(averages)}</p>
    </section>
    <section id="game-log" class="card">
      <h3>Game Log</h3>
      <ul>${gameLog.map((g) => `<li>${g.result} vs ${g.opponentName} (${g.score})</li>`).join('')}</ul>
    </section>
    <section id="standings" class="card">
      <h3>Standings</h3>
      <ul>${standings.map((s) => `<li>${s.name}${s.teamId === team.id ? ' (You)' : ''}: ${s.wins}-${s.losses}</li>`).join('')}</ul>
    </section>
    <section id="career-history" class="card">
      <h3>Career</h3>
      <ul>${careerHistory
        .map(
          (s) =>
            `<li>Season ${s.year}: ${s.record.wins}-${s.record.losses}${s.averages ? ` (${formatAverages(s.averages)})` : ''}${
              s.awards?.mvp ? ' — MVP' : s.awards?.allStar ? ' — All-Star' : ''
            }</li>`
        )
        .join('')}</ul>
    </section>
  `;
}
