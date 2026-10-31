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
- Status words in the registry: `decided` = the user decided it; `assumed` = Claude filled in a detail and the user has not confirmed it yet (never write "decided by Claude", and no "please confirm" either: `assumed` already says it).

## Git and branches
- `main` always holds a runnable version. Only the user merges into `main` (PRs auto-merge once the user approves). Never push to `main`.
- Work on topic branches: `feature/`, `bugfix/`, `chore/`, `docs/`, etc. Claude may create, modify, rename and delete any branch except `main`.
- Open a PR right after creating a branch (it will be merged eventually); the user merges when it is ready to publish as a new version.
- PR descriptions are the main review surface (the user rarely reads code): always a summary of what and why, what to test, decisions made, open questions. Max half to one page.
- Small, verifiable steps, steady progress, aware of the roadmap (`docs/hats.md`, ^146). Use hats in commit messages where applicable.

## Roadmap and scope (^146)
- Roadmap = the prioritised list of wanted work (types `feature`, `bug`, `chore`). Milestone = one PR tackling one or more roadmap items.
- At the start of a milestone write its scope (in/out) in the PR description. Revisions inside the scope are all done in the PR.
- When the user asks for something new or out of scope during a milestone, say so, admonish gently and suggest putting it on the roadmap as a hat instead. Do not build it right away.
- Only one branch/PR at a time may add hats (numbering stays unique and gapless). Other PRs (e.g. pure refactors) add no hats.

## Quality

- Verify with tests (unit, integration, e2e). CI builds, lints, type-checks and tests. Keep it green at all times.
- Occasionally take and inspect screenshots (costly: do it sparingly), or ask the user to confirm.

## Code
The user entrusts the details to Claude. Principles:
- SRP, KISS and DRY at all times.
- Build infrastructure, then use and combine it. Think library and client: engine/API-like code (pure, testable, no UI or input, e.g. `src/lib/view.ts`, `render.ts`) versus code that uses it (components, input handling).
- The linter enforces quality limits (complexity, function length, nesting depth, parameter count, statements, file length: see `eslint.config.js`). Fix violations by refactoring. Never disable a rule or raise a limit just to get green; raise one only deliberately and mention it in the PR.

## Glossary
- The README has a glossary (^67) with a status per term. Use its words; when a term is new or changes, update it in the same step: `assumed` unless the user defined it.

## Hidden features
- No always-hidden features: anything built but switched off must be listed in `src/lib/features.ts` and have a hat that says why and what decides its return.

## Dependencies
- Before pinning or choosing a version, look it up (`npm view <pkg> versions/dist-tags/peerDependencies`). Never guess a version.

## Conventions
- World coordinates: meters, origin at map center, x right, y down (^4).
- Two levels of gizmo (^60): the *skeleton* (curves and node dots, always shown) and the *scaffold* (all other gizmos of a segment, shown by need). A *segment* is the curve between two nodes.

## Context

- Controls: `docs/controls.md` is the current reference; update it together with the hat when a control changes.
- Product background and design decisions: `docs/handover.md` (its mention of single-page HTML demos is outdated; we build a real app now).
- Stack: bun + TypeScript + Svelte 5 + Vite + vitest (^1). Code map: `src/lib/curves/` is the pure curve geometry library (^12), `editor.svelte.ts` the interaction engine, `MapCanvas.svelte` view and input dispatch, `render*.ts` drawing.

## Commands
- `bun install` (also enables the git hooks in `.githooks/`), `bun run dev` (app), `bun run ci` (lint + check + test + build, same as GitHub Actions).
- `bun run e2e`: the end-to-end smoke test (Playwright drives the dev server in a real browser; ^145). It is its own CI job and not part of `bun run ci` or the pre-push hook. After `bun install` once: `bunx playwright install chromium`. The test reads the app through `window.__modelcity` (`src/lib/testHook.ts`, dev builds only).
- `.githooks/pre-push` runs `bun run ci`, so a push only goes out green. Never bypass it (`--no-verify`).
- TypeScript is pinned to 6.0.3, the last JS-based release: typescript-eslint and svelte-check do not support 7.0 (no stable programmatic API). Revisit when 7.1 is stable (planned 2026-11-24). (^3)
