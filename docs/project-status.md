# Project Status

Task: the Solicitation Browser (see `SP_opportunities_page_task (3).pdf`).

## Milestones

1. [x] Pull data from DIBBS: solicitation, NSN and 13 other fields, into SQLite.
2. [x] Browse solicitations as a table (API plus UI).
3. [x] Search: NSN, solicitation, PR and nomenclature, with or without dashes.
4. [x] Filters: return-by window, FSC, set-aside, status, fast award, tech docs, Mil-Spec, quantity and issued date.
5. [x] Link each row to its DIBBS page, plus the solicitation PDF.
6. [x] README covering how to run it, the decisions, a screenshot and next steps.

## Done

- **Scraper:** `npm run scrape -- [N | MM-DD-YYYY ...]` writes `data/dibbs.db`. It handles the consent banner, ASP.NET paging, retries and capped concurrency.
- **Data:** 15 issue dates (Oct 6–22): 26,632 lines, 21,429 of them Open.
- **Web app** (`web/`, Next.js 16): the landing page with summary tiles, search, filters with counts, URL state, and `/api/rfqs` plus `/api/facets`.
- **Tests:** 14 pass under `npm test`, covering the parser and the query builder.
- **Docs:** README (with screenshot), `Implementation_step.md` (summary, data structure, production roadmap), `DESIGN.md` and `PRODUCT.md` (design).

## Where we left off

- Ready to push to GitHub for the interviewer. The database is not committed (`data/` is gitignored), so reviewers run `npm run scrape` first.
- Known issues, documented in the README:
  - Fast award never overlaps a set-aside, so that combination returns 0.
  - The single EDWOSB set-aside line is grouped under Unrestricted.
- Next: award history per NSN, saved vendor views with alerts, a daily scheduled scrape, and the official bulk files once credentials are available.
- Open items: no root `tsc` check for the scraper (`web/` has TypeScript). Node prints an ExperimentalWarning for `node:sqlite`.
