// The plan's key bindings conflict: WASD is specified for movement, but
// S is also specified as the dedicated steal key. Ruling (ledgered):
// S is reserved exclusively for steal; backward movement comes from
// ArrowDown instead, so W/A/D + arrow keys cover movement and S never
// double-fires a move + a steal on the same frame.
export function mapKeysToAction(pressedKeys) {
  const move = { x: 0, z: 0 };
  if (pressedKeys.has('w') || pressedKeys.has('arrowup')) move.z -= 1;
  if (pressedKeys.has('arrowdown')) move.z += 1;
  if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) move.x -= 1;
  if (pressedKeys.has('d') || pressedKeys.has('arrowright')) move.x += 1;

  return {
    move,
    shoot: pressedKeys.has(' '),
    pass: pressedKeys.has('p'),
    steal: pressedKeys.has('s'),
  };
}
