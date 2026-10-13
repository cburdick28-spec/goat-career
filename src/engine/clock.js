export function createGameClock(durationSeconds) {
  return { remaining: durationSeconds };
}

export function tickClock(clockState, deltaSeconds) {
  return { remaining: Math.max(0, clockState.remaining - deltaSeconds) };
}

export function isExpired(clockState) {
  return clockState.remaining <= 0;
}
