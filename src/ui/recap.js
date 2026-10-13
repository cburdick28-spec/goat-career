import { escapeHtml, capitalize } from './html.js';

export function playoffHeadline(playoffs) {
  if (!playoffs || !playoffs.made) return 'Missed the playoffs';
  if (playoffs.champion) return 'NBA CHAMPIONS 🏆';
  return `Eliminated in the ${playoffs.eliminatedIn}`;
}

function awardLine(awards) {
  if (awards?.mvp) return 'League MVP';
  if (awards?.allStar) return 'All-Star selection';
  return null;
}

function changeLabel(delta) {
  if (delta > 0) return `<span class="up">+${delta}</span>`;
  if (delta < 0) return `<span class="down">${delta}</span>`;
  return '<span class="flat">0</span>';
}

// Shown right after game 82: record, playoff run, and how the offseason
// changed the player.
export function renderSeasonRecap(rootEl, entry, { retired }, onContinue) {
  const award = awardLine(entry.awards);
  const playoffs = entry.playoffs;
  const averages = entry.averages || { points: 0, rebounds: 0, assists: 0 };

  rootEl.innerHTML = `
    <section class="recap ${playoffs?.champion ? 'champion' : ''}">
      <p class="recap-kicker">Season ${entry.year} complete${entry.teamName ? ` · ${escapeHtml(entry.teamName)}` : ''}</p>
      <div class="record-live final">
        <span class="record-big" id="recap-record">${entry.record.wins}-${entry.record.losses}</span>
        <span class="record-sub" id="recap-playoffs">${playoffHeadline(playoffs)}</span>
      </div>
      ${entry.record.losses === 0 ? '<p class="banner-alive recap-banner">PERFECT 82-0 SEASON</p>' : ''}
      ${award ? `<p class="recap-award">${award}</p>` : ''}

      <div class="card">
        <h3>Per game</h3>
        <p>${averages.points.toFixed(1)} pts · ${averages.rebounds.toFixed(1)} reb · ${averages.assists.toFixed(1)} ast</p>
      </div>

      ${
        playoffs?.made
          ? `<div class="card" id="recap-series">
              <h3>Playoffs</h3>
              <ul>${playoffs.rounds
                .map(
                  (r) =>
                    `<li><span>${r.round} vs ${escapeHtml(r.opponentName)}</span><strong class="${r.won ? 'up' : 'down'}">${r.won ? 'W' : 'L'} ${r.wins}-${r.losses}</strong></li>`
                )
                .join('')}</ul>
            </div>`
          : ''
      }

      ${
        entry.changes
          ? `<div class="card" id="recap-changes">
              <h3>Offseason${entry.age ? ` · age ${entry.age} → ${entry.age + 1}` : ''}</h3>
              <ul class="change-list">${Object.entries(entry.changes)
                .map(([k, v]) => `<li><span>${capitalize(k)}</span>${changeLabel(v)}</li>`)
                .join('')}</ul>
            </div>`
          : ''
      }

      <button id="recap-continue" class="big-btn">${retired ? 'See career summary' : `Start Season ${entry.year + 1}`}</button>
    </section>
  `;
  rootEl.querySelector('#recap-continue').addEventListener('click', onContinue);
}
