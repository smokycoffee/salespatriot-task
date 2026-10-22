# SalesPatriot

DIBBS Solicitation Browser. TypeScript on Node 24 (native `.ts`, no build), SQLite via `node:sqlite`, no dependencies.

- `npm run scrape -- [days]`: pull the newest N DIBBS issue dates into `data/dibbs.db`.
- `npm test`: parser tests (`node --test`).

## Docs

Read these before starting work, and keep them current:

- `docs/architecture.md`: system design and app structure.
- `docs/changelog.md`: dated entries for every change, update and decision.
- `docs/project-status.md`: milestones, what's done, and where we left off.

Run `/update-docs` after meaningful changes to refresh all three (`.claude/commands/update-docs.md`).
