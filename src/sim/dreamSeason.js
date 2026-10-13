import { createRng } from './rng.js';
import { ATTRIBUTE_KEYS } from '../data/player.js';

export const DREAM_SEASON_LENGTH = 82;
const OPPONENT_MEAN = 76;
const OPPONENT_SPREAD = 7;
const OPPONENT_MIN = 56;
const OPPONENT_MAX = 94;
// Smaller = harsher on any rating gap. Tuned so an average draft wins ~65 and a
// stacked all-time lineup can threaten 82-0 without it being routine.
const WIN_CURVE = 2.6;

// Team strength for a dream lineup: average overall, a small bonus for a
// lineup that is good at everything, and a penalty for glaring holes.
export function dreamTeamRating(players) {
  if (players.length === 0) return 0;
  const base = players.reduce((sum, p) => sum + p.ovr, 0) / players.length;

  let balance = 0;
  for (const key of ATTRIBUTE_KEYS) {
    const avg = players.reduce((sum, p) => sum + p.attrs[key], 0) / players.length;
    if (avg >= 80) balance += 0.5;
    if (avg < 60) balance -= (60 - avg) * 0.1;
  }
  return Math.round((base + balance) * 10) / 10;
}

function gaussian(rng) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function winProbability(teamRating, opponentRating) {
  return 1 / (1 + Math.exp(-(teamRating - opponentRating) / WIN_CURVE));
}

export function simulateDreamSeason(teamRating, seed) {
  const rng = createRng(seed);
  const games = [];
  let wins = 0;
  let firstLoss = null;

  for (let i = 0; i < DREAM_SEASON_LENGTH; i += 1) {
    const opponent = Math.min(OPPONENT_MAX, Math.max(OPPONENT_MIN, OPPONENT_MEAN + gaussian(rng) * OPPONENT_SPREAD));
    const won = rng() < winProbability(teamRating, opponent);
    games.push({ opponent: Math.round(opponent), won });
    if (won) wins += 1;
    else if (firstLoss === null) firstLoss = i + 1;
  }

  return {
    wins,
    losses: DREAM_SEASON_LENGTH - wins,
    games,
    firstLoss,
    perfect: wins === DREAM_SEASON_LENGTH,
  };
}
