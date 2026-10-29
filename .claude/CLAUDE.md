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

## Git and branches
- `main` always holds a runnable version. Only the user merges into `main` (PRs auto-merge once the user approves). Never push to `main`.
- Work on topic branches: `feature/`, `bugfix/`, `chore/`, `docs/`, etc. Claude may create, modify, rename and delete any branch except `main`.
- Merge into `main` via PR, only when something is ready to publish as a new version. Don't open PRs otherwise.
- PR descriptions are the main review surface (the user rarely reads code): always a summary of what and why, what to test, decisions made, open questions. Max half to one page.
- Small, verifiable steps, steady progress, aware of the roadmap (see `docs/handover.md`). Use hats in commit messages where applicable.

## Quality

- Verify with tests (unit, integration, e2e). CI builds, lints, type-checks and tests. Keep it green at all times.
- Occasionally take and inspect screenshots (costly: do it sparingly), or ask the user to confirm.

## Code
The user entrusts the details to Claude. Principles:
- SRP, KISS and DRY at all times.
- Build infrastructure, then use and combine it. Think library and client: engine/API-like code (pure, testable, no UI or input, e.g. `src/lib/view.ts`, `render.ts`) versus code that uses it (components, input handling).
- The linter enforces quality limits (complexity, function length, nesting depth, parameter count, statements, file length: see `eslint.config.js`). Fix violations by refactoring. Never disable a rule or raise a limit just to get green; raise one only deliberately and mention it in the PR.

## Dependencies
- Before pinning or choosing a version, look it up (`npm view <pkg> versions/dist-tags/peerDependencies`). Never guess a version.

## Conventions
- World coordinates: meters, origin at map center, x right, y down (^4).

## Context

- Product background and design decisions: `docs/handover.md` (its mention of single-page HTML demos is outdated; we build a real app now).
- Stack: bun + TypeScript + a JS framework : Svelte 5 + Vite + vitest (^1).

## Commands
- `bun install`, `bun run dev` (app), `bun run ci` (lint + check + test + build, same as GitHub Actions).
- TypeScript is pinned to 6.0.3, the last JS-based release: typescript-eslint and svelte-check do not support 7.0 (no stable programmatic API). Revisit when 7.1 is stable (planned 2026-11-24). (^3)
