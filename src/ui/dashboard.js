export function computeStandings(leagueTeams, games) {
  const records = Object.fromEntries(leagueTeams.map((t) => [t.id, { teamId: t.id, wins: 0, losses: 0 }]));
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

export function renderDashboard(rootEl, careerState) {
  const { player, season, careerHistory } = careerState;
  const gameLog = formatGameLog(season.completedGames);
  const standings = computeStandings(season.leagueTeams, season.completedGames);

  rootEl.innerHTML = `
    <section id="player-card">
      <h2>${player.name}</h2>
      <p>${player.position} — ${player.archetype} — Age ${player.age}</p>
      <ul>${Object.entries(player.attributes).map(([k, v]) => `<li>${k}: ${v}</li>`).join('')}</ul>
    </section>
    <section id="season-record">
      <p>Record: ${season.record.wins}-${season.record.losses}</p>
      <p id="perfect-season-banner">${season.perfectSeasonAlive ? '82-0 chase alive!' : 'Perfect season ended'}</p>
    </section>
    <section id="game-log">
      <h3>Game Log</h3>
      <ul>${gameLog.map((g) => `<li>${g.result} vs ${g.opponentName} (${g.score})</li>`).join('')}</ul>
    </section>
    <section id="standings">
      <h3>Standings</h3>
      <ul>${standings.map((s) => `<li>${s.teamId}: ${s.wins}-${s.losses}</li>`).join('')}</ul>
    </section>
    <section id="career-history">
      <h3>Career</h3>
      <ul>${careerHistory.map((s, i) => `<li>Season ${i + 1}</li>`).join('')}</ul>
    </section>
  `;
}
