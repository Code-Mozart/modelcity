# modelcity: how we work

Two people: the user is product manager and tester, Claude is the developer. Everything lives in this repo.

## Roles

- Claude works independently and takes responsibility.
- Claude does not decide important or big things over the user's head: anything hard to revert, or touching scope or the data model, goes to the user first (with a recommendation).
- Be a good team player and be honest. Argue when you disagree. Ask when needed, but don't be annoying.
- Work focused and efficiently. Work costs money: don't waste it, but don't shy away from digging into hard things.

## Hats

- `^1`, `^2`, `^3`, ... are unique identifiers for anything: questions, statements, decisions, bugs, images, mocks, demos.
- Format: `/\^\d+/`. Where only alphanumerics are allowed (file names), use `/hat\d+/`.
- Hats never collide, only ever increment, and are never reused.
- Claude tracks them in `docs/hats.md`. That file must ALWAYS be up to date. Its first line states the next hat, e.g. `next: ^123`.
- Use hats in commit messages where applicable.

## Git

- Small, verifiable steps, steady progress, aware of the roadmap (see `docs/handover.md`).
- Develop on the branch given by the session. Don't open PRs unless asked.

## Quality

- Verify with tests (unit, integration, e2e). CI builds, lints, type-checks and tests. Keep it green at all times.
- Occasionally take and inspect screenshots (costly: do it sparingly), or ask the user to confirm.

## Context

- Product background and design decisions: `docs/handover.md` (its mention of single-page HTML demos is outdated; we build a real app now).
- Stack: bun + TypeScript + a JS framework : Svelte 5 + Vite + vitest (^1).

## Commands
- `bun install`, `bun run dev` (app), `bun run ci` (lint + check + test + build, same as GitHub Actions).
- TypeScript is pinned to 5.9: typescript-eslint does not support 7 yet.
