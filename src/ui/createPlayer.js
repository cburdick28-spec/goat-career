import { createPlayer, ARCHETYPES, ATTRIBUTE_KEYS, ATTRIBUTE_MIN, ATTRIBUTE_MAX, NORMAL_MODE_BUDGET } from '../data/player.js';
import { assembleUserTeam } from '../data/team.js';
import { generateSeason } from '../sim/schedule.js';
import { createCareerState } from '../data/career.js';
import { saveCareer } from '../persistence/storage.js';

export function buildCareerFromForm(formState, seed) {
  const player = createPlayer({
    name: formState.name,
    position: formState.position,
    archetype: formState.archetype,
    attributes: formState.attributes,
    mode: formState.mode,
  });
  const team = assembleUserTeam(player, seed);
  const season = generateSeason(team, seed);
  return createCareerState(player, team, season);
}

export function renderCreatePlayerScreen(rootEl, onComplete) {
  const archetypeNames = Object.keys(ARCHETYPES);
  let mode = 'normal';
  const attrState = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, ATTRIBUTE_MIN]));

  rootEl.innerHTML = `
    <form id="create-player-form">
      <label>Name <input name="name" type="text" required /></label>
      <label>Position
        <select name="position">
          ${['PG', 'SG', 'SF', 'PF', 'C'].map((p) => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </label>
      <label>Archetype
        <select name="archetype">
          ${archetypeNames.map((a) => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </label>
      <label><input name="legend" type="checkbox" /> Legend Mode (max every attribute)</label>
      <div id="attribute-sliders">
        ${ATTRIBUTE_KEYS.map(
          (k) => `
          <label>${k}
            <input name="attr-${k}" type="number" min="${ATTRIBUTE_MIN}" max="${ATTRIBUTE_MAX}" value="${ATTRIBUTE_MIN}" />
          </label>`
        ).join('')}
      </div>
      <div id="budget-display"></div>
      <button type="submit">Create Player</button>
    </form>
  `;

  const form = rootEl.querySelector('#create-player-form');
  const budgetDisplay = rootEl.querySelector('#budget-display');
  const legendCheckbox = form.elements['legend'];
  const submitButton = form.querySelector('button[type="submit"]');

  function currentAttributes() {
    return Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, Number(form.elements[`attr-${k}`].value)]));
  }

  function updateBudgetDisplay() {
    mode = legendCheckbox.checked ? 'legend' : 'normal';
    const attrs = currentAttributes();
    const total = ATTRIBUTE_KEYS.reduce((sum, k) => sum + attrs[k], 0);
    if (mode === 'normal') {
      budgetDisplay.textContent = `${total} / ${NORMAL_MODE_BUDGET}`;
      submitButton.disabled = total > NORMAL_MODE_BUDGET;
    } else {
      budgetDisplay.textContent = 'Legend Mode: no budget limit';
      submitButton.disabled = false;
    }
  }

  form.addEventListener('input', updateBudgetDisplay);
  updateBudgetDisplay();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formState = {
      name: form.elements['name'].value,
      position: form.elements['position'].value,
      archetype: form.elements['archetype'].value,
      attributes: currentAttributes(),
      mode,
    };
    const careerState = buildCareerFromForm(formState, Date.now());
    saveCareer(careerState);
    onComplete(careerState);
  });
}
