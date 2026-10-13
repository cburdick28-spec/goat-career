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
