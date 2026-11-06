# modelcity: how we work

Two people: the user is product manager and tester, Claude is the developer. Everything lives in this repo.

## Roles

- Claude works independently and takes responsibility.
- Claude does not decide important or big things over the user's head: anything hard to revert, or touching scope or the data model, goes to the user first (with a recommendation).
- Be a good team player and be honest. Argue when you disagree. Ask when needed, but don't be annoying.
- Work focused and efficiently. Work costs money: don't waste it, but don't shy away from digging into hard things.

## Hats

- `^1`, `^2`, `^3`, ... are unique identifiers for anything: questions, statements, decisions, bugs, images, mocks, demos.
- Hats are the only ids. Never invent a second id system (letters, numbers or codes for milestones, sets, groups, steps). Anything that must be referred to gets a hat, even if that means registering it first.
- Format: `/\^\d+/`. Where only alphanumerics are allowed (file names), use `/hat\d+/`.
- Hats never collide, only ever increment, and are never reused.
- Claude tracks them in `docs/hats.md`. That file must ALWAYS be up to date. Its first line states the next hat, e.g. `next: ^123`.
- Use hats in commit messages where applicable.
- Requirements the user mentions at random times become hats at once (first look whether one exists and extend it); they are sorted out lazily when their topic comes up (^246).
- Status words in the registry: `decided` = the user decided it; `assumed` = Claude filled in a detail and the user has not confirmed it yet (never write "decided by Claude", and no "please confirm" either: `assumed` already says it); `maintained in ^N` = the hat was split up or taken over: its text stays as history and all future updates go into the hat(s) named, which name it as their origin.

## Git and branches
- `main` always holds a runnable version. Only the user merges into `main` (PRs auto-merge once the user approves). Never push to `main`.
- Work on topic branches: `feature/`, `bugfix/`, `chore/`, `docs/`, etc. Claude may create, modify, rename and delete any branch except `main`.
- Open a PR right after creating a branch (it will be merged eventually); the user merges when it is ready to publish as a new version.
- PR descriptions are the main review surface (the user rarely reads code): always a summary of what and why, what to test, decisions made, open questions. Max half to one page.
- Small, verifiable steps, steady progress, aware of the roadmap (`docs/hats.md`, ^146). Use hats in commit messages where applicable.

## Roadmap and scope (^146)
- Roadmap = the prioritised list of wanted work (types `feature`, `bug`, `chore`). Milestone = one PR tackling one or more roadmap items. A roadmap item may be unassigned (no milestone yet) until we plan it.
- At the start of a milestone write its scope (in/out) in the PR description. Revisions inside the scope are all done in the PR.
- When the user asks for something new or out of scope during a milestone, say so, admonish gently and suggest putting it on the roadmap as a hat instead. Do not build it right away.
- Only one branch/PR at a time may add hats (numbering stays unique and gapless). Other PRs (e.g. pure refactors) add no hats.

## Rhythm of a milestone (guideline)
Roughly, and not a fixed protocol; bend it when a milestone calls for it:
1. The user names the next milestone.
2. Claude writes the scope, creates the branch and opens the PR with the scope in its description.
3. Back and forth: the user approves or requests changes, Claude corrects (revisions inside the scope are all done in the PR).
4. Claude implements, pushes everything to the PR and reports once.
5. Back and forth again: approval or new revisions.

## Stored data model (^170)
- The stored model is specified in `docs/data-model.md`. It is fixed: any change to it needs the user's agreement, a version bump and a migration (^173).
- Every way a project file is refused on import has a hat (^192 to ^208, rule ^209). When the import interface changes (data model extended or changed, a migration or a check added), make or update these hats in the same step.

## Quality

- Verify with tests (unit, integration, e2e). CI builds, lints, type-checks and tests. Keep it green at all times.
- Occasionally take and inspect screenshots (costly: do it sparingly), or ask the user to confirm.

## Code
The user entrusts the details to Claude. Principles:
- SRP, KISS and DRY at all times.
- Build infrastructure, then use and combine it. Think library and client: engine/API-like code (pure, testable, no UI or input, e.g. `src/lib/camera/view.ts`, `src/lib/render/paint.ts`) versus code that uses it (components, input handling).
- State that depends on other state is *derived*, not stored and refreshed by hand: a cached value needs every operation to remember to update it, and the first one that forgets is a bug (the hover that stayed until the mouse moved, ^238). Test such a property in general (random sequences of operations), not only for the case that was found.
- The linter enforces quality limits (complexity, function length, nesting depth, parameter count, statements, file length: see `eslint.config.js`). Fix violations by refactoring. Never disable a rule or raise a limit just to get green; raise one only deliberately and mention it in the PR.

