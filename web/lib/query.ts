// Pure query builder shared by the API routes and the page: parses URL params,
// validates them, and turns them into parameterised SQL. No values are ever
// interpolated into SQL; only allowlisted column expressions are.

export const PAGE_SIZE = 50;

export const STATUSES = ["Open", "Cancelled", "Removed", "Awarded"] as const;
export type Status = (typeof STATUSES)[number];

export const SET_ASIDES = {
  unrestricted: "Unrestricted",
  sb: "Small Business",
  sdvosb: "SDVOSB",
  hubzone: "HUBZone",
  wosb: "WOSB",
} as const;
export type SetAside = keyof typeof SET_ASIDES;

// DIBBS spells set-asides as long free text ("Small Business Set-Aside", ...); blank means not set aside.
export const SET_ASIDE_SQL = `CASE
  WHEN set_aside LIKE '%SDVOSB%' THEN 'sdvosb'
  WHEN set_aside LIKE '%WOSB%' THEN 'wosb'
  WHEN set_aside LIKE 'HubZone%' THEN 'hubzone'
  WHEN set_aside LIKE 'Small Business%' THEN 'sb'
  ELSE 'unrestricted' END`;

export const DUE = ["2d", "7d", "14d", "upcoming", "all"] as const;
export type Due = (typeof DUE)[number];
const DUE_DAYS: Record<Due, number | null> = { "2d": 2, "7d": 7, "14d": 14, upcoming: null, all: null };

export const TECH_DOCS = ["any", "none", "docs"] as const;
export const MIL_SPEC = ["any", "exclude", "only"] as const;

const SORTS = {
  return_by: "return_by",
  issued: "issued",
  qty: "qty",
  solicitation: "solicitation",
  nsn: "nsn",
  fsc: "fsc",
  nomenclature: "nomenclature",
} as const;
export type Sort = keyof typeof SORTS;

export type Filters = {
  q: string;
  status: Status[]; // empty = every status
  due: Due;
  fsc: string[];
  setAside: SetAside[];
  fast: boolean;
  techDocs: (typeof TECH_DOCS)[number];
  milSpec: (typeof MIL_SPEC)[number];
  qtyMin: number | null;
  qtyMax: number | null;
  issuedFrom: string | null;
  issuedTo: string | null;
  sort: Sort;
  dir: "asc" | "desc";
  page: number;
};

export const DEFAULTS: Filters = {
  q: "",
  status: ["Open"],
  due: "upcoming",
  fsc: [],
  setAside: [],
  fast: false,
  techDocs: "any",
  milSpec: "any",
  qtyMin: null,
  qtyMax: null,
  issuedFrom: null,
  issuedTo: null,
  sort: "return_by",
  dir: "asc",
  page: 1,
};

const KNOWN = new Set(["q", "status", "due", "fsc", "setaside", "fast", "techdocs", "milspec", "qmin", "qmax", "from", "to", "sort", "dir", "page"]);

export class ParamError extends Error {
  param?: string;
  value?: string;
  constructor(message: string, param?: string, value?: string) {
    super(message);
    this.param = param;
    this.value = value;
  }
}

function oneOf<T extends string>(name: string, value: string, allowed: readonly T[]): T {
  if (!(allowed as readonly string[]).includes(value)) throw new ParamError(`${name} must be one of ${allowed.join(", ")}`, name, value);
  return value as T;
}

function list(value: string | null): string[] {
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

function int(name: string, value: string | null, min: number, max: number): number | null {
  if (value === null || value === "") return null;
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw new ParamError(`${name} must be a whole number from ${min} to ${max}`, name, value);
  return Number(value);
}

function isoDate(name: string, value: string | null): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new ParamError(`${name} must be a date as yyyy-mm-dd`, name, value);
  }
  return value;
}

