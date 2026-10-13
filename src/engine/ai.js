export const SHOT_OPENNESS_THRESHOLD = 0.6;
const OPENNESS_MAX_DISTANCE = 4;

export function decideAiAction(aiState, gameState) {
  if (aiState.teamId !== gameState.possessionTeamId) return 'DEFEND';
  if (gameState.ballHolderId === gameState.aiPlayerId && gameState.openness > SHOT_OPENNESS_THRESHOLD) {
    return 'SEEK_OPEN_SHOT';
  }
  return 'CHASE_BALL';
}

// Final-review fix: openness was previously hard-coded to 0.7 (above the
// shot threshold), so any AI player shot the instant it touched the ball.
// This computes real openness from the nearest defender's distance.
export function computeOpenness(shooterPos, defenderPositions) {
  if (defenderPositions.length === 0) return 1;
  const nearest = Math.min(
    ...defenderPositions.map((d) => Math.sqrt((d.x - shooterPos.x) ** 2 + (d.z - shooterPos.z) ** 2))
  );
  return Math.max(0, Math.min(1, nearest / OPENNESS_MAX_DISTANCE));
}

export function findPassTarget(fromId, teammates) {
  let best = null;
  let bestDist = Infinity;
  const from = teammates.find((t) => t.id === fromId);
  for (const t of teammates) {
    if (t.id === fromId) continue;
    const dist = Math.sqrt((t.x - from.x) ** 2 + (t.z - from.z) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      best = t.id;
    }
  }
  return best;
}
