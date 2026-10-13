import { createRng } from '../sim/rng.js';
import { createPlayer, ATTRIBUTE_KEYS, ATTRIBUTE_MIN, ATTRIBUTE_MAX } from './player.js';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

const FIRST_NAMES = [
  'Marcus', 'Devin', 'Tyrell', 'Jalen', 'Cole', 'Darius', 'Mateo', 'Andre', 'Isaiah', 'Caleb',
  'Terrance', 'Julian', 'Malik', 'Brandon', 'Xavier', 'Dominic', 'Trey', 'Elijah', 'Reggie', 'Amari',
  'Kendrick', 'Lamar', 'Noah', 'Rashad', 'Silas', 'Tobias', 'Victor', 'Wesley', 'Zane', 'Quincy',
];
const LAST_NAMES = [
  'Reed', 'Holloway', 'Brooks', 'Whitfield', 'Okafor', 'Delgado', 'Hayes', 'Maddox', 'Sutton', 'Vance',
  'Pruitt', 'Calloway', 'Nash', 'Ferrell', 'Abrams', 'Banks', 'Coleman', 'Duval', 'Easton', 'Foster',
  'Gaines', 'Hardin', 'Ibarra', 'Jennings', 'Kemp', 'Lawson', 'Mercer', 'Norwood', 'Ortiz', 'Pierce',
];

// Made-up names so box scores and rosters do not read "Player 123-0".
function fakeName(rng) {
  return `${FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]}`;
}
const ARCHETYPE_NAMES = Object.keys({
  SHARPSHOOTER: 0,
  SLASHER: 0,
  LOCKDOWN_DEFENDER: 0,
  PLAYMAKER: 0,
  REBOUNDER: 0,
});

export function generateOpponentTeam(seed) {
  const rng = createRng(seed);
  const nameRng = createRng(seed + 7777);
  const players = POSITIONS.map((position, i) => {
    const attributes = Object.fromEntries(
      ATTRIBUTE_KEYS.map((k) => [k, Math.round(ATTRIBUTE_MIN + rng() * (ATTRIBUTE_MAX - ATTRIBUTE_MIN))])
    );
    return createPlayer({
      id: `player-${seed}-${i}`,
      name: fakeName(nameRng),
      position,
      archetype: ARCHETYPE_NAMES[i % ARCHETYPE_NAMES.length],
      attributes,
      mode: 'legend',
    });
  });

  return { id: `team-${seed}`, name: `Team ${seed}`, players };
}

export function computeTeamRating(team) {
  const playerAverages = team.players.map((p) => {
    const sum = ATTRIBUTE_KEYS.reduce((acc, k) => acc + p.attributes[k], 0);
    return sum / ATTRIBUTE_KEYS.length;
  });
  return playerAverages.reduce((acc, v) => acc + v, 0) / playerAverages.length;
}

// `franchise` is an entry from NBA_TEAMS; without one the team is just "Your Team".
// Game strength is top-heavy: a superstar moves the needle far more than the
// fifth starter does. Weights apply to players sorted best to worst.
const STRENGTH_WEIGHTS = [0.32, 0.24, 0.19, 0.15, 0.1];

export function computeTeamStrength(team) {
  const averages = team.players
    .map((p) => ATTRIBUTE_KEYS.reduce((acc, k) => acc + p.attributes[k], 0) / ATTRIBUTE_KEYS.length)
    .sort((a, b) => b - a);
  const weights = STRENGTH_WEIGHTS.slice(0, averages.length);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  return averages.reduce((acc, v, i) => acc + v * weights[i], 0) / weightSum;
}

export function assembleUserTeam(player, seed, franchise) {
  const teammates = generateOpponentTeam(seed).players.slice(0, 4);
  return {
    id: `user-team-${seed}`,
    name: franchise ? franchise.name : 'Your Team',
    franchiseId: franchise ? franchise.franchiseId : null,
    players: [player, ...teammates],
  };
}
