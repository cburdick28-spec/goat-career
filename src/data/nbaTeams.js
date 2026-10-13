// The 30 NBA franchises (names only, no logos). Used for the league you play in
// and for choosing the franchise you play for.
const ROWS = [
  ['Atlanta', 'Hawks', '#e03a3e', '#c1d32f'],
  ['Boston', 'Celtics', '#1f9d55', '#ba9653'],
  ['Brooklyn', 'Nets', '#d0d3d8', '#111111'],
  ['Charlotte', 'Hornets', '#00a3b4', '#1d1160'],
  ['Chicago', 'Bulls', '#ce1141', '#111111'],
  ['Cleveland', 'Cavaliers', '#a8174a', '#fdbb30'],
  ['Dallas', 'Mavericks', '#1d7fc4', '#b8c4ca'],
  ['Denver', 'Nuggets', '#1b5fa8', '#fec524'],
  ['Detroit', 'Pistons', '#c8102e', '#1d42ba'],
  ['Golden State', 'Warriors', '#2358b8', '#ffc72c'],
  ['Houston', 'Rockets', '#ce1141', '#c4ced4'],
  ['Indiana', 'Pacers', '#2a5aa8', '#fdbb30'],
  ['Los Angeles', 'Clippers', '#c8102e', '#1d428a'],
  ['Los Angeles', 'Lakers', '#6b34a8', '#fdb927'],
  ['Memphis', 'Grizzlies', '#5d76a9', '#12173f'],
  ['Miami', 'Heat', '#c4163f', '#f9a01b'],
  ['Milwaukee', 'Bucks', '#1d7a43', '#eee1c6'],
  ['Minnesota', 'Timberwolves', '#2a78b4', '#78be20'],
  ['New Orleans', 'Pelicans', '#1f3f78', '#c8102e'],
  ['New York', 'Knicks', '#1678c8', '#f58426'],
  ['Oklahoma City', 'Thunder', '#1a8fd8', '#ef3b24'],
  ['Orlando', 'Magic', '#1a8fd8', '#c4ced4'],
  ['Philadelphia', '76ers', '#1678c8', '#ed174c'],
  ['Phoenix', 'Suns', '#7a4fc4', '#e56020'],
  ['Portland', 'Trail Blazers', '#e03a3e', '#111111'],
  ['Sacramento', 'Kings', '#7a4bb0', '#8a96a0'],
  ['San Antonio', 'Spurs', '#c4ced4', '#111111'],
  ['Toronto', 'Raptors', '#ce1141', '#111111'],
  ['Utah', 'Jazz', '#2f66b8', '#f9a01b'],
  ['Washington', 'Wizards', '#2f66b8', '#e31837'],
];

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const NBA_TEAMS = ROWS.map(([city, nickname, primary, secondary]) => ({
  franchiseId: slug(`${city} ${nickname}`),
  city,
  nickname,
  name: `${city} ${nickname}`,
  colors: { primary, secondary },
}));

export function findFranchise(franchiseId) {
  return NBA_TEAMS.find((t) => t.franchiseId === franchiseId) || null;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDistance(a, b) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// Jerseys for a game: your team in its primary color; the opponent in its
// primary too unless the two would look alike, then its secondary.
export function jerseyColors(userFranchiseId, opponentFranchiseId) {
  const user = findFranchise(userFranchiseId)?.colors || { primary: '#2266ff', secondary: '#ffffff' };
  const opp = findFranchise(opponentFranchiseId)?.colors || { primary: '#dd2222', secondary: '#ffffff' };
  const oppMain = colorDistance(user.primary, opp.primary) < 90 ? opp.secondary : opp.primary;
  const oppTrim = oppMain === opp.primary ? opp.secondary : opp.primary;
  return { user: { main: user.primary, trim: user.secondary }, opponent: { main: oppMain, trim: oppTrim } };
}
