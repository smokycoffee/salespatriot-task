---
name: SalesPatriot DIBBS Solicitation Browser
description: Open DLA RFQs read like an equipment data plate, where only the deadline signals.
colors:
  ground: "oklch(0.928 0.006 240)"
  plate: "oklch(0.968 0.004 240)"
  plate-sunk: "oklch(0.948 0.005 240)"
  rule: "oklch(0.83 0.008 240)"
  rule-strong: "oklch(0.68 0.01 240)"
  ink: "oklch(0.23 0.014 250)"
  ink-2: "oklch(0.40 0.013 250)"
  ink-3: "oklch(0.49 0.012 250)"
  on-ink: "oklch(0.96 0.004 240)"
  signal: "oklch(0.62 0.205 33)"
  signal-ink: "oklch(0.51 0.19 30)"
  focus: "oklch(0.45 0.16 250)"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  body-dense:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  control:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
  label:
    fontFamily: "Barlow Semi Condensed, Barlow, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.09em"
  code:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.86em"
    fontWeight: 400
    letterSpacing: "0.01em"
    fontFeature: "tnum, zero"
rounded:
  mark: "2px"
  plate: "3px"
  track: "9px"
  sheet: "10px"
spacing:
  xxs: "4px"
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  xxl: "20px"
  xxxl: "24px"
components:
  plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
  field:
    textColor: "{colors.ink}"
    padding: "16px 20px 18px"
  field-hover:
    backgroundColor: "{colors.plate-sunk}"
  field-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  button:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.plate}"
    padding: "7px 12px"
  button-hover:
    backgroundColor: "{colors.plate-sunk}"
  button-quiet:
    textColor: "{colors.ink-2}"
    padding: "4px 0"
  segmented-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.control}"
    padding: "6px 4px"
  input:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "6px 8px"
  search:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.plate}"
    padding: "11px 12px"
  stamp:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.mark}"
    padding: "4px 6px 4px 9px"
  tag:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.mark}"
    padding: "2px 6px"
  brand-mark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.mark}"
    padding: "5px 8px 4px"
  table-header:
    backgroundColor: "{colors.plate-sunk}"
    textColor: "{colors.ink-3}"
    typography: "{typography.label}"
    height: "36px"
  deadline-gauge:
    backgroundColor: "{colors.rule}"
    rounded: "{rounded.mark}"
    height: "3px"
    width: "112px"
  deadline-gauge-urgent:
    backgroundColor: "{colors.signal}"
---

# Design System: SalesPatriot DIBBS Solicitation Browser

## Overview

**Creative North Star: "The Equipment Data Plate"**

The interface reads like a MIL-STD-130 identification plate at scale: a satin aluminium ground, etched near-black ink, hairline engraved rules, and small letterspaced caps naming each field above its value. Every surface is a plate; every datum is a labeled field. Codes (NSN, solicitation, FSC) are set in a measured mono so they read as stamped identifiers, not prose.

Density is high and operational. The page is a working instrument for triaging hundreds of RFQs, so hierarchy comes from scale contrast and weight, not from colour or chrome. Colour is almost absent: one cool grey family carries the whole interface, and a single safety orange-red appears only where a deadline is close.

Selection does not add chrome; it inverts. A chosen field, segment, FSC row or active filter becomes an ink plate with aluminium text, the way a stamped plate reads. The world rejects the SaaS card dashboard: no purple accent, no pill soup, no floating cards.

**Key Characteristics:**
- Cool aluminium ground, never cream; ink is near-black blue-grey.
- Labels are small letterspaced caps above their values.
- Codes in Geist Mono with tabular, slashed-zero figures.
- One signal colour, reserved for deadline urgency.
- Selection is a full ink inversion, not a highlight or outline.
- Near-square corners (2-3px) and hairline 1px rules throughout.

## Colors

A single cool blue-grey family from aluminium to ink, plus one safety orange-red that only deadlines may use.

### Primary
- **Etched Ink** (ink): text, and the fill of every selected or stamped element (pressed summary field, checked segment, active filter stamp, brand mark, code block, switch track on).
- **Safety Signal** (signal): the deadline gauge fill when a return-by date is two days away or less. Nothing else.
- **Signal Ink** (signal-ink): the text form of the signal, for urgent deadline text and the "Closing in 48 h" count.

