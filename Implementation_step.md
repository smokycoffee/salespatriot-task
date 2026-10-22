# Implementation Steps

The DIBBS Solicitation Browser: pull daily DLA RFQs from dibbs.bsm.dla.mil so a vendor can browse, search and filter them, and open each one on DIBBS.

## Summary

**What was done.** DIBBS has no public API, so we wrote a scraper: a script that downloads the DIBBS web pages a person would see and copies the RFQ table into our own database. It fetches each issue date's RFQ list, clicks through every page of it, and saves each line to SQLite (`data/dibbs.db`). Each line gets its solicitation number, NSN and 13 other fields, plus a link back to its page on DIBBS. It pulled 15 days of RFQs: 26,632 lines.

**Issues we hit while scraping.**
- **Consent banner:** every page first shows a DoD consent screen, so the scraper has to click "OK" programmatically and keep the cookie it gets back.
- **Bulk downloads are locked:** DIBBS's downloadable data files need a vendor login, so we had to read the HTML pages instead.
- **Paging:** each day is split into pages of 50 rows. Getting page 2 and on means sending back a huge hidden form (about 1,300 fields of ASP.NET "view state").
- **Dropped connections:** the site occasionally drops connections, so every request retries 3 times.
- **Data surprises:**
  - Some RFQ lines share the same solicitation and PR number. They're first-article and testing sub-lines, so the unique key also needs the NSN.
  - Some solicitations had no PDF link yet, and cancelled rows had a different status layout. Both first came out blank.
  - Some items use part numbers instead of NSNs.
- **Volume swings:** a normal weekday is about 1,000–2,000 lines; Oct 13 had about 7,800.

**What "the parser" is.** `parseRows()` in `src/dibbs.ts` is the code that reads a downloaded DIBBS page and pulls the values out of the table. It finds each cell by the ID DIBBS gives it in the HTML, for example `..._lblNsn` for the NSN cell or `..._lblSolicitation` for the solicitation. If DIBBS redesigns the page (renames those IDs, or moves the dates or quantities into a different format), the parser can't find the values and returns blank or wrong data. That's what "a layout change breaks the parser" means.

**What "the fixture test" is.** `test/dibbs.test.ts` runs `parseRows()` on `test/fixtures/rfq-page.html`, a saved copy of 3 real rows from DIBBS (a "fixture" is a frozen sample input). It checks that every field comes out exactly right: solicitation, NSN, quantity, dates, set-aside, Mil-Spec and the links. Run it with `npm test`. It catches mistakes in *our* code. It can't notice when *DIBBS* changes, because the saved sample never changes. Catching a DIBBS change needs a live check, such as alerting when a scrape returns 0 rows (see "For production").

## Data structure

All data lives in one SQLite file, `data/dibbs.db`, in one table, `rfqs`. **One row = one RFQ line**: a single item (NSN or part number) on a single purchase request within a solicitation. A solicitation usually has one line, but can have up to 25. That's why the key is three columns.

```
Solicitation SPE4A1-27-T-0179
 └─ PR 7015145326
     ├─ NSN 2840-01-187-8730   BLADE SET, TURBINE   qty 375   <- the item being bought
     ├─ 0001S00000053          CONTRACTOR FIRST ARTICLE        <- testing sub-lines, same PR
     └─ 0001S00000061          PRODUCTION LOT TESTING
```

### Table `rfqs`

Primary key: `(solicitation, pr_number, nsn)`.

| Column | Type | Example | Meaning |
|---|---|---|---|
| `solicitation` | TEXT, PK | `SPE1C1-27-Q-0092` | DLA solicitation number. `-Q-` and `-T-` are RFQ types. |
| `pr_number` | TEXT, PK | `7018807815` | Purchase request number. |
| `nsn` | TEXT, PK | `8305-01-100-9061` | National Stock Number, or a part number for non-NSN items (`7310GM5022323`). |
| `fsc` | TEXT, null | `8305` | Federal Supply Class: the first 4 digits of the NSN, which is the product category. Null for non-NSN items. |
| `nomenclature` | TEXT | `CLOTH, COATED` | Item name. DIBBS truncates it to about 22 characters. |
| `qty` | INTEGER, null | `20000` | Quantity requested. Null when DIBBS doesn't show one (mostly testing sub-lines). |
| `issued` | TEXT | `2026-10-21` | Issue date, ISO `yyyy-mm-dd`. |
| `return_by` | TEXT | `2026-10-21` | Quote deadline, ISO `yyyy-mm-dd`. |
| `status` | TEXT | `Open` | `Open`, `Awarded`, `Removed` or `Cancelled`, as of `scraped_at`. |
| `set_aside` | TEXT, null | `Small Business Set-Aside` | Who may bid. See the values below. |
| `fast_award` | INTEGER 0/1 | `0` | 1 means micro-purchase quotes may be awarded before the return-by date. |
| `mil_spec` | INTEGER 0/1 | `1` | 1 means the item is built to a military specification. |
| `tech_docs` | TEXT | `Tech Docs` | `None`, `Tech Docs`, `Tech Docs *Spec/Stnd Only`, or empty. |
| `pdf_url` | TEXT, null | `https://dibbs2.bsm.dla.mil/Downloads/RFQ/2/SPE1C127Q0092.PDF` | Solicitation PDF. Null until DIBBS posts it. |
| `package_url` | TEXT | `https://www.dibbs.bsm.dla.mil/rfq/rfqrec.aspx?sn=SPE1C127Q0092` | The original DIBBS page, used for "open on DIBBS". |
| `scraped_at` | TEXT | `2026-10-22T13:18:16.707Z` | When this row was last refreshed (ISO timestamp, UTC). |

