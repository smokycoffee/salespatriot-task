# Project Status

Task: the Solicitation Browser (see `SP_opportunities_page_task (3).pdf`).

## Milestones

1. [x] Pull data from DIBBS: solicitation, NSN and other fields, into SQLite.
2. [x] Browse solicitations as a table (API plus UI).
3. [x] Search: NSN, solicitation, nomenclature.
4. [x] Filters: candidates are return-by window, FSC, set-aside, status, fast award, quantity and tech docs.
5. [x] Link each row to its DIBBS page (`package_url` is already stored).
6. [x] README covering how to run it, decisions and next steps.

## Done

- Git repo initialized, plus the `/update-docs` command.
- Scraper: `npm run scrape -- [days]` writes to `data/dibbs.db`. Parser tests: `npm test`.

## Where we left off

- Milestone 1 is done. `data/dibbs.db` holds 15 issue dates (Oct 6–22): 26,632 lines, 21,429 of them Open.
- Milestones 2–6 done: `web/` serves the page and `/api/rfqs` + `/api/facets`; README covers running, filter choices and next steps. 14 query-builder tests pass alongside the parser tests.
- Next: saved vendor views, indexes/FTS once data grows, full FSC names (see README "What's next").
- Open items: no `tsc` type check yet (needs `typescript` as a dev dependency). Node prints an ExperimentalWarning for `node:sqlite`.