### Neutral
- **Satin Aluminium** (ground): the page background, behind all plates.
- **Plate Face** (plate): the face of every plate, input, button and table.
- **Sunk Plate** (plate-sunk): hover wash on rows, fields and buttons; the table header band.
- **Hairline Rule** (rule): row dividers, field separators, gauge track, skeleton base.
- **Engraved Edge** (rule-strong): plate, input and button borders; switch track off.
- **Ink 2** (ink-2): secondary text (FSC names, item meta, quiet buttons).
- **Ink 3** (ink-3): field labels, hints, placeholders, tertiary metadata.
- **Aluminium Text** (on-ink): text on ink-inverted elements.
- **Focus Blue** (focus): the 2px focus outline only.

### Named Rules
**The Deadline Glows Rule.** The signal colours (signal, signal-ink) mean "this closes soon" and nothing else. No brand accent, no links, no errors, no hover states in orange.

**The Stamped Inversion Rule.** A selected state is an ink fill with aluminium text. Never a tinted background, coloured border or check-badge.

## Typography

**Display Font:** Barlow Semi Condensed (with Barlow, system-ui)
**Body Font:** Barlow (with system-ui)
**Label/Mono Font:** Barlow Semi Condensed for labels and controls; Geist Mono for codes

**Character:** An industrial grotesk family in two widths: the semi-condensed cut does the engraving (labels, counts, controls, headings), the regular width carries reading text. Geist Mono marks anything that is an identifier.

### Hierarchy
- **Display** (600, 44px, 0.95; 30px under 860px): summary-plate counts only, tabular figures.
- **Headline** (600, 22px, 1.1; 19px under 860px): the masthead title.
- **Title** (600, 20px, 1.2): state notices; the filter sheet heading uses 18px.
- **Body** (400, 15px, 1.45): base text; notice copy capped at 60ch.
- **Body Dense** (400, 14px): table cells, filter options, result line; meta lines drop to 12-13px.
- **Control** (600, 14px, 0.02em): buttons, segments (13px), stamps (12.5px, 0.03em).
- **Label** (600, 11.5px, 0.09em, uppercase): field labels, table headers, the sort label; tags use 0.06em.
- **Code** (Geist Mono, 0.86em, 0.01em, tabular + slashed zero): solicitation numbers, NSNs, FSC codes, keyboard hints.

### Named Rules
**The Label Over Value Rule.** Every datum is named by a small letterspaced caps label sitting directly above it. The label names the field; it is never a decorative kicker over a heading.

**The Identifier Is Mono Rule.** Anything a user would copy into DIBBS (NSN, solicitation, FSC code) is set in Geist Mono; counts and quantities use tabular Barlow figures instead.

## Layout

A centered sheet up to 1560px wide with 24px side gutters (16px under 860px). Under a thin masthead, one full-width summary plate splits into four fields (three equal plus a 1.5fr Top FSCs field), separated by hairline rules. Below it, a two-column workspace: a 272px filter rail (224px under 1400px) and a fluid results column, 20px apart.

Filter groups stack in the rail, each a field label, a one-line hint, then controls, divided by hairline rules with 16px vertical padding. The results column runs search, active stamps, a result line and the table.

Responsive behaviour steps down rather than squeezing: under 1520px the NSN column folds beneath the item; under 1180px the summary wraps to three fields with Top FSCs spanning a row, the rail becomes a right-hand sheet behind a Filters button; under 860px the sheet rises from the bottom, summary notes drop, and each table row becomes its own stacked plate (solicitation and deadline on top, item, then a meta line).

Spacing runs on a tight 4/6/8/10/12/16/20/24px rhythm; 10px is the default gap between a control and its label, 16-20px the padding inside fields.

## Elevation & Depth

Depth is engraved, not lifted. Plates, buttons, the search box and the table carry one etch: a 1px inner highlight on the top edge and a hairline drop beneath, enough to read as a pressed metal plate sitting on the aluminium ground, never as a floating card. Hover and selection change fill, never shadow. The only element that truly floats is the filter sheet, with a broad soft shadow and a dimmed backdrop.

### Shadow Vocabulary
- **Etch** (`box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.7), 0 1px 0 oklch(0.5 0.01 240 / 0.12), 0 1px 3px oklch(0.3 0.01 240 / 0.06)`): every plate, button, search box, table and mobile row plate at rest.
- **Sheet float** (`box-shadow: -8px 0 32px oklch(0.2 0.01 250 / 0.18)`, `0 -8px 32px` from below on narrow screens): the filter sheet only, with backdrop `oklch(0.2 0.01 250 / 0.35)`.

### Named Rules
**The One Float Rule.** Only the filter sheet leaves the plate. Everything else stays etched into the surface; no hover lift, no card shadows.

## Shapes

