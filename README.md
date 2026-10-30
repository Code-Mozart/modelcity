# modelcity

modelcity is an editor to create Google Maps-like maps for fictional cities.

## Getting started

Requires [bun](https://bun.sh).

```bash
bun install
bun run dev
```

Then open the URL it prints (http://localhost:5173 by default).

`bun install` also enables a pre-push git hook that runs `bun run ci`, the same checks as the GitHub Actions workflow.

## More

- How we work (conventions, branches, code rules, commands): [`.claude/CLAUDE.md`](.claude/CLAUDE.md)
- Controls (mouse, keyboard, touch): [`docs/controls.md`](docs/controls.md)
- Product background and design decisions: [`docs/handover.md`](docs/handover.md)
- Decisions, questions and milestones: [`docs/hats.md`](docs/hats.md)
