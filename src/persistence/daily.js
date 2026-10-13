// One attempt per day per mode, stored locally. The daily seed means everyone
// sees the same cards; this just remembers what you did with them.
const KEY = 'goat-career:daily:v1';

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getDailyResult(mode, dayKey) {
  return readAll()[`${mode}:${dayKey}`] || null;
}

export function saveDailyResult(mode, dayKey, result) {
  try {
    const all = readAll();
    all[`${mode}:${dayKey}`] = result;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage unavailable: daily still works, it just can't be locked
  }
}

// Consecutive days (ending today or yesterday) with a saved daily of any mode.
export function dailyStreak(today = new Date()) {
  const played = new Set(Object.keys(readAll()).map((k) => k.split(':')[1]));
  const keyFor = (d) => String(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate());
  const cursor = new Date(today);
  if (!played.has(keyFor(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (played.has(keyFor(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
