const RIM_VERTICAL_TOLERANCE = 0.3;
// Final-review fix: the old per-frame-delta check was frame-rate dependent —
// a smoothly moving player at normal speed produced a sub-threshold delta on
// a high-refresh display and was incorrectly flagged "stuck". Measuring net
// displacement over a wall-clock time window fixes that at any frame rate.
const STUCK_WINDOW_SECONDS = 0.8;
const STUCK_DISTANCE_EPSILON = 0.3;

export function checkScoringTrigger(ballPosition, ballVelocity, hoopBounds) {
  const dx = ballPosition.x - hoopBounds.center.x;
  const dz = ballPosition.z - hoopBounds.center.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  const withinRadius = horizontalDist <= hoopBounds.radius;
  const nearRimHeight = Math.abs(ballPosition.y - hoopBounds.center.y) <= RIM_VERTICAL_TOLERANCE;
  const descending = ballVelocity.y < 0;
  return withinRadius && nearRimHeight && descending;
}

// `history` is an array of {x, z, t} samples in increasing t order.
export function isAiStuck(history) {
  if (history.length === 0) return false;
  const latest = history[history.length - 1];
  let oldest = null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (latest.t - history[i].t >= STUCK_WINDOW_SECONDS) {
      oldest = history[i];
      break;
    }
  }
  if (!oldest) return false;
  const dx = latest.x - oldest.x;
  const dz = latest.z - oldest.z;
  return Math.sqrt(dx * dx + dz * dz) < STUCK_DISTANCE_EPSILON;
}
