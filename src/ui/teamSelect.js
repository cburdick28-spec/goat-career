import { NBA_TEAMS } from '../data/nbaTeams.js';

// <select> for choosing which NBA franchise you play for.
export function teamSelectMarkup(selectedId = NBA_TEAMS[0].franchiseId) {
  return `
    <label>Team
      <select name="franchise">
        ${NBA_TEAMS.map(
          (t) => `<option value="${t.franchiseId}" ${t.franchiseId === selectedId ? 'selected' : ''}>${t.name}</option>`
        ).join('')}
      </select>
    </label>`;
}
