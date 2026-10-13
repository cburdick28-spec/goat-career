const RIM_VERTICAL_TOLERANCE = 0.3;
const STUCK_POSITION_EPSILON = 0.05;
const STUCK_SAMPLE_COUNT = 90;

export function checkScoringTrigger(ballPosition, ballVelocity, hoopBounds) {
  const dx = ballPosition.x - hoopBounds.center.x;
  const dz = ballPosition.z - hoopBounds.center.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  const withinRadius = horizontalDist <= hoopBounds.radius;
  const nearRimHeight = Math.abs(ballPosition.y - hoopBounds.center.y) <= RIM_VERTICAL_TOLERANCE;
  const descending = ballVelocity.y < 0;
  return withinRadius && nearRimHeight && descending;
}

export function isAiStuck(recentPositions) {
  const sample = recentPositions.slice(-STUCK_SAMPLE_COUNT);
  if (sample.length < STUCK_SAMPLE_COUNT) return false;
  for (let i = 1; i < sample.length; i++) {
    const dx = Math.abs(sample[i].x - sample[i - 1].x);
    const dz = Math.abs(sample[i].z - sample[i - 1].z);
    if (dx >= STUCK_POSITION_EPSILON || dz >= STUCK_POSITION_EPSILON) return false;
  }
  return true;
}
