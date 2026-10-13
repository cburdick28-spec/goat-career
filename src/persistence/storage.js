const STORAGE_KEY = 'goat-career:v1';

export function saveCareer(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (quota exceeded, private browsing, etc.) —
    // the running app keeps working in-memory; it just won't persist.
  }
}

export function loadCareer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { state: null, fresh: true };
    return { state: JSON.parse(raw), fresh: false };
  } catch {
    return { state: null, fresh: true };
  }
}
