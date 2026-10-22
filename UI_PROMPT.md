# Task

Build the UI for the DIBBS Solicitation Browser: a full-stack web app where a vendor can browse, search and filter recent DLA RFQs, and open each row on its original DIBBS page. The data is already scraped. Read `CLAUDE.md` and `docs/architecture.md` first.

# Goal

A vendor opens one page, sees the open RFQs worth quoting today, narrows them to their categories and eligibility in a few clicks, and jumps straight to DIBBS to quote.

# Clarifications

- The data layer is done: `npm run scrape -- [days | MM-DD-YYYY ...]` fills `data/dibbs.db` (SQLite, table `rfqs`, about 15 days, around 18k rows). Do not change the scraper or schema.
- Judged on UX, speed, filter choices and product sense, not on production hardening.

# Context

- Stack: TypeScript on Node 24, which runs `.ts` natively. SQLite via built-in `node:sqlite`. No dependencies yet. Propose a frontend: either plain HTML/JS served by `node:http` with zero dependencies, or React + Vite. Ask before adding any dependency.
- Input: the `rfqs` table. Primary key `(solicitation, pr_number, nsn)`. One row per RFQ line.
  `solicitation, pr_number, nsn, fsc, nomenclature, qty, issued (yyyy-mm-dd), return_by (yyyy-mm-dd), status (Open/Cancelled/Removed/Awarded), set_aside (Unrestricted/Not Set Aside | Small Business | SDVOSB | HubZone | WOSB ... Set-Aside), fast_award 0/1, mil_spec 0/1, tech_docs ('None' | 'Tech Docs' | 'Tech Docs *Spec/Stnd Only' | ''), pdf_url (nullable), package_url, scraped_at`
- Output:
  - **API:** `GET /api/rfqs` with query params for search, filters, sort and page, returning `{ rows, total }`. Filtering and paging happen in SQL. Add `GET /api/facets` for filter option counts.
  - **Page (also the landing page):**
    - A summary strip at the top: open RFQs, closing in 48 h, new today, and the top FSCs. Each tile filters the table when clicked.
    - Below it, the searchable, filterable table.
- Time: a few hours. Working end to end beats extra features.

# Features

- **Table:**
  - Columns: solicitation, NSN, nomenclature, qty, FSC, set-aside badge, fast-award badge, issued, return-by. Return-by shows "in N days" and is red when 2 days or fewer.
  - Sortable. Return-by ascending is the default.
  - Paged, 50 rows a page.
  - The whole row opens `package_url` in a new tab. A small icon opens `pdf_url` when present.
- **Search:** one box covering NSN (with or without dashes), solicitation (with or without dashes), PR number and nomenclature. Debounced.
- **Filters,** each with a one-line reason in the README:
  - Status, defaulting to Open. Closed RFQs can't be quoted.
  - Return-by window: 48 h, 7 d, 14 d or any. The deadline decides what to work on first.
  - FSC, multi-select with counts. Vendors specialize by supply class.
  - Set-aside: Unrestricted, SB, SDVOSB, HUBZone, WOSB. This is eligibility.
  - Fast award only. These are quick micro-purchase wins.
  - Tech docs / Mil-Spec. This is the capability and paperwork burden.
  - Quantity range.
  - Issued date range.
- Filter state lives in the URL, so views can be shared and survive a reload. Add a "Clear all" control.
- Empty, loading and error states. Must be usable at phone width.

# How to work

1. Propose a plan first: API endpoints, SQL, page layout, then tests. Do not write code until I approve the plan.
2. Save the approved plan as PLAN.md with a checklist.
3. Do one step at a time. Stop after each step so I can review.
4. After each step, run `npm test`.
5. Validate all query params at the API. Use parameterised SQL only. Never interpolate values into SQL; sort columns come from an allowlist.
6. Do not add dependencies without asking. Never weaken a test.

# Done when

- [ ] `npm start` serves the page and API over the existing `data/dibbs.db`
- [ ] Search finds a known row by NSN with and without dashes, and by solicitation
- [ ] Every filter works and combines with search. Counts update.
- [ ] Each row opens its DIBBS package page
- [ ] Edge cases: an empty result shows a clear message, bad query params return 400 with a reason, and a missing DB shows "run `npm run scrape` first"
- [ ] Responses under 100 ms on about 18k rows
- [ ] Tests cover the API query builder, including search normalization, filters and the sort allowlist
- [ ] README explains how to run it, why each filter was chosen, and what's next
