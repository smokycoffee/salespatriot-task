# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js app in `web/` (App Router, TypeScript), reading the scraper's SQLite file `data/dibbs.db` through `node:sqlite`. The scraper and its tests stay at the repo root on plain Node 24. Visual design decisions: delegated.

## Users

Primary: a small-business DLA supplier. Checks DIBBS every morning, specializes in a few Federal Supply Classes (FSCs), and must know which RFQs they are eligible for (set-asides) and which close soonest. Quotes on DIBBS itself; this page is triage, not the quoting tool.

## Job

Open one page, see the open RFQs worth quoting today, narrow to their FSCs and eligibility in a few clicks, and jump straight to the RFQ's DIBBS page.

## Product facts

- Data: one row per RFQ line, about 15 issue days, roughly 8–18k rows. Status Open / Cancelled / Removed / Awarded; set-aside Unrestricted, Small Business, SDVOSB, HUBZone, WOSB; fast-award, Mil-Spec and tech-docs flags; quantity; issued and return-by dates; a package link and an optional PDF link.
- API contract: `GET /api/rfqs` (search, filters, sort, page → `{ rows, total }`) and `GET /api/facets` (filter option counts). Filtering and paging in SQL, parameterised only, sort from an allowlist, invalid params → 400 with a reason.
- Filter state lives in the URL so views can be shared.
- Judged on UX, speed, filter choices and product sense, not production hardening.

## Terminology

RFQ, solicitation, NSN (National Stock Number), FSC (Federal Supply Class), PR number, set-aside, fast award, return-by date, DIBBS (DLA Internet Bid Board System), DLA (Defense Logistics Agency).

## Accessibility

Must be usable at phone width. Keyboard reachable rows and controls.