Dates are stored as ISO text, so plain string comparisons work: `WHERE return_by <= '2026-10-25'` sorts and filters correctly.

### Value distribution (15 days, 26,632 lines)

| Field | Values |
|---|---|
| `status` | Open 21,429 · Awarded 3,535 · Removed 1,291 · Cancelled 377 |
| `set_aside` | Unrestricted 22,316 · Small Business 3,430 · SDVOSB 380 · HUBZone 344 · WOSB 161 · EDWOSB 1 |
| `tech_docs` | None 16,439 · Tech Docs 7,615 · empty 1,668 · Spec/Stnd only 910 |
| `fast_award` | 8,473 lines (32%) |
| `mil_spec` | 1,760 lines (7%) |
| `fsc` null (non-NSN) | 1,372 lines |
| `qty` null | 1,181 lines |

### Writes and updates

- The scraper upserts on the primary key. Re-scraping a day refreshes `status`, `return_by`, `qty`, `set_aside`, `fast_award` and `scraped_at`, and never creates duplicates.
- There are no indexes besides the primary key yet. At about 27k rows, full scans take milliseconds. Add indexes on `return_by`, `fsc` and `status` once the data grows to months.

## What's done

### 1. Investigated the source

- **Consent banner:** every DIBBS page redirects to a DoD consent banner (`dodwarning.aspx`) until you accept it. Accepting is an ASP.NET form POST (`butAgree=OK`), and the result is kept in a session cookie.
- **Bulk downloads need a login.** The Acquisition Downloads files (daily RFQ and batch-quote files) require a DIBBS vendor account, which needs a CAGE code and SAM registration. They're ruled out without credentials.
- **The public source is the HTML grid.**
  - `Rfq/RfqDates.aspx?category=issue` lists the issue dates. About 28 are listed, going back roughly a month.
  - `RFQ/RfqRecs.aspx?category=issue&TypeSrch=dt&Value=MM-DD-YYYY` shows one day's RFQs, 50 rows a page.
  - Pages 2 and on are ASP.NET postbacks (`__EVENTARGUMENT=Page$N`) that must send back every hidden `__VIEWSTATE*` field. DIBBS splits the view state into about 1,300 fields.
- **Cells have stable IDs** (`_lblNsn`, `_lblSolicitation`, `_lblPr`, and so on), so the parser reads cells by ID instead of by column position.
- **A headless browser was ruled out.** The data doesn't need JavaScript to render, so plain HTTP does the same job 5–10× faster with no heavy dependency.

### 2. Built the scraper

- **Stack:** TypeScript on Node 24, which runs `.ts` directly with no build step. SQLite via built-in `node:sqlite`. **Zero dependencies.**
- **`src/dibbs.ts`:**
  - A `Session` with a cookie jar that handles the consent banner automatically.
  - Every request retries 3 times with backoff and has a 90-second timeout. DIBBS does drop connections.
  - `issueDates()`, `fetchDay()` (walks every page of a day), `parseRows()`, `hiddenFields()` and `hasNextPage()`.
- **`src/scrape.ts`:** the CLI.
  - `npm run scrape -- [N | MM-DD-YYYY ...]` takes the newest N issue dates or explicit dates.
  - A worker pool caps how many days are fetched at once (`CONCURRENCY`, default 3).
  - Each day is saved in one transaction.
  - The database runs in WAL mode with a busy timeout, so several scraper processes can share it.
- **Fields stored per RFQ line:** solicitation, PR number, NSN or part number, FSC, nomenclature, quantity, issue date, return-by date, status, set-aside, fast-award flag, Mil-Spec flag, tech docs, PDF URL, and the DIBBS package page URL (the "open on DIBBS" link).
- **Tests:** `npm test` (`node --test`) runs against a fixture of 3 real grid rows. It covers every parsed field, pager detection and hidden-field extraction.

### 3. Fixed what the real data showed

| Problem | Fix |
|---|---|
| (solicitation, PR) wasn't unique: 53 collisions in one day. First-article and lot-testing sub-lines share the PR. | The primary key became `(solicitation, pr_number, nsn)`. |
| A blank solicitation on RFQs whose PDF isn't posted yet: the number is plain text, not a link. | Read the solicitation from the cell text with a pattern match. |
| A blank status on Cancelled rows | Read the status from the cell text. |
| Non-NSN part numbers (`7310GM5022323`, `0001S00000053`) | Stored as is. FSC is null unless the value is a real 13-digit NSN. |

