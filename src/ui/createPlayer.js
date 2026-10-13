import { createPlayer, ARCHETYPES, ATTRIBUTE_KEYS, ATTRIBUTE_MIN, ATTRIBUTE_MAX, NORMAL_MODE_BUDGET, clampAttribute } from '../data/player.js';
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
  return buildCareerFromPlayer(player, seed);
}

// Shared by the manual form and the Spin & Draft flow.
export function buildCareerFromPlayer(player, seed) {
  const team = assembleUserTeam(player, seed);
  const season = generateSeason(team, seed);
  return createCareerState(player, team, season);
}

export function renderCreatePlayerScreen(rootEl, onComplete) {
  const archetypeNames = Object.keys(ARCHETYPES);
  const firstArchetype = archetypeNames[0];

  rootEl.innerHTML = `
    <form id="create-player-form" class="card">
      <h2>Create Your Player</h2>
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
      <label class="legend-toggle"><input name="legend" type="checkbox" /> Legend Mode (lets you max every attribute)</label>
      <div id="attribute-sliders">
        ${ATTRIBUTE_KEYS.map(
          (k) => `
          <label>${k}
            <input name="attr-${k}" type="number" min="${ATTRIBUTE_MIN}" max="${ATTRIBUTE_MAX}" value="${ATTRIBUTE_MIN}" />
          </label>`
        ).join('')}
      </div>
      <div id="budget-display"></div>
      <div id="form-error" class="form-error" hidden></div>
      <button type="submit">Create Player</button>
    </form>
  `;

  const form = rootEl.querySelector('#create-player-form');
  const budgetDisplay = rootEl.querySelector('#budget-display');
  const errorDisplay = rootEl.querySelector('#form-error');
  const legendCheckbox = form.elements['legend'];
  const archetypeSelect = form.elements['archetype'];
  const submitButton = form.querySelector('button[type="submit"]');

  function mode() {
    return legendCheckbox.checked ? 'legend' : 'normal';
  }

  function currentAttributes() {
    return Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, clampAttribute(Number(form.elements[`attr-${k}`].value) || 0)]));
  }

  function applyArchetypeDefaults() {
    const defaults = ARCHETYPES[archetypeSelect.value];
    ATTRIBUTE_KEYS.forEach((k) => {
      form.elements[`attr-${k}`].value = defaults[k];
    });
    updateBudgetDisplay();
  }

  function updateBudgetDisplay() {
    const attrs = currentAttributes();
    const total = ATTRIBUTE_KEYS.reduce((sum, k) => sum + attrs[k], 0);
    if (mode() === 'normal') {
      budgetDisplay.textContent = `${total} / ${NORMAL_MODE_BUDGET}`;
      submitButton.disabled = total > NORMAL_MODE_BUDGET;
    } else {
      budgetDisplay.textContent = 'Legend Mode: no budget limit';
      submitButton.disabled = false;
    }
  }

  form.addEventListener('input', updateBudgetDisplay);
  archetypeSelect.addEventListener('change', applyArchetypeDefaults);
  ATTRIBUTE_KEYS.forEach((k) => {
    form.elements[`attr-${k}`].value = ARCHETYPES[firstArchetype][k];
  });
  updateBudgetDisplay();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    errorDisplay.hidden = true;
    const formState = {
      name: form.elements['name'].value,
      position: form.elements['position'].value,
      archetype: archetypeSelect.value,
      attributes: currentAttributes(),
      mode: mode(),
    };
    try {
      const careerState = buildCareerFromForm(formState, Date.now());
      saveCareer(careerState);
      onComplete(careerState);
    } catch (err) {
      errorDisplay.textContent =
        err.message === 'BUDGET_EXCEEDED'
          ? `That allocation is over the ${NORMAL_MODE_BUDGET}-point budget. Lower an attribute or switch to Legend Mode.`
          : 'Could not create that player. Please check the form and try again.';
      errorDisplay.hidden = false;
    }
  });
}
