import { generateSeason } from './schedule.js';
import { applyProgression } from './progression.js';
import { checkAwards } from './awards.js';
import { shouldRetire } from './retirement.js';
import { simulatePlayoffs } from './playoffs.js';
import { createRng } from './rng.js';
import { ATTRIBUTE_KEYS } from '../data/player.js';

const SEASON_LENGTH = 82;

export function advanceSeason(careerState, gameResult) {
  const { player, team, season } = careerState;
  const gameIndex = season.completedGames.length;
  const scheduledGame = season.schedule[gameIndex];
  const opponentTeamId = scheduledGame.opponentTeamId;
  const opponentTeam = season.leagueTeams.find((t) => t.id === opponentTeamId);

  const won = gameResult.winnerId === team.id;
  const userScore = gameResult.winnerId === team.id ? Math.max(gameResult.teamAScore, gameResult.teamBScore) : Math.min(gameResult.teamAScore, gameResult.teamBScore);
  const opponentScore = gameResult.winnerId === team.id ? Math.min(gameResult.teamAScore, gameResult.teamBScore) : Math.max(gameResult.teamAScore, gameResult.teamBScore);

  const userPlayerLine = (gameResult.boxScore[team.id] || []).find((b) => b.playerId === player.id) || {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
  };

  const completedGame = {
    gameId: scheduledGame.id,
    opponentTeamId,
    opponentName: opponentTeam ? opponentTeam.name : opponentTeamId,
    userTeamId: team.id,
    teams: [team.id, opponentTeamId],
    winnerId: gameResult.winnerId,
    userScore,
    opponentScore,
    userPlayerLine,
  };

  const record = {
    wins: season.record.wins + (won ? 1 : 0),
    losses: season.record.losses + (won ? 0 : 1),
  };
  const perfectSeasonAlive = season.perfectSeasonAlive && won;

  let nextState = {
    ...careerState,
    season: {
      ...season,
      record,
      perfectSeasonAlive,
      completedGames: [...season.completedGames, completedGame],
    },
  };

  if (nextState.season.completedGames.length === SEASON_LENGTH) {
    nextState = runOffseason(nextState);
  }

  return nextState;
}

function withUpdatedPlayer(team, nextPlayer) {
  return { ...team, players: team.players.map((p) => (p.id === nextPlayer.id ? nextPlayer : p)) };
}

function runOffseason(careerState) {
  const { player, team, season, careerHistory } = careerState;
  const seasonBoxScores = season.completedGames.map((g) => g.userPlayerLine);
  const teamWinRate = season.record.wins / SEASON_LENGTH;

  const nextPlayer = applyProgression(player, seasonBoxScores);
  const awards = checkAwards(seasonBoxScores, teamWinRate);
  const retired = shouldRetire(nextPlayer, seasonBoxScores);
  // Fixes a final-review finding: progression previously only updated
  // careerState.player, but every game reads attributes from
  // careerState.team.players, so growth/decline never affected gameplay.
  const nextTeam = withUpdatedPlayer(team, nextPlayer);

  const averages = {
    points: average(seasonBoxScores, 'points'),
    rebounds: average(seasonBoxScores, 'rebounds'),
    assists: average(seasonBoxScores, 'assists'),
  };
  const playoffs = simulatePlayoffs(team, season.leagueTeams, season.record.wins, createRng(season.year * 7919 + season.record.wins));
  // How the offseason changed the player, for the recap screen.
  const changes = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, nextPlayer.attributes[k] - player.attributes[k]]));
  const seasonSummary = {
    year: season.year,
    record: season.record,
    awards,
    averages,
    teamName: team.name,
    age: player.age,
    playoffs,
    changes,
  };
  const nextCareerHistory = [...careerHistory, seasonSummary];

  if (retired) {
    return { ...careerState, player: nextPlayer, team: nextTeam, careerHistory: nextCareerHistory, retired: true };
  }

  const seed = season.year + 1;
  const newSeason = generateSeason(nextTeam, seed);
  return {
    ...careerState,
    player: nextPlayer,
    team: nextTeam,
    careerHistory: nextCareerHistory,
    season: {
      ...newSeason,
      year: season.year + 1,
      record: { wins: 0, losses: 0 },
      perfectSeasonAlive: true,
      completedGames: [],
    },
  };
}

function average(seasonBoxScores, key) {
  if (seasonBoxScores.length === 0) return 0;
  return seasonBoxScores.reduce((sum, g) => sum + g[key], 0) / seasonBoxScores.length;
}
