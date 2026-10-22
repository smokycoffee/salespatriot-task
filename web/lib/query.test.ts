import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { buildRowsQuery, buildWhere, DEFAULTS, ParamError, parseParams, toParams, type Filters } from "./query.ts";

const TODAY = "2026-10-22";
const parse = (qs: string) => parseParams(new URLSearchParams(qs));

// Same columns as the scraper's rfqs table.
const db = new DatabaseSync(":memory:");
db.exec(`CREATE TABLE rfqs (solicitation TEXT, pr_number TEXT, nsn TEXT, fsc TEXT, nomenclature TEXT, qty INTEGER,
  issued TEXT, return_by TEXT, status TEXT, set_aside TEXT, fast_award INTEGER, mil_spec INTEGER, tech_docs TEXT,
  pdf_url TEXT, package_url TEXT, scraped_at TEXT)`);
const insert = db.prepare("INSERT INTO rfqs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')");
for (const r of [
  ["SPE1C1-27-T-0039", "7018069921", "8475-01-446-2423", "8475", "SHELL, SUBASSEMBLY, FLYE", 10, "2026-10-22", "2026-10-23", "Open", "Small Business Set-Aside", 1, 0, "Tech Docs", "pdf", "pkg1"],
  ["SPE1C1-27-Q-0018", "7018470621", "8455-01-271-3097", "8455", "INSIGNIA, RANK, OFFICER", 1000, "2026-10-21", "2026-10-29", "Open", "Unrestricted/Not Set Aside", 0, 1, "None", null, "pkg2"],
  ["SPE7M1-26-T-9001", "1000000001", "5330-00-123-4567", "5330", "GASKET 50%_OFF", 5, "2026-10-15", "2026-11-04", "Open", "Service Disabled Veteran Owned Small Business (SDVosb) Set-Aside", 0, 0, "", null, "pkg3"],
  ["SPE4A6-26-T-0001", "1000000002", "ABC123", null, "PART NUMBER ITEM", null, "2026-10-14", "2026-10-20", "Open", "Woman Owned Small Business (WOSB) Set-Aside", 0, 0, "None", null, "pkg4"],
  ["SPE4A6-26-T-0002", "1000000003", "4820-00-000-0001", "4820", "VALVE", 2, "2026-10-14", "2026-10-30", "Awarded", "HubZone Set-Aside", 1, 0, "Tech Docs *Spec/Stnd Only", null, "pkg5"],
] as const) insert.run(...r);

function run(f: Filters) {
  const q = buildRowsQuery(f, TODAY);
  const total = (db.prepare(q.total.sql).get(...q.total.params) as { n: number }).n;
  const rows = db.prepare(q.rows.sql).all(...q.rows.params) as { package_url: string; set_aside: string }[];
  return { total, ids: rows.map((r) => r.package_url), rows };
}
const ids = (qs: string) => run(parse(qs)).ids;

test("defaults: open and not yet past return-by, soonest first", () => {
  assert.deepEqual(parse(""), DEFAULTS);
  assert.deepEqual(ids(""), ["pkg1", "pkg2", "pkg3"]);
});

test("search finds NSN with and without dashes, solicitation with and without dashes, PR and nomenclature", () => {
  for (const q of ["8475-01-446-2423", "8475014462423", "8475 01 446 2423", "SPE1C1-27-T-0039", "spe1c127t0039", "7018069921", "flye"]) {
    assert.deepEqual(ids(`q=${encodeURIComponent(q)}`), ["pkg1"], q);
  }
});

test("search treats LIKE wildcards literally", () => {
  assert.deepEqual(ids("q=" + encodeURIComponent("50%_")), ["pkg3"]);
  assert.deepEqual(ids("q=" + encodeURIComponent("S%L")), []); // as a wildcard this would match SHELL
});

