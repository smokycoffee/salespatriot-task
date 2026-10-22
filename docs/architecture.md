# Architecture

Solicitation Browser: pulls daily DIBBS RFQs and lets a vendor browse, search and filter them.

## Stack

Scraper: TypeScript on Node 24 (runs `.ts` directly, no build step), SQLite via built-in `node:sqlite`, no dependencies.
UI: a Next.js 16 app in `web/` (React 19, its only dependencies), reading the same database read-only through `node:sqlite`.

## Data flow

```
DIBBS (HTML, ASP.NET)  ->  src/dibbs.ts (fetch + parse)  ->  src/scrape.ts  ->  data/dibbs.db (rfqs table)
                                                                              ->  web/app/api/* (read-only)  ->  web/app/browser.tsx
```

## Source: dibbs.bsm.dla.mil

- Every page sits behind a DoD consent banner. Any redirect means "no consent cookie": the client POSTs the banner form (`butAgree=OK`), keeps the cookies, and retries.
- `Rfq/RfqDates.aspx?category=issue` lists the issue dates.
- `RFQ/RfqRecs.aspx?category=issue&TypeSrch=dt&Value=MM-DD-YYYY` is one day's grid, 50 rows a page. Further pages come from ASP.NET postbacks (`__EVENTARGUMENT=Page$N` plus every hidden `__VIEWSTATE*` field). There are about 20–30 pages a day, roughly 4 s each.
- The bulk download files (`AcqDownloads`) need a login, so the HTML grid is the public source.
- Each grid cell is a `<span id="..._lblX">`. The parser reads cells by those IDs.

## Modules

- `src/dibbs.ts`: `Session` (cookie jar, consent banner, 3 retries with backoff, 90 s timeout), `issueDates()`, `fetchDay()`, `parseRows()`, `hiddenFields()`, `hasNextPage()`.
- `src/scrape.ts`: CLI. Takes the newest N issue dates, or explicit `MM-DD-YYYY` dates. Days run through a worker pool (`CONCURRENCY`, default 3), one session per day. Each day is upserted in one `BEGIN IMMEDIATE` transaction. WAL plus a busy timeout let several scraper processes share the database.
- `test/dibbs.test.ts`: parser tests against `test/fixtures/rfq-page.html`, which is 3 real rows.
- `web/lib/query.ts`: the shared query builder. `parseParams` validates URL params (unknown key or bad value → `ParamError` → 400), `toParams` is its inverse for the page, and `buildWhere`/`buildRowsQuery` emit parameterised SQL with sort columns from an allowlist. Set-aside free text is mapped to keys (`unrestricted|sb|sdvosb|hubzone|wosb`) by one SQL `CASE`.
- `web/lib/db.ts`: opens the DB read-only (path `../data/dibbs.db` or `DIBBS_DB`), wraps routes so a missing DB returns 503 "run `npm run scrape` first".
- `web/app/api/rfqs/route.ts`: `{ rows, total }`, 50 a page. `web/app/api/facets/route.ts`: status/set-aside/FSC counts under the current filters (each omits its own dimension) and the global summary tiles.
- `web/app/browser.tsx`: the page (client component). URL is the filter state; it forwards the query string to both APIs. `web/lib/fsg.ts`: Federal Supply Group names.
- `web/lib/query.test.ts`: query builder tests against an in-memory SQLite table; run by the root `npm test`.

## Data model: `rfqs`

| Column | Notes |
|---|---|
| solicitation, pr_number, nsn | Primary key. First-article and testing sub-lines share a solicitation and PR but have their own item numbers. |
| nsn | An NSN (`8475-01-537-3803`) or a part number for non-NSN items. |
| fsc | The first 4 digits of the NSN. Null for non-NSN items. |
| nomenclature, qty | |
| issued, return_by | ISO `yyyy-mm-dd`. |
| status | Open / Cancelled / Removed / Awarded. |
| set_aside | Unrestricted, Small Business, SDVOSB, HUBZone or WOSB. |
| fast_award | Micro-purchase quotes may be awarded before the return date. |
| mil_spec, tech_docs | Whether there's a spec burden and tech data. |
| pdf_url | The solicitation PDF. Null until DIBBS posts it. |
| package_url | The original DIBBS page (`rfq/rfqrec.aspx?sn=...`). |
| scraped_at | |

Re-scraping a day refreshes status, return_by, qty, set_aside and fast_award.
