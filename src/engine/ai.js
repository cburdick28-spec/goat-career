export const SHOT_OPENNESS_THRESHOLD = 0.6;

export function decideAiAction(aiState, gameState) {
  if (aiState.teamId !== gameState.possessionTeamId) return 'DEFEND';
  if (gameState.ballHolderId === gameState.aiPlayerId && gameState.openness > SHOT_OPENNESS_THRESHOLD) {
    return 'SEEK_OPEN_SHOT';
  }
  return 'CHASE_BALL';
}
