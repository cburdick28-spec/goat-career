const SITE = 'goat-career.vercel.app';

export function buildDreamShareText({ wins, losses, perfect, names, rating }) {
  const headline = perfect ? `82-0! PERFECT SEASON 🏆` : `${wins}-${losses}`;
  return `🏀 GOAT Career Dream Team: ${headline}\n${names.join(' · ')}\nTeam rating ${rating}\nCan you go 82-0? ${SITE}`;
}

export function buildBuildShareText({ name, overall, record, seasons }) {
  const extra = seasons ? ` over ${seasons} season${seasons === 1 ? '' : 's'}` : '';
  return `🏀 I built ${name} (${overall} OVR) on GOAT Career${record ? ` and went ${record}` : ''}${extra}.\nBuild yours: ${SITE}`;
}

// Uses the native share sheet on phones, falls back to the clipboard.
export async function shareText(text) {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    // user cancelled the share sheet or clipboard was blocked
  }
  return 'failed';
}
