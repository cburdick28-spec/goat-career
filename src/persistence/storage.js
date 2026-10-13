const STORAGE_KEY = 'goat-career:v1';

export function saveCareer(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (quota exceeded, private browsing, etc.) —
    // the running app keeps working in-memory; it just won't persist.
  }
}

// Minimal shape check so a stale/partial save (valid JSON, wrong shape)
// is treated as corrupted instead of crashing the dashboard on render.
function isValidCareerState(state) {
  return (
    !!state &&
    typeof state === 'object' &&
    !!state.player &&
    !!state.team &&
    Array.isArray(state.team.players) &&
    !!state.season &&
    Array.isArray(state.season.completedGames) &&
    Array.isArray(state.season.schedule) &&
    !!state.season.record &&
    Array.isArray(state.careerHistory)
  );
}

export function loadCareer() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: null, fresh: true, corrupted: true };
  }
  if (raw === null) return { state: null, fresh: true, corrupted: false };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: null, fresh: true, corrupted: true };
  }

  if (!isValidCareerState(parsed)) {
    return { state: null, fresh: true, corrupted: true };
  }
  return { state: parsed, fresh: false, corrupted: false };
}
