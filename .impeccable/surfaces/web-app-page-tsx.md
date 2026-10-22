---
version: 1
slug: "web-app-page-tsx"
primary_target: "web/app/page.tsx"
related_targets: []
---

# Surface: DIBBS Solicitation Browser (landing page)

Scope: the single page at `/`, mode **Operate**. Audience: a small-business DLA supplier triaging the morning's RFQs. Task: narrow open RFQs to their FSCs and eligibility, sort by deadline, jump to DIBBS. Constraints: API contract in PRODUCT.md, filter state in URL, phone-width usable. Build path: code-led (no image generation available).

## Direction contract

THESIS: The page is an equipment data plate (MIL-STD-130 identification plate) read at scale: every RFQ is a set of labeled, etched fields, and the deadline is the only thing that ever glows. It refuses the category default of a SaaS card dashboard with a purple accent and pill soup.

OWN-WORLD: Satin aluminium ground (cool light grey, never cream), etched near-black ink, hairline engraved rules, field labels in small letterspaced caps above their values, codes (NSN, solicitation) in a measured mono. One signal colour, safety orange-red, reserved for deadline urgency. Selection is a stamped inversion: ink plate, aluminium text. Barlow / Barlow Semi Condensed for UI and labels, Geist Mono for codes.

STORY: The vendor sees how many open RFQs exist, how many close inside 48 hours and what landed today, clicks a field to narrow, picks their FSCs and set-aside, and opens the RFQ on DIBBS from the row.

FIRST VIEWPORT: Thin header plate (product name, data freshness). Below, one full-width summary plate divided into four etched fields (Open, Closing ≤48 h, New on latest issue day, Top FSCs), each a button that filters. Left: filter rail of labeled field groups. Right: search box spanning the column, active-filter stamps with Clear all, result count and the deadline-sorted table. Primary action is the row itself.

FORM: Equipment data plate, candidate 6 of my seven grounded candidates; seed key 174bfee6. Signature interaction: each return-by cell carries a deadline gauge whose length is the days left on a 14-day scale (raised from the labanotation challenger: length is exact duration), turning signal orange at ≤2 days. Raises: from the gate board (competitive), the alert colour is reserved for urgency only and the default order is departure-style deadline ranking; from the type specimen (declined), hierarchy by scale contrast alone in the summary plate; from the metro tiles (declined), active state floods the field with ink, no extra chrome; from the catalog sleeve (declined), the solicitation number is the row's headline identity; from the acetate manual (declined), one elevation rule: only the mobile filter sheet floats.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
