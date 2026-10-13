// Fixes a Critical final-review finding: the original shot velocity was a
// fixed guess that never actually reached the hoop (shots always fell short
// or peaked too low), so live games could never score. This computes the
// exact velocity needed to arrive at a target point at a chosen flight time.
export const GRAVITY = 9.8;
export const HORIZONTAL_SPEED = 6;
export const MIN_FLIGHT_TIME = 0.9;

export function computeFlightTime(fromPos, targetPos) {
  const dx = targetPos.x - fromPos.x;
  const dz = targetPos.z - fromPos.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  return Math.max(MIN_FLIGHT_TIME, horizontalDist / HORIZONTAL_SPEED);
}

export function computeShotVelocity(fromPos, targetPos, flightTime) {
  const dx = targetPos.x - fromPos.x;
  const dy = targetPos.y - fromPos.y;
  const dz = targetPos.z - fromPos.z;
  return {
    x: dx / flightTime,
    z: dz / flightTime,
    y: (dy + 0.5 * GRAVITY * flightTime * flightTime) / flightTime,
  };
}
