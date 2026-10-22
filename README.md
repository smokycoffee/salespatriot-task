# SalesPatriot technical screen task: DIBBS Solicitation Browser

One page where a DLA vendor sees the open RFQs worth quoting today, narrows them to their supply classes and eligibility, and opens the RFQ on DIBBS to quote.

## Run it

Requires Node 24.

```sh
npm run scrape -- 15          # fill data/dibbs.db with the newest 15 DIBBS issue days
npm --prefix web install      # once
npm start                     # build and serve the page and API on http://localhost:3000
npm run dev                   # or: Next.js dev server with hot reload
npm test                      # scraper parser tests + API query builder tests
```

If `data/dibbs.db` is missing, the page and API both say to run `npm run scrape` first. Set `DIBBS_DB=/path/to/dibbs.db` to point at another file.

## How it's built

- `src/`: the scraper (unchanged), plain Node 24 TypeScript writing `data/dibbs.db`.
- `web/`: a Next.js 16 app. The route handlers read the same SQLite file read-only through `node:sqlite`.
  - `web/lib/query.ts`: the query builder. It parses and validates URL params, then builds parameterised SQL. Sort columns come from an allowlist and values never reach the SQL text. The page and the API share it, so a URL means the same thing in both.
  - `GET /api/rfqs?…` returns `{ rows, total }`, 50 rows a page.
  - `GET /api/facets?…` returns option counts for status, set-aside and FSC under the current filters (each one leaves out its own dimension), plus the global summary tiles.
  - Bad params (unknown key, bad enum, bad date, qmin > qmax, …) return `400 { error }` with the reason.
  - `web/app/browser.tsx` is the page. Filter state lives in the URL, so every view can be shared and survives a reload.
- Speed: on about 26k rows, `/api/rfqs` answers in about 20–50 ms and `/api/facets` in about 25–35 ms on a laptop, using full scans with no added indexes (the schema is unchanged).

## Filters and why

| Filter | Default | Why |
|---|---|---|
| **Return by:** 48 h / 7 d / 14 d / Any | Any upcoming date | The deadline decides what to work on first. "Any" still hides RFQs whose return-by date has passed, since you can't quote them (about 1 in 5 "Open" lines on DIBBS is already past due). A checkbox brings them back. |
| **Set-aside:** Unrestricted, Small Business, SDVOSB, HUBZone, WOSB | All | This is eligibility. A small business wants the set-asides it qualifies for plus unrestricted work, and nothing else. |
| **Supply class (FSC)**, multi-select with counts | All | Vendors specialize by supply class. Each code shows its Federal Supply Group name (5330 → Packing & gaskets; classes without a listed title show their group), and the list can be searched by code or name. |
| **Fast award only** | Off | Micro-purchases that can be awarded before the return date are quick wins. |
| **Paperwork:** tech docs (any / none / required), Mil-Spec (any / exclude / only) | Any | This is the capability and documentation burden. "No tech docs, no Mil-Spec" is the low-effort pile. |
| **Quantity** min–max | — | It shows whether a job fits your stock and production capacity. |
| **Issued** date range | — | Use it to review what's new since your last visit. |
| **Status** | Open | Closed, cancelled and awarded RFQs can't be quoted. They're one click away for research. |

The summary tiles are shortcuts. **Open RFQs** resets to the default view, **Closing in 48 h** applies the 48 h window, **New today** filters to the latest issue day, and each **top FSC** filters to that class. Clicking an active tile again turns it off.

Search is a single box, debounced, that covers NSN and solicitation (with or without dashes), PR number and item name. Press `/` to focus it.

## Design

The look is an equipment data plate: a satin aluminium ground, etched ink, labelled fields and hairline rules. The only colour is a signal orange-red, and it's reserved for deadlines of 2 days or fewer. Each return-by cell has a gauge whose length is the days left on a 14-day scale. Below 1180 px the filters move into a side sheet, and below 860 px into a bottom sheet with rows stacked as cards. `PRODUCT.md` and `.impeccable/` hold the design context.

## What's next

- Saved views per vendor (my FSCs + my set-asides) and a morning email of new matches.
- Indexes on `return_by`, `status` and `fsc`, plus an FTS5 table for nomenclature, once the data grows past a few hundred thousand rows.
- Full FSC names (not just the group) from the official H2 cataloging handbook.
- A scheduled scrape (cron) and a "last scraped" freshness warning when data is older than a day.
- Show award history per NSN, so the vendor can see the incumbent price before quoting.