test("filters combine with search", () => {
  assert.deepEqual(ids("q=SPE1C1&fast=1"), ["pkg1"]);
  assert.deepEqual(ids("q=SPE1C1&milspec=only"), ["pkg2"]);
  assert.deepEqual(ids("q=SPE1C1&milspec=exclude&techdocs=docs"), ["pkg1"]);
});

test("each filter narrows as expected", () => {
  assert.deepEqual(ids("due=2d"), ["pkg1"]);
  assert.deepEqual(ids("due=7d"), ["pkg1", "pkg2"]);
  assert.deepEqual(ids("due=all"), ["pkg4", "pkg1", "pkg2", "pkg3"]);
  assert.deepEqual(ids("status=all&due=all").length, 5);
  assert.deepEqual(ids("status=Awarded"), ["pkg5"]);
  assert.deepEqual(ids("fsc=8455,5330"), ["pkg2", "pkg3"]);
  assert.deepEqual(ids("setaside=sb,sdvosb"), ["pkg1", "pkg3"]);
  assert.deepEqual(ids("setaside=unrestricted"), ["pkg2"]);
  assert.deepEqual(ids("status=all&due=all&setaside=wosb,hubzone"), ["pkg4", "pkg5"]);
  assert.deepEqual(ids("techdocs=none"), ["pkg2", "pkg3"]);
  assert.deepEqual(ids("qmin=5&qmax=10"), ["pkg1", "pkg3"]);
  assert.deepEqual(ids("from=2026-10-21&to=2026-10-21"), ["pkg2"]);
});

test("set-aside is normalised to short keys in rows", () => {
  assert.deepEqual(run(parse("")).rows.map((r) => r.set_aside), ["sb", "unrestricted", "sdvosb"]);
});

test("sort uses the allowlist and puts empty quantities last", () => {
  assert.deepEqual(ids("sort=qty&dir=desc"), ["pkg2", "pkg1", "pkg3"]);
  assert.deepEqual(ids("status=all&due=all&sort=qty")[4], "pkg4");
  assert.throws(() => parse("sort=qty;DROP TABLE rfqs"), ParamError);
  assert.throws(() => parse("dir=sideways"), ParamError);
});

test("facet where clauses omit only their own dimension", () => {
  const f = parse("status=Awarded&fsc=4820&setaside=hubzone");
  assert.doesNotMatch(buildWhere(f, TODAY, "status").sql, /status IN/);
  assert.match(buildWhere(f, TODAY, "status").sql, /fsc IN/);
  assert.doesNotMatch(buildWhere(f, TODAY, "fsc").sql, /fsc IN/);
});

test("values never reach the SQL text", () => {
  const f = parse("q=" + encodeURIComponent("' OR 1=1 --") + "&fsc=1234&from=2026-01-01");
  const { sql } = buildWhere(f, TODAY);
  assert.doesNotMatch(sql, /OR 1=1|1234|2026-01-01/);
});

test("bad params are rejected with a reason", () => {
  for (const qs of ["status=Pending", "due=3d", "fsc=12", "setaside=8a", "fast=yes", "qmin=-1", "qmin=5&qmax=1", "from=2026-02-30", "from=2026-10-10&to=2026-10-01", "page=0", "limit=10", "q=" + "x".repeat(81)]) {
    assert.throws(() => parse(qs), ParamError, qs);
  }
});

test("paging is 50 rows with an offset", () => {
  const q = buildRowsQuery(parse("page=3"), TODAY).rows;
  assert.match(q.sql, /LIMIT 50 OFFSET \?/);
  assert.equal(q.params.at(-1), 100);
});

test("toParams round-trips and omits defaults", () => {
  assert.equal(toParams(DEFAULTS).toString(), "");
  const qs = "q=gasket&status=all&due=7d&fsc=5330%2C4820&setaside=sb&fast=1&techdocs=none&milspec=exclude&qmin=1&qmax=50&from=2026-10-01&to=2026-10-20&sort=qty&dir=desc&page=2";
  assert.deepEqual(parse(toParams(parse(qs)).toString()), parse(qs));
});
