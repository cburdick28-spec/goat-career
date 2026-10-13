import { computeTeamRating } from '../data/team.js';

const RATING_SCALE = 15;
const TEAM_STAT_BASES = {
  rebounds: { base: 40, variance: 10 },
  assists: { base: 24, variance: 8 },
  steals: { base: 7, variance: 4 },
  blocks: { base: 4, variance: 3 },
};

function pointsWeight(p) {
  return p.attributes.shooting * 0.5 + p.attributes.dunking * 0.3 + p.attributes.passing * 0.2;
}
function reboundsWeight(p) {
  return p.attributes.rebounding;
}
function assistsWeight(p) {
  return p.attributes.passing;
}
function stealsWeight(p) {
  return p.attributes.defense * 0.6 + p.attributes.speed * 0.4;
}
function blocksWeight(p) {
  return p.attributes.defense * 0.4 + p.attributes.dunking * 0.2 + p.attributes.rebounding * 0.4;
}

// Distributes `total` across `team.players` proportionally to `weightFn`,
// rounding each share and fixing the remainder on the top-weighted player
// so the integers always sum exactly to `total`.
function distribute(team, total, weightFn) {
  const weights = team.players.map(weightFn);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((w) => Math.round((w / weightSum) * total));
  const remainder = total - shares.reduce((a, b) => a + b, 0);
  const topIndex = weights.indexOf(Math.max(...weights));
  shares[topIndex] += remainder;
  return shares;
}

function buildBoxScore(team, teamScore, rng) {
  const rebounds = distribute(team, Math.round(TEAM_STAT_BASES.rebounds.base + rng() * TEAM_STAT_BASES.rebounds.variance), reboundsWeight);
  const assists = distribute(team, Math.round(TEAM_STAT_BASES.assists.base + rng() * TEAM_STAT_BASES.assists.variance), assistsWeight);
  const steals = distribute(team, Math.round(TEAM_STAT_BASES.steals.base + rng() * TEAM_STAT_BASES.steals.variance), stealsWeight);
  const blocks = distribute(team, Math.round(TEAM_STAT_BASES.blocks.base + rng() * TEAM_STAT_BASES.blocks.variance), blocksWeight);
  const points = distribute(team, teamScore, pointsWeight);

  return team.players.map((p, i) => ({
    playerId: p.id,
    points: points[i],
    rebounds: rebounds[i],
    assists: assists[i],
    steals: steals[i],
    blocks: blocks[i],
  }));
}

export function simulateGame(teamA, teamB, rng) {
  const ratingA = computeTeamRating(teamA);
  const ratingB = computeTeamRating(teamB);
  const pWinA = 1 / (1 + 10 ** (-(ratingA - ratingB) / RATING_SCALE));

  const aWins = rng() < pWinA;
  const margin = Math.min(40, Math.max(1, Math.round(rng() * 10 + Math.abs(ratingA - ratingB) / 5)));
  const winnerScore = 95 + Math.round(rng() * 15);
  const loserScore = Math.max(60, winnerScore - margin);

  const teamAScore = aWins ? winnerScore : loserScore;
  const teamBScore = aWins ? loserScore : winnerScore;

  return {
    teamAScore,
    teamBScore,
    winnerId: aWins ? teamA.id : teamB.id,
    boxScore: {
      [teamA.id]: buildBoxScore(teamA, teamAScore, rng),
      [teamB.id]: buildBoxScore(teamB, teamBScore, rng),
    },
  };
}
