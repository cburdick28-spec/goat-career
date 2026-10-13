import { generateSeason } from './schedule.js';
import { applyProgression } from './progression.js';
import { checkAwards } from './awards.js';
import { shouldRetire } from './retirement.js';

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

function runOffseason(careerState) {
  const { player, season, careerHistory } = careerState;
  const seasonBoxScores = season.completedGames.map((g) => g.userPlayerLine);
  const teamWinRate = season.record.wins / SEASON_LENGTH;

  const nextPlayer = applyProgression(player, seasonBoxScores);
  const awards = checkAwards(seasonBoxScores, teamWinRate);
  const retired = shouldRetire(nextPlayer, seasonBoxScores);

  const seasonSummary = { year: season.year, record: season.record, awards };
  const nextCareerHistory = [...careerHistory, seasonSummary];

  if (retired) {
    return { ...careerState, player: nextPlayer, careerHistory: nextCareerHistory, retired: true };
  }

  const seed = season.year + 1;
  const newSeason = generateSeason(careerState.team, seed);
  return {
    ...careerState,
    player: nextPlayer,
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