## Refactoring (learned in the first refactoring pass, ^215)
- A refactoring pass is its own PR (no hats, no behaviour change). Never start one on your own: the user asks for it when it is time (^215). Read the code; tools only find the literal part (copy-paste scanner `jscpd`, dead-code finder `knip`: run them with an exact version from `npm view`, they are not dependencies).
- Look for duplicated *decisions*, not duplicated text: the same question answered in two places (which end is drawn from, does this handle belong to this segment, a point on a circle). Name it once. Two similar pieces of code are only worth merging when they must change together.
- Group files by what they are for (`editor/`, `camera/`, `render/`, `hints/`, `ui/`, `project/`, `curves/`, `model/`); stored data (`model/`) stays apart from what is derived from it (`editor/chains.ts`). Library code never imports client code.
- Tests get the same care: a fixture used by more than one test file lives in `testing/` (`editorHelpers.ts`), not in each file. A style shared by several components lives in one place (`project/cards.css`), not in one component's `:global` rules.
- Do not keep code "for later" without a hat; knip's list of unused exports is the check.
- Measure size as real lines (without blanks and comments). Judge a refactor by fewer places that decide the same thing, not by fewer lines.

## Glossary
- The README has a glossary (^67) with a status per term. Use its words; when a term is new or changes, update it in the same step: `assumed` unless the user defined it.

## Hidden features
- No always-hidden features: anything built but switched off must be listed in `src/lib/features.ts` and have a hat that says why and what decides its return.

## Dependencies
- Before pinning or choosing a version, look it up (`npm view <pkg> versions/dist-tags/peerDependencies`). Never guess a version.

## Conventions
- World coordinates: meters, origin at map center, x right, y down (^4).
- Design principle (^178): every list the user sees is searchable, and the search is fuzzy (`src/lib/ui/fuzzy.ts`).
- Design principle (^181): a control hint says what an input does right now, with what is under the pointer and the state of the app; never "when you click X, Y happens".
- Design principle (^210): a message to the user has the icon of its kind in front (error: exclamation mark in a red circle; information: i in a blue circle; warning: exclamation mark in an orange triangle; success: check mark in a green circle), never color alone (`Notice.svelte`).
- Design principle (^211): use the available screen space; UI is not small without a reason.
- Design principle (^233): avoid accidental actions that discard the user's work: block them (with a message that says why) or ask first; when nothing would be lost, allow them.
- Design principle (^251): precision grows with distance: the farther the pointer is from the point it controls, the finer the steps (angles, snapping), wherever that is feasible and sensible.
- Design principle (^259): prefer an explicit control (a key, a click) to anything that needs the pointer to stay exactly on a thin target, to hover for a while, or in a nested menu that vanishes when the pointer leaves it by a pixel.
- Design principle (^805): no new colour for a new meaning. Grey is only for what is grayed out (the generated geometry has its own shade); a new feedback reuses the glyph of the thing it is (a snap point is the turquoise ring wherever it is shown, ^803).
- Say *operation* for something the user can do, not *action* (^180).
- Two levels of gizmo (^60): the *skeleton* (curves and node dots, always shown) and the *scaffold* (all other gizmos of a segment, shown by need). A *segment* is the curve between two nodes.

## Context

- Controls and features (^371, ^786): `docs/controls.md` (controls) and `docs/features.md` (features and operations, with where each is tested) are the reference. A new feature, operation, control or toast gets its hat and its row in the same PR; a changed control updates its row. `docs/controls.md` is incomplete on purpose until the milestone ^783 (controls as data); new controls get a row under *Controls by context*. When controls change, run the matrix (`CONTROLS_MATRIX_OUT=/some/dir bunx vitest run src/lib/testing/controlsMatrix.test.ts`: it drives the editor over the combinations and lists what each input did and what the hints say) and look at what changed. At the end of a milestone sweep the code once more for what was missed.
- Product background and design decisions: `docs/handover.md` (its mention of single-page HTML demos is outdated; we build a real app now).
- Stack: bun + TypeScript + Svelte 5 + Vite + vitest (^1). Code map of `src/lib/` (^12): `curves/` the pure curve geometry library; `model/` the graph, chains and junctions; `editor/` the interaction engine (`editor.svelte.ts`) with its pure helpers, selection and undo; `camera/` view, pan, zoom, rotate and bounds; `render/` canvas drawing; `hints/` the control hints and the input symbols; `ui/` generic components (list, icons, notices); `project/` projects, storage, files and the projects modal; `MapCanvas.svelte` input dispatch and view.

## Commands
- `bun install` (also enables the git hooks in `.githooks/`), `bun run dev` (app), `bun run ci` (lint + check + test + build, same as GitHub Actions).
- `bun run e2e`: the end-to-end smoke test (Playwright drives the dev server in a real browser; ^145). It is its own CI job and not part of `bun run ci` or the pre-push hook. After `bun install` once: `bunx playwright install chromium`. The test reads the app through `window.__modelcity` (`src/lib/testHook.ts`, dev builds only).
- `.githooks/pre-push` runs `bun run ci`, so a push only goes out green. Never bypass it (`--no-verify`).
- TypeScript is pinned to 6.0.3, the last JS-based release: typescript-eslint and svelte-check do not support 7.0 (no stable programmatic API). Revisit when 7.1 is stable (planned 2026-11-24). (^3)
