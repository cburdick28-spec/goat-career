import { createRng } from '../sim/rng.js';
import { createPlayer, ATTRIBUTE_KEYS, ATTRIBUTE_MIN, ATTRIBUTE_MAX } from './player.js';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const ARCHETYPE_NAMES = Object.keys({
  SHARPSHOOTER: 0,
  SLASHER: 0,
  LOCKDOWN_DEFENDER: 0,
  PLAYMAKER: 0,
  REBOUNDER: 0,
});

export function generateOpponentTeam(seed) {
  const rng = createRng(seed);
  const players = POSITIONS.map((position, i) => {
    const attributes = Object.fromEntries(
      ATTRIBUTE_KEYS.map((k) => [k, Math.round(ATTRIBUTE_MIN + rng() * (ATTRIBUTE_MAX - ATTRIBUTE_MIN))])
    );
    return createPlayer({
      id: `player-${seed}-${i}`,
      name: `Player ${seed}-${i}`,
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

export function assembleUserTeam(player, seed) {
  const teammates = generateOpponentTeam(seed).players.slice(0, 4);
  return { id: `user-team-${seed}`, name: 'Your Team', players: [player, ...teammates] };
}