Near-square, machined forms. Plates, inputs, buttons, segmented controls and the table use a 3px corner; small stamped marks (stamps, tags, brand mark, kbd, gauge, row-hover chips) use 2px. Borders are 1px hairlines: the stronger engraved edge around plates and controls, the lighter rule between rows and fields. Rounded forms are limited to mechanisms: the switch track and its thumb, the count pill, and the 10px top corners of the bottom sheet. Fast-award tags use a dashed border; the empty-results notice uses a dashed plate edge.

## Components

### Buttons
Machined and flat: a plate-faced key that darkens on hover and presses 1px on click.
- **Shape:** near-square (3px), 1px engraved edge, etch shadow.
- **Primary:** plate face, ink text, semi-condensed 600 14px, 7px 12px padding; icons sit 6px from the label.
- **Hover / Focus:** sunk-plate fill and an ink-3 edge over 160ms; 2px focus-blue outline offset 2px; active translates down 1px.
- **Quiet:** borderless underlined text in ink-2 (13px), underline in the engraved-edge colour, turning ink on hover. Used for Clear all and secondary notice actions.
- **Disabled:** 45% opacity, not-allowed cursor.

### Chips
- **Stamps (active filters):** ink fill, aluminium text, 2px corners, semi-condensed 600 12.5px; a 12px close icon at 70% opacity, full on hover. Each one removes its filter.
- **Tags (set-aside, Fast):** outlined in ink-2, 2px corners, uppercase label type at 0.06em; Fast uses a dashed border.

### Cards / Containers
- **Corner Style:** 3px.
- **Background:** plate face on the aluminium ground.
- **Shadow Strategy:** the Etch (see Elevation & Depth).
- **Border:** 1px engraved edge; internal divisions are 1px hairline rules.
- **Internal Padding:** 16px 20px 18px for summary fields; 12px 14px for mobile row plates; 40px 32px for state notices.

### Inputs / Fields
- **Style:** plate face, 1px engraved edge, 3px corners, 6px 8px padding at 14px; tabular figures. The search box is the large form: 16px text, 11px vertical padding, search icon and a `/` key hint in mono.
- **Focus:** the border goes transparent and a 2px focus-blue outline sits inset by 1px.
- **Segmented control:** equal cells divided by hairlines in a 3px engraved frame; the checked cell inverts to ink.
- **Switch:** 30x18px track, engraved-edge grey off, ink on; a plate-coloured thumb slides 12px.
- **Disabled:** 45% opacity.

### Navigation
There is no nav bar. A thin masthead carries the ink brand mark (semi-condensed 700 13px, 0.14em caps), the 22px title and a 13px ink-3 freshness line, baseline-aligned.

### Summary Plate (signature)
One plate divided into etched fields: label, display-size count, short note. Each field is a button: hover sinks it, pressed inverts the whole field to ink. The Closing count is set in signal ink. The Top FSCs field lists mono code, name and count rows that invert individually when chosen.

### Results Table
Sticky sunk-plate header band in uppercase label type with sort icons at 45% (full when sorted). Rows divide on hairlines, sink on hover over 120ms, and are wholly clickable; the solicitation number is each row's headline identity, with the PR number in 12px ink-3 beneath. While a new result set loads, the table fades to 60%.

### Deadline Gauge (signature)
Each return-by cell stacks the relative deadline text, the date in 12px ink-3, and a 3px bar up to 112px long whose fill length is days left on a 14-day scale. The fill is ink-2; at two days or less the text turns signal ink and the fill turns signal. Past deadlines drop to ink-3 at weight 500.

### States
Loading uses hairline-to-sunk shimmer skeletons (1.4s linear) shaped like counts and rows. Empty and error states are a notice plate with a dashed edge, a 20px title, 60ch copy and actions; the no-data state uses a solid edge and an ink code block for the scrape command.

## Do's and Don'ts

### Do:
- **Do** keep every surface on the aluminium ground with plate faces and 1px engraved edges at 3px corners.
- **Do** name each datum with an 11.5px semi-condensed uppercase label at 0.09em directly above its value.
- **Do** show selection by inverting to ink with aluminium text, over 160-180ms on the standard ease (cubic-bezier(0.16, 1, 0.3, 1)).
- **Do** set NSNs, solicitation numbers and FSC codes in Geist Mono with tabular, slashed-zero figures.
- **Do** honour reduced motion: transitions and the shimmer switch off entirely.

### Don't:
- **Don't** use the signal orange-red for anything but deadline urgency: not for links, errors, brand or hover.
- **Don't** lift elements on hover or give containers floating shadows; only the filter sheet floats.
- **Don't** use warm or cream neutrals; the ground stays cool grey.
- **Don't** introduce pill-shaped buttons, chips or tags; corners stay at 2-3px.
- **Don't** add a second accent hue or tinted selection backgrounds.
