import { dailyKey } from '../data/draft.js';
import { getDailyResult, dailyStreak } from '../persistence/daily.js';

// Home screen: pick a mode. `handlers` has one callback per button.
export function renderHome(rootEl, { hasCareer, careerSummary }, handlers) {
  const key = dailyKey();
  const dailyBuild = getDailyResult('build', key);
  const dailyDream = getDailyResult('dream', key);
  const streak = dailyStreak();

  rootEl.innerHTML = `
    <section class="home">
      <p class="tagline">Spin real pros. Build a legend. Chase <strong>82-0</strong>.</p>
      ${streak > 0 ? `<p class="streak" data-testid="streak">🔥 ${streak}-day daily streak</p>` : ''}

      ${
        hasCareer
          ? `<button class="mode-card mode-continue" id="mode-continue">
              <span class="mode-title">Continue Career</span>
              <span class="mode-sub">${careerSummary}</span>
            </button>`
          : ''
      }

      <button class="mode-card" id="mode-build">
        <span class="mode-badge">BUILD</span>
        <span class="mode-title">Spin &amp; Draft a Player</span>
        <span class="mode-sub">Land real NBA pros, bolt their ratings onto your player, then sim the whole career.</span>
      </button>

      <button class="mode-card" id="mode-dream">
        <span class="mode-badge">82-0</span>
        <span class="mode-title">Dream Team</span>
        <span class="mode-sub">Draft an all-time five and try to go undefeated over 82 games.</span>
      </button>

      <div class="daily-row">
        <button class="mode-card mode-daily" id="daily-build">
          <span class="mode-badge">DAILY</span>
          <span class="mode-title">Daily Build</span>
          <span class="mode-sub">${dailyBuild ? `Played: ${dailyBuild.overall} OVR` : 'Same cards for everyone'}</span>
        </button>
        <button class="mode-card mode-daily" id="daily-dream">
          <span class="mode-badge">DAILY</span>
          <span class="mode-title">Daily Dream</span>
          <span class="mode-sub">${dailyDream ? `Played: ${dailyDream.wins}-${dailyDream.losses}` : 'Same packs for everyone'}</span>
        </button>
      </div>

      <button class="link-btn" id="mode-custom">Custom player (manual point-buy)</button>
    </section>
  `;

  const on = (id, fn) => {
    const el = rootEl.querySelector(id);
    if (el && fn) el.addEventListener('click', fn);
  };
  on('#mode-continue', handlers.onContinue);
  on('#mode-build', handlers.onBuild);
  on('#mode-dream', handlers.onDream);
  on('#daily-build', handlers.onDailyBuild);
  on('#daily-dream', handlers.onDailyDream);
  on('#mode-custom', handlers.onCustom);
}

// Shown instead of a second attempt at today's daily.
export function renderDailyDone(rootEl, { title, lines, shareMessage }, onBack, onShare) {
  rootEl.innerHTML = `
    <section class="home">
      <div class="card daily-done">
        <h2>${title}</h2>
        ${lines.map((l) => `<p>${l}</p>`).join('')}
        <p class="hint">Today's cards are the same for everyone. Come back tomorrow for a new one.</p>
        <div class="action-row">
          <button id="daily-share">Share</button>
          <button class="ghost" id="daily-back">Home</button>
        </div>
        <p class="share-note" id="daily-note" hidden></p>
      </div>
    </section>
  `;
  rootEl.querySelector('#daily-back').addEventListener('click', onBack);
  rootEl.querySelector('#daily-share').addEventListener('click', async () => {
    const outcome = await onShare(shareMessage);
    const note = rootEl.querySelector('#daily-note');
    note.hidden = false;
    note.textContent = outcome === 'copied' ? 'Copied to clipboard!' : outcome === 'shared' ? 'Shared!' : 'Could not share from this browser.';
  });
}
