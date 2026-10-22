# Changelog

## 2026-10-22

- Initialized git repo.
- Added `/update-docs` command (`.claude/commands/update-docs.md`).
- Added the DIBBS scraper (`src/dibbs.ts`, `src/scrape.ts`) and parser tests. It pulls the solicitation, NSN and 13 more fields per RFQ line into SQLite.
- Decision: scrape the public HTML grid. The bulk RFQ download files need a DIBBS login.
- Decision: Node 24 native TypeScript plus `node:sqlite`, so there are zero dependencies.
- Decision: the primary key is `(solicitation, pr_number, nsn)`. A key of solicitation plus PR collided on 53 first-article and testing sub-lines in one day.
- Fix: solicitation and status are read as cell text, not link or span text. Rows without a PDF yet came back with a blank solicitation.
- Verified live: 3 days, 3,599 lines, about 100 s.
- The scraper now takes explicit dates (`npm run scrape -- MM-DD-YYYY ...`), caps how many days run at once (`CONCURRENCY`, default 3), and uses WAL plus a busy timeout so several processes can share the database.
- Pulled 15 issue dates (Oct 6–22) with 3 parallel subagents: 26,632 lines, no errors, no key collisions.
- Added `UI_PROMPT.md` (the UI build prompt) and `Implementation_step.md` (what's done and the production roadmap).
- Built the Solicitation Browser UI as a Next.js 16 app in `web/` (user chose Next.js, a `web/` subfolder, and the exact API contract from `UI_PROMPT.md`). `npm start` builds and serves it; `npm run dev` for hot reload.
- Decision: "Open" by default also hides return-by dates already past (about 1 in 5 Open lines); a checkbox shows them.
- Decision: FSC codes show their Federal Supply Group name; full FSC names are a next step.
- Decision: no indexes added (schema unchanged); full scans answer in 20–50 ms on 26k rows.
- Design: data-plate visual world via Impeccable (`PRODUCT.md`, `.impeccable/`); signal colour reserved for deadlines ≤ 2 days.
- Found while verifying the filters: every fast-award line is unrestricted, so "Fast award" plus a set-aside returns 0. Also, the single "Economically Disadvantaged Women Owned Small Business" line maps to Unrestricted. Both are documented as known limits and not changed yet.
- Removed the unused `--signal-wash` CSS variable.
- Docs pass before pushing to GitHub: the README gained a screenshot (`docs/screenshot.png`, headless Chrome at 1440×1000), "Getting the data", "Key decisions" and "Known limits" sections, and links to the data structure and production roadmap. `project-status.md` was cleaned up, and `Implementation_step.md` updated for the finished UI.