/** Parse URL params into Filters. Throws ParamError with a human reason on bad input. */
export function parseParams(p: URLSearchParams): Filters {
  for (const key of p.keys()) if (!KNOWN.has(key)) throw new ParamError(`unknown parameter "${key}"`, key);

  const q = (p.get("q") ?? "").trim();
  if (q.length > 80) throw new ParamError("q must be 80 characters or fewer");

  const statusRaw = p.get("status");
  const status = statusRaw === "all" ? [] : statusRaw === null ? DEFAULTS.status : list(statusRaw).map((s) => oneOf("status", s, STATUSES));

  const fsc = list(p.get("fsc"));
  for (const f of fsc) if (!/^\d{4}$/.test(f)) throw new ParamError("fsc must be 4-digit codes, comma separated", "fsc", f);
  if (fsc.length > 50) throw new ParamError("fsc accepts at most 50 codes");

  const fast = p.get("fast");
  if (fast !== null && fast !== "1" && fast !== "0") throw new ParamError("fast must be 1 or 0");

  const f: Filters = {
    q,
    status,
    due: oneOf("due", p.get("due") ?? DEFAULTS.due, DUE),
    fsc,
    setAside: list(p.get("setaside")).map((s) => oneOf("setaside", s, Object.keys(SET_ASIDES) as SetAside[])),
    fast: fast === "1",
    techDocs: oneOf("techdocs", p.get("techdocs") ?? "any", TECH_DOCS),
    milSpec: oneOf("milspec", p.get("milspec") ?? "any", MIL_SPEC),
    qtyMin: int("qmin", p.get("qmin"), 0, 1e9),
    qtyMax: int("qmax", p.get("qmax"), 0, 1e9),
    issuedFrom: isoDate("from", p.get("from")),
    issuedTo: isoDate("to", p.get("to")),
    sort: oneOf("sort", p.get("sort") ?? DEFAULTS.sort, Object.keys(SORTS) as Sort[]),
    dir: oneOf("dir", p.get("dir") ?? DEFAULTS.dir, ["asc", "desc"] as const),
    page: int("page", p.get("page"), 1, 100000) ?? 1,
  };
  if (f.qtyMin !== null && f.qtyMax !== null && f.qtyMin > f.qtyMax) throw new ParamError("qmin must not be greater than qmax");
  if (f.issuedFrom && f.issuedTo && f.issuedFrom > f.issuedTo) throw new ParamError("from must not be after to");
  return f;
}

/** Serialize Filters back to the shortest URL params (defaults omitted). Inverse of parseParams. */
export function toParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.status.join() !== DEFAULTS.status.join()) p.set("status", f.status.length ? f.status.join(",") : "all");
  if (f.due !== DEFAULTS.due) p.set("due", f.due);
  if (f.fsc.length) p.set("fsc", f.fsc.join(","));
  if (f.setAside.length) p.set("setaside", f.setAside.join(","));
  if (f.fast) p.set("fast", "1");
  if (f.techDocs !== "any") p.set("techdocs", f.techDocs);
  if (f.milSpec !== "any") p.set("milspec", f.milSpec);
  if (f.qtyMin !== null) p.set("qmin", String(f.qtyMin));
  if (f.qtyMax !== null) p.set("qmax", String(f.qtyMax));
  if (f.issuedFrom) p.set("from", f.issuedFrom);
  if (f.issuedTo) p.set("to", f.issuedTo);
  if (f.sort !== DEFAULTS.sort) p.set("sort", f.sort);
  if (f.dir !== DEFAULTS.dir) p.set("dir", f.dir);
  if (f.page !== 1) p.set("page", String(f.page));
  return p;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "8475-01-446-2423" and "8475014462423" search the same; also drops spaces. */
export function normalizeCode(q: string): string {
  return q.replace(/[-\s]/g, "").toUpperCase();
}

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

type SqlValue = string | number;
export type Where = { sql: string; params: SqlValue[] };

