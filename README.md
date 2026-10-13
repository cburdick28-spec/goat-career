# GOAT Career

A browser basketball game: create a player, play real-time 3D arcade games
yourself, auto-sim the rest of an 82-game season, and chase a perfect 82-0
record across a multi-season career.

**Live:** https://goat-career.vercel.app
**Repo:** https://github.com/cburdick28-spec/goat-career

See `docs/superpowers/specs/2026-10-13-goat-career-design.md` for the design
and `docs/superpowers/plans/2026-10-13-goat-career-plan.md` for the build plan.

## Develop

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Build

```bash
npm run build
```

## Version control

This machine has no system `git` (no admin rights to install Xcode Command
Line Tools), so version control goes through `scripts/vcs.mjs`, a small
isomorphic-git-based wrapper:

```bash
node scripts/vcs.mjs add <path...>
node scripts/vcs.mjs commit -m "<message>"
node scripts/vcs.mjs push
node scripts/vcs.mjs log
```

## Game modes

- **Spin & Draft a Player** (goat-lab style): spin a reel of real NBA pros, bolt each
  pro's rating onto one of six attribute slots, then sim the whole career.
- **Dream Team** (82-0 style): draft one all-time player per position from packs of
  four and sim 82 games to see if the lineup can go undefeated.
- **Daily Build / Daily Dream**: same cards for everyone each day, one attempt, with a streak.

Player ratings in `src/data/nbaPlayers.js` are hand-estimated approximations, not official numbers.
