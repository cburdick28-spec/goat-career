export const ATTRIBUTE_MIN = 25;
export const ATTRIBUTE_MAX = 99;
export const NORMAL_MODE_BUDGET = 360;
export const ATTRIBUTE_KEYS = ['shooting', 'speed', 'dunking', 'defense', 'passing', 'rebounding'];

function defaultAllocation(values) {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, values[k]]));
}

export const ARCHETYPES = {
  SHARPSHOOTER: defaultAllocation({ shooting: 90, speed: 60, dunking: 40, defense: 40, passing: 60, rebounding: 30 }),
  SLASHER: defaultAllocation({ shooting: 55, speed: 85, dunking: 80, defense: 45, passing: 50, rebounding: 35 }),
  LOCKDOWN_DEFENDER: defaultAllocation({ shooting: 40, speed: 65, dunking: 45, defense: 90, passing: 40, rebounding: 60 }),
  PLAYMAKER: defaultAllocation({ shooting: 55, speed: 70, dunking: 35, defense: 50, passing: 90, rebounding: 30 }),
  REBOUNDER: defaultAllocation({ shooting: 35, speed: 45, dunking: 60, defense: 65, passing: 35, rebounding: 90 }),
};

export function clampAttribute(value) {
  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, value));
}
const clamp = clampAttribute;

export function createPlayer({ name, position, archetype, attributes, mode, id }) {
  const clamped = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, clamp(attributes[k])]));

  if (mode === 'normal') {
    const total = ATTRIBUTE_KEYS.reduce((sum, k) => sum + clamped[k], 0);
    if (total > NORMAL_MODE_BUDGET) {
      throw new Error('BUDGET_EXCEEDED');
    }
  }

  return {
    id: id ?? crypto.randomUUID(),
    name,
    position,
    archetype,
    age: 19,
    attributes: clamped,
  };
}