Re-running a day upserts: it refreshes status, return-by date, quantity, set-aside and fast award, and never duplicates rows.

### 4. Pulled the data

- **First run:** 3 days (Oct 20–22), 3,599 lines, about 100 s.
- **15-day pull:** Oct 6–22, run as 3 parallel subagents. Each fetched one day at a time, so DIBBS saw only 3 sessions at once.
  - All 3 batches finished with no errors and no retries. The largest took about 15 minutes, because of Oct 13.
  - **Result: 26,632 RFQ lines** across 15 issue dates (Oct 6–22), 24,190 solicitations, 22,732 NSNs and 362 FSCs, in a 7.7 MB database.
  - **Status:** 21,429 Open, 3,535 Awarded, 1,291 Removed, 377 Cancelled.
  - **Checks:** the per-day counts sum exactly to the total, so there were no key collisions. No line is missing a solicitation, NSN or status. 34 lines have no PDF posted yet.
- **Throughput:** about 4 s per 50-row page per session, so roughly 36 rows/s at 3 sessions. That's about 60k lines in 30 minutes.
- **Volume:** weekdays are about 900–1,700 lines; Saturdays are under 30.

### 5. UI handoff

`UI_PROMPT.md` is a ready-to-paste prompt for the UI:
- A landing page with summary tiles, plus a searchable table.
- Filters: status, return-by window, FSC, set-aside, fast award, tech docs / Mil-Spec, quantity and issued date.
- A JSON API with filtering in SQL.
- Each row opens its DIBBS package page.

### 6. Looked at existing tools

- **Apify DIBBS scrapers** (paid per result) use the same public data with no login, so they offer no data advantage.
- **HigherGov** (about $500 a year) and **SamSearch** add history, alerts and award pricing.
- My search found no open-source DIBBS scraper.
- Decision: keep our own scraper. Award history is the feature worth copying (see below).

## Known limits

- **Layout-dependent:** a DIBBS layout change breaks the parser. The fixture test only guards our own code against regressions. Noticing a DIBBS-side change needs a live check.
- **No type check:** `typescript` isn't installed yet, because adding dependencies needs approval.
- **SQLite warning:** `node:sqlite` prints an ExperimentalWarning.
- **Status goes stale:** an RFQ's status only updates when its issue date is re-scraped.
- **Unknown history depth:** dates older than the 28 listed respond (Sep 15 returned rows), but where history ends is unknown.

## For production

### Data ingestion

- **Scheduled scraping:** run the newest 2–3 issue dates daily (cron, a GitHub Action or a cloud scheduler). Re-scrape open RFQs until they close so status stays current.
- **Official bulk files:** get DIBBS vendor credentials (CAGE plus SAM) and switch to the Acquisition Downloads files. One file a day replaces about 30 page requests, with more fields and less breakage. Keep the HTML scraper as a fallback.
- **Backfill:** find how far back the date URLs go and do a one-time load of all available history.
- **Award history:** scrape the public DIBBS Awards pages (by NSN or award date) and join them to RFQs. "What did this NSN last sell for, and to whom" is the strongest feature for pricing a quote.
- **Detail pages:** pull the package page or PDF for delivery terms, FOB, destination, required approved sources (CAGE/part number) and quantity breaks.
- **Politeness and resilience:** a global rate limit, jittered backoff, a clear User-Agent, a circuit breaker when DIBBS is down, and incremental resume (skip pages already saved).
- **Change detection:** alert when a day parses 0 rows or field fill rates drop, which signals a DIBBS layout change. Archive raw HTML for replay.

### Storage and API

- **Database:** Postgres for concurrent users, plus full-text search on nomenclature (`tsvector`) and trigram search on NSN and part number. Add indexes on `return_by`, `fsc`, `status` and `set_aside`.
- **Schema:** separate `solicitations`, `lines` and `awards` tables. Keep a status history table (opened, amended, cancelled, awarded).
- **Validation:** check every API input at the boundary (zod) and use parameterised SQL only. Paginate with cursors.
- **Caching:** cache facet counts, refreshed after each scrape.

### Product

- **Accounts and saved searches:** saved searches by FSC, NSN list or keyword, with email or Slack alerts for new matches and "closing in 48 h" digests.
- **Workflow:** a watchlist and pipeline (reviewing → quoting → submitted → won or lost), plus notes per RFQ.
- **Ranking:** score each RFQ by fit (the vendor's FSCs and past wins), quantity, time left, set-aside eligibility and award price history.
- **Exports:** CSV/Excel export and DIBBS batch-quote file generation.

### Operations

- **Deployment:** containerize the app. Run the scraper as a separate scheduled job with an HTTP health check.
- **Monitoring:** rows per day, scrape duration, error rate and the age of the last successful scrape. Page someone when no new data arrives on a weekday.
- **CI:** type check, unit tests and a fixture-based parser test. Add a weekly live smoke test against DIBBS that catches layout changes early.
- **Compliance:** the data is public, but respect DIBBS terms and rate limits, and quote submission stays on DIBBS. Never store vendor DIBBS credentials in plain text; use a secrets manager.