/** WHERE clause for the filters. `omit` drops one dimension so facets can count its own options. */
export function buildWhere(f: Filters, today: string, omit?: "status" | "fsc" | "setAside"): Where {
  const c: string[] = [];
  const params: SqlValue[] = [];
  const add = (sql: string, ...v: SqlValue[]) => { c.push(sql); params.push(...v); };

  if (f.q) {
    const code = `%${likeEscape(normalizeCode(f.q))}%`;
    add(
      `(replace(nsn, '-', '') LIKE ? ESCAPE '\\' OR replace(solicitation, '-', '') LIKE ? ESCAPE '\\' OR pr_number LIKE ? ESCAPE '\\' OR nomenclature LIKE ? ESCAPE '\\')`,
      code, code, code, `%${likeEscape(f.q)}%`,
    );
  }
  if (omit !== "status" && f.status.length) add(`status IN (${f.status.map(() => "?").join(",")})`, ...f.status);
  if (f.due !== "all") add("return_by >= ?", today);
  const days = DUE_DAYS[f.due];
  if (days !== null) add("return_by <= ?", addDays(today, days));
  if (omit !== "fsc" && f.fsc.length) add(`fsc IN (${f.fsc.map(() => "?").join(",")})`, ...f.fsc);
  if (omit !== "setAside" && f.setAside.length) add(`${SET_ASIDE_SQL} IN (${f.setAside.map(() => "?").join(",")})`, ...f.setAside);
  if (f.fast) c.push("fast_award = 1");
  if (f.techDocs === "none") c.push("tech_docs IN ('None', '')");
  if (f.techDocs === "docs") c.push("tech_docs LIKE 'Tech Docs%'");
  if (f.milSpec === "exclude") c.push("mil_spec = 0");
  if (f.milSpec === "only") c.push("mil_spec = 1");
  if (f.qtyMin !== null) add("qty >= ?", f.qtyMin);
  if (f.qtyMax !== null) add("qty <= ?", f.qtyMax);
  if (f.issuedFrom) add("issued >= ?", f.issuedFrom);
  if (f.issuedTo) add("issued <= ?", f.issuedTo);

  return { sql: c.length ? `WHERE ${c.join(" AND ")}` : "", params };
}

export const ROW_COLUMNS = `solicitation, pr_number, nsn, fsc, nomenclature, qty, issued, return_by, status,
  ${SET_ASIDE_SQL} AS set_aside, fast_award, mil_spec, tech_docs, pdf_url, package_url`;

export function buildRowsQuery(f: Filters, today: string): { rows: Where; total: Where } {
  const w = buildWhere(f, today);
  const dir = f.dir === "desc" ? "DESC" : "ASC";
  return {
    rows: {
      sql: `SELECT ${ROW_COLUMNS} FROM rfqs ${w.sql}
        ORDER BY ${SORTS[f.sort]} ${dir} NULLS LAST, return_by ASC, solicitation ASC, nsn ASC
        LIMIT ${PAGE_SIZE} OFFSET ?`,
      params: [...w.params, (f.page - 1) * PAGE_SIZE],
    },
    total: { sql: `SELECT count(*) AS n FROM rfqs ${w.sql}`, params: w.params },
  };
}

export type Rfq = {
  solicitation: string;
  pr_number: string;
  nsn: string;
  fsc: string | null;
  nomenclature: string;
  qty: number | null;
  issued: string;
  return_by: string;
  status: Status;
  set_aside: SetAside;
  fast_award: 0 | 1;
  mil_spec: 0 | 1;
  tech_docs: string;
  pdf_url: string | null;
  package_url: string;
};

export type Facets = {
  today: string;
  latestIssued: string | null;
  scrapedAt: string | null;
  summary: { open: number; closing48: number; newLatest: number; topFsc: { fsc: string; n: number }[] };
  status: Record<string, number>;
  setAside: Record<string, number>;
  fsc: { fsc: string; n: number }[];
};
