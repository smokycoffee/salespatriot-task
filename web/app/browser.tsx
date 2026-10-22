"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { fscName } from "@/lib/fsg";
import {
  DEFAULTS, PAGE_SIZE, ParamError, SET_ASIDES, STATUSES, parseParams, toParams,
  type Facets, type Filters, type Rfq, type SetAside, type Sort,
} from "@/lib/query";

const fmt = new Intl.NumberFormat("en-US");
const day = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);

type Load<T> = { data?: T; error?: string; code?: string; loading: boolean };

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  const body = await res.json().catch(() => ({ error: `The server answered ${res.status}.` }));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `The server answered ${res.status}.`), { code: body.code });
  return body as T;
}

/** Fetches `url` whenever it changes, keeping the previous data on screen while the next one loads. */
function useJson<T>(url: string, retry: number): Load<T> {
  const key = `${url}#${retry}`;
  const [state, setState] = useState<{ key?: string; data?: T; error?: string; code?: string }>({});
  useEffect(() => {
    const ctrl = new AbortController();
    getJson<T>(url, ctrl.signal).then(
      (data) => setState({ key, data }),
      (e: Error & { code?: string }) => { if (!ctrl.signal.aborted) setState((s) => ({ key, data: s.data, error: e.message, code: e.code })); },
    );
    return () => ctrl.abort();
  }, [url, key]);
  const loading = state.key !== key;
  return { data: state.data, error: loading ? undefined : state.error, code: loading ? undefined : state.code, loading };
}

export default function Browser() {
  const search = useSearchParams();
  const qs = search.toString();
  const { filters, badUrl } = useMemo(() => {
    try { return { filters: parseParams(new URLSearchParams(qs)), badUrl: null }; }
    catch (e) { return { filters: DEFAULTS, badUrl: describeBadParam(e) }; }
  }, [qs]);

  const set = (patch: Partial<Filters>) => {
    const next = toParams({ ...filters, page: 1, ...patch }).toString();
    window.history.replaceState(null, "", next ? `?${next}` : window.location.pathname);
  };
  const clearAll = () => window.history.replaceState(null, "", window.location.pathname);

  const [retry, setRetry] = useState(0);
  const facetQs = toParams({ ...filters, page: 1, sort: DEFAULTS.sort, dir: DEFAULTS.dir }).toString();
  const rows = useJson<{ rows: Rfq[]; total: number }>(`/api/rfqs?${qs}`, retry);
  const facets = useJson<Facets>(`/api/facets?${badUrl ? "" : facetQs}`, retry);

  const sheet = useRef<HTMLDialogElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select");
      if (e.key === "/" && !typing) { e.preventDefault(); searchBox.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const f = facets.data;
  const activeCount = countActive(filters);
  const noData = rows.code === "NO_DATA" || facets.code === "NO_DATA";

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark">SalesPatriot</span>
          <h1>DIBBS Solicitation Browser</h1>
        </div>
        {f?.scrapedAt && (
          <p className="freshness">
            DLA RFQs issued {f.latestIssued && day(f.latestIssued)} and earlier · updated{" "}
            {new Date(f.scrapedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </header>

      {noData ? (
        <NoData />
      ) : (
        <>
          <Summary facets={f} filters={filters} set={set} clearAll={clearAll} />

          <div className="workspace">
            <aside className="rail" aria-label="Filters">
              <FilterPanel filters={filters} facets={f} set={set} />
            </aside>

            <dialog ref={sheet} className="sheet" aria-label="Filters" onClick={(e) => e.target === sheet.current && sheet.current?.close()}>
              <div className="sheet-head">
                <h2>Filters</h2>
                <button className="btn-quiet" onClick={() => sheet.current?.close()}>Show {rows.data ? fmt.format(rows.data.total) : ""} RFQs</button>
              </div>
              <FilterPanel filters={filters} facets={f} set={set} />
            </dialog>

            <main className="results">
              <div className="toolbar">
                <SearchBox ref={searchBox} value={filters.q} onSearch={(q) => set({ q })} />
                <button className="btn filters-btn" onClick={() => sheet.current?.showModal()}>
                  <Icon name="sliders" /> Filters{activeCount > 0 && <span className="count-pill">{activeCount}</span>}
                </button>
              </div>

              <ActiveFilters filters={filters} set={set} clearAll={clearAll} />

              <div className="result-line" aria-live="polite">
                <span>
                  {rows.data ? <><strong>{fmt.format(rows.data.total)}</strong> RFQ lines</> : rows.error || badUrl ? "" : "Loading RFQs"}
                  {rows.loading && rows.data && <span className="working"> · updating</span>}
                </span>
                <SortSelect filters={filters} set={set} />
              </div>

              {badUrl ? (
                <Notice title="This link has a filter we can't read" body={`${badUrl} Reset to start from all open RFQs.`} action={<button className="btn" onClick={clearAll}>Reset filters</button>} />
              ) : rows.error && !rows.loading ? (
                <Notice title="Couldn't load RFQs" body={rows.error} action={<button className="btn" onClick={() => setRetry((n) => n + 1)}>Try again</button>} />
              ) : !rows.data ? (
                <Skeleton />
              ) : rows.data.total === 0 ? (
                <Empty filters={filters} set={set} clearAll={clearAll} />
              ) : (
                <>
                  <RfqTable rows={rows.data.rows} today={f?.today} filters={filters} set={set} stale={rows.loading} />
                  <Pager page={filters.page} total={rows.data.total} set={set} />
                </>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  );
}

const PARAM_LABELS: Record<string, string> = {
  q: "Search", status: "Status", due: "Return by", fsc: "FSC", setaside: "Set-aside", fast: "Fast award", techdocs: "Tech docs",
  milspec: "Mil-Spec", qmin: "Minimum quantity", qmax: "Maximum quantity", from: "Issued from", to: "Issued to", sort: "Sort", dir: "Sort order", page: "Page",
};

/** A bad link, explained in the page's own words rather than the API's. */
function describeBadParam(e: unknown) {
  if (!(e instanceof ParamError) || !e.param) return "Nothing was loaded because a filter in the address isn't valid.";
  if (!PARAM_LABELS[e.param]) return `Nothing was loaded because the address has a setting this page doesn't use (“${e.param}”).`;
  return e.value !== undefined
    ? `Nothing was loaded because ${PARAM_LABELS[e.param]} “${e.value}” isn't an option this page offers.`
    : `Nothing was loaded because ${PARAM_LABELS[e.param]} in the address isn't valid.`;
}

function countActive(f: Filters) {
  const p = toParams({ ...f, q: "", sort: DEFAULTS.sort, dir: DEFAULTS.dir, page: 1 });
  return [...p.keys()].filter((k) => k !== "qmax" || !p.has("qmin")).filter((k) => k !== "to" || !p.has("from")).length;
}

/* ---------- Summary plate ---------- */

function Summary({ facets, filters, set, clearAll }: { facets?: Facets; filters: Filters; set: (p: Partial<Filters>) => void; clearAll: () => void }) {
  const s = facets?.summary;
  const latest = facets?.latestIssued;
  const isDefault = toParams(filters).toString() === "";
  const closingOn = filters.due === "2d";
  const newOn = !!latest && filters.issuedFrom === latest && filters.issuedTo === latest;
  const v = (n?: number) => (n === undefined ? <span className="skel skel-num" /> : fmt.format(n));

  return (
    <section className="plate summary" aria-label="Summary">
      <button className="field" aria-pressed={isDefault} onClick={clearAll}>
        <span className="field-label">Open RFQs</span>
        <span className="field-value">{v(s?.open)}</span>
        <span className="field-note">Quotable, not past return-by</span>
      </button>
      <button className="field field-urgent" aria-pressed={closingOn} onClick={() => set({ due: closingOn ? DEFAULTS.due : "2d", status: ["Open"] })}>
        <span className="field-label">Closing in 48 h</span>
        <span className="field-value">{v(s?.closing48)}</span>
        <span className="field-note">Due by {facets ? day(addDaysLocal(facets.today, 2)) : "…"}</span>
      </button>
      <button
        className="field"
        aria-pressed={newOn}
        disabled={!latest}
        onClick={() => set(newOn ? { issuedFrom: null, issuedTo: null } : { issuedFrom: latest, issuedTo: latest, status: ["Open"] })}
      >
        <span className="field-label">{latest && facets && latest === facets.today ? "New today" : `New on ${latest ? day(latest) : "…"}`}</span>
        <span className="field-value">{v(s?.newLatest)}</span>
        <span className="field-note">Latest DIBBS issue day</span>
      </button>
      <div className="field field-fsc">
        <span className="field-label" id="top-fsc">Top FSCs, open</span>
        <ul aria-labelledby="top-fsc">
          {(s?.topFsc ?? [null, null, null]).map((t, i) => (
            <li key={t?.fsc ?? i}>
              {t ? (
                <button aria-pressed={filters.fsc.length === 1 && filters.fsc[0] === t.fsc} onClick={() => set({ fsc: filters.fsc.length === 1 && filters.fsc[0] === t.fsc ? [] : [t.fsc] })}>
                  <span className="code">{t.fsc}</span>
                  <span className="fsc-name">{fscName(t.fsc)}</span>
                  <span className="num">{fmt.format(t.n)}</span>
                </button>
              ) : <span className="skel skel-line" />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const addDaysLocal = (iso: string, n: number) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10);

/* ---------- Search, sort, active filters ---------- */

function SearchBox({ value, onSearch, ref }: { value: string; onSearch: (q: string) => void; ref: Ref<HTMLInputElement> }) {
  const [text, setText] = useState(value);
  // Follow the URL when it changes elsewhere (a removed stamp, Clear all), without clobbering what is being typed.
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); if (text.trim() !== value) setText(value); }
  const latest = useRef(onSearch);
  useEffect(() => { latest.current = onSearch; });
  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => latest.current(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text, value]);

  return (
    <label className="search">
      <Icon name="search" />
      <span className="sr-only">Search RFQs</span>
      <input
        ref={ref}
        type="search"
        value={text}
        maxLength={80}
        placeholder="NSN, solicitation or item"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setText("")}
        autoComplete="off"
        spellCheck={false}
      />
      {text ? (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setText("")}><Icon name="x" /></button>
      ) : <kbd aria-hidden="true">/</kbd>}
    </label>
  );
}

const SORT_LABELS: Record<Sort, string> = {
  return_by: "Return by", issued: "Issued", qty: "Quantity", solicitation: "Solicitation", nsn: "NSN", fsc: "FSC", nomenclature: "Item",
};

function SortSelect({ filters, set }: { filters: Filters; set: (p: Partial<Filters>) => void }) {
  return (
    <label className="sort-select">
      <span>Sort</span>
      <select
        value={`${filters.sort}:${filters.dir}`}
        onChange={(e) => { const [sort, dir] = e.target.value.split(":"); set({ sort: sort as Sort, dir: dir as "asc" | "desc" }); }}
      >
        <option value="return_by:asc">Return by, soonest</option>
        <option value="return_by:desc">Return by, latest</option>
        <option value="issued:desc">Issued, newest</option>
        <option value="qty:desc">Quantity, largest</option>
        <option value="qty:asc">Quantity, smallest</option>
        {!["return_by:asc", "return_by:desc", "issued:desc", "qty:desc", "qty:asc"].includes(`${filters.sort}:${filters.dir}`) && (
          <option value={`${filters.sort}:${filters.dir}`}>{SORT_LABELS[filters.sort]}, {filters.dir === "asc" ? "A–Z" : "Z–A"}</option>
        )}
      </select>
    </label>
  );
}

const DUE_LABEL = { "2d": "Due in 48 h", "7d": "Due in 7 days", "14d": "Due in 14 days", upcoming: "", all: "Including past due" };

function ActiveFilters({ filters: f, set, clearAll }: { filters: Filters; set: (p: Partial<Filters>) => void; clearAll: () => void }) {
  const stamps: { label: string; clear: Partial<Filters> }[] = [];
  if (f.q) stamps.push({ label: `“${f.q}”`, clear: { q: "" } });
  if (f.status.join() !== "Open") stamps.push({ label: f.status.length ? f.status.join(", ") : "Any status", clear: { status: DEFAULTS.status } });
  if (f.due !== "upcoming") stamps.push({ label: DUE_LABEL[f.due], clear: { due: "upcoming" } });
  for (const c of f.fsc) stamps.push({ label: `FSC ${c}`, clear: { fsc: f.fsc.filter((x) => x !== c) } });
  for (const s of f.setAside) stamps.push({ label: SET_ASIDES[s], clear: { setAside: f.setAside.filter((x) => x !== s) } });
  if (f.fast) stamps.push({ label: "Fast award", clear: { fast: false } });
  if (f.techDocs !== "any") stamps.push({ label: f.techDocs === "none" ? "No tech docs" : "Tech docs", clear: { techDocs: "any" } });
  if (f.milSpec !== "any") stamps.push({ label: f.milSpec === "exclude" ? "No Mil-Spec" : "Mil-Spec only", clear: { milSpec: "any" } });
  if (f.qtyMin !== null || f.qtyMax !== null) stamps.push({ label: `Qty ${f.qtyMin ?? 0}–${f.qtyMax ?? "any"}`, clear: { qtyMin: null, qtyMax: null } });
  if (f.issuedFrom || f.issuedTo) {
    const label = f.issuedFrom === f.issuedTo ? `Issued ${day(f.issuedFrom!)}` : `Issued ${f.issuedFrom ? day(f.issuedFrom) : "…"}–${f.issuedTo ? day(f.issuedTo) : "now"}`;
    stamps.push({ label, clear: { issuedFrom: null, issuedTo: null } });
  }
  if (!stamps.length) return null;

  return (
    <div className="stamps" aria-label="Active filters">
      {stamps.map((s) => (
        <button key={s.label} className="stamp" onClick={() => set(s.clear)} aria-label={`Remove filter: ${s.label}`}>
          {s.label} <Icon name="x" />
        </button>
      ))}
      <button className="btn-quiet clear-all" onClick={clearAll}>Clear all</button>
    </div>
  );
}

/* ---------- Filter panel ---------- */

function FilterPanel({ filters: f, facets, set }: { filters: Filters; facets?: Facets; set: (p: Partial<Filters>) => void }) {
  const uid = useId();
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const past = f.due === "all";

  return (
    <div className="filters">
      <Group label="Return by" hint="Deadline decides what to work first">
        <Segmented
          name="due"
          value={past ? "" : f.due}
          options={[["2d", "48 h"], ["7d", "7 d"], ["14d", "14 d"], ["upcoming", "Any"]]}
          onChange={(due) => set({ due: due as Filters["due"] })}
          disabled={past}
        />
        <label className="check small">
          <input type="checkbox" checked={past} onChange={() => set({ due: past ? "upcoming" : "all" })} />
          Include past return-by dates
        </label>
      </Group>

      <Group label="Set-aside" hint="Only what you're eligible to win">
        {(Object.keys(SET_ASIDES) as SetAside[]).map((k) => (
          <Check key={k} checked={f.setAside.includes(k)} onChange={() => set({ setAside: toggle(f.setAside, k) })} label={SET_ASIDES[k]} count={facets?.setAside[k] ?? (facets ? 0 : undefined)} />
        ))}
      </Group>

      <FscPicker selected={f.fsc} options={facets?.fsc} onChange={(fsc) => set({ fsc })} />

      <Group label="Quick wins">
        <label className="switch">
          <input type="checkbox" role="switch" checked={f.fast} onChange={() => set({ fast: !f.fast })} />
          <span className="switch-track" aria-hidden="true" />
          Fast award only
        </label>
        <p className="hint">Micro-purchases DLA can award before the return date.</p>
      </Group>

      <Group label="Paperwork" hint="Capability and documentation burden">
        <span className="sub-label" id={`${uid}-td`}>Tech docs</span>
        <Segmented name="techdocs" labelledBy={`${uid}-td`} value={f.techDocs} options={[["any", "Any"], ["none", "None"], ["docs", "Required"]]} onChange={(v) => set({ techDocs: v as Filters["techDocs"] })} />
        <span className="sub-label" id={`${uid}-ms`}>Mil-Spec</span>
        <Segmented name="milspec" labelledBy={`${uid}-ms`} value={f.milSpec} options={[["any", "Any"], ["exclude", "Exclude"], ["only", "Only"]]} onChange={(v) => set({ milSpec: v as Filters["milSpec"] })} />
      </Group>

      <Group label="Quantity">
        <div className="range">
          <NumberInput label="Min" value={f.qtyMin} onCommit={(qtyMin) => set({ qtyMin })} />
          <span aria-hidden="true">to</span>
          <NumberInput label="Max" value={f.qtyMax} onCommit={(qtyMax) => set({ qtyMax })} />
        </div>
      </Group>

      <Group label="Issued">
        <div className="range">
          <label className="mini"><span className="sr-only">Issued from</span>
            <input type="date" value={f.issuedFrom ?? ""} max={f.issuedTo ?? facets?.today} onChange={(e) => set({ issuedFrom: e.target.value || null })} />
          </label>
          <span aria-hidden="true">to</span>
          <label className="mini"><span className="sr-only">Issued to</span>
            <input type="date" value={f.issuedTo ?? ""} min={f.issuedFrom ?? undefined} max={facets?.today} onChange={(e) => set({ issuedTo: e.target.value || null })} />
          </label>
        </div>
      </Group>

      <Group label="Status" hint="Only Open RFQs can be quoted">
        {STATUSES.map((s) => (
          <Check
            key={s}
            checked={f.status.length === 0 || f.status.includes(s)}
            onChange={() => {
              const base = f.status.length ? f.status : [...STATUSES];
              const next = toggle(base, s);
              set({ status: next.length === STATUSES.length ? [] : next.length ? next : ["Open"] });
            }}
            label={s}
            count={facets?.status[s] ?? (facets ? 0 : undefined)}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="group">
      <legend className="field-label">{label}</legend>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: ReactNode; count?: number }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="check-label">{label}</span>
      {count !== undefined && <span className={`num ${count === 0 ? "zero" : ""}`}>{fmt.format(count)}</span>}
    </label>
  );
}

function Segmented({ name, value, options, onChange, disabled, labelledBy }: {
  name: string; value: string; options: [string, string][]; onChange: (v: string) => void; disabled?: boolean; labelledBy?: string;
}) {
  // The rail and the mobile sheet both render the panel, so radio names must be unique per instance.
  const group = `${name}-${useId()}`;
  return (
    <div className="segmented" role="radiogroup" aria-labelledby={labelledBy} aria-disabled={disabled}>
      {options.map(([v, label]) => (
        <label key={v}>
          <input type="radio" name={group} value={v} checked={value === v} onChange={() => onChange(v)} disabled={disabled} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function NumberInput({ label, value, onCommit }: { label: string; value: number | null; onCommit: (v: number | null) => void }) {
  const [text, setText] = useState(value?.toString() ?? "");
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); setText(value?.toString() ?? ""); }
  const commit = () => {
    const n = text.trim() === "" ? null : Math.max(0, Math.floor(Number(text)));
    if (n === null || Number.isFinite(n)) { if (n !== value) onCommit(n); } else setText(value?.toString() ?? "");
  };
  return (
    <label className="mini">
      <span className="sr-only">{label} quantity</span>
      <input inputMode="numeric" placeholder={label} value={text} onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ""))} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />
    </label>
  );
}

function FscPicker({ selected, options, onChange }: { selected: string[]; options?: { fsc: string; n: number }[]; onChange: (v: string[]) => void }) {
  const [find, setFind] = useState("");
  const list = useMemo(() => {
    const all = options ?? [];
    const counts = new Map(all.map((o) => [o.fsc, o.n]));
    const picked = selected.map((fsc) => ({ fsc, n: counts.get(fsc) ?? 0 }));
    const needle = find.trim().toLowerCase();
    const rest = all.filter((o) => !selected.includes(o.fsc) && (!needle || o.fsc.startsWith(needle) || fscName(o.fsc).toLowerCase().includes(needle)));
    return { picked, rest };
  }, [options, selected, find]);

  return (
    <fieldset className="group">
      <legend className="field-label">Supply class (FSC)</legend>
      <p className="hint">Narrow to the classes you supply</p>
      <input className="fsc-find" type="search" placeholder="Code or group, e.g. 53 or valves" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Find a supply class" />
      <div className="fsc-list">
        {list.picked.map((o) => (
          <FscRow key={o.fsc} o={o} checked onChange={() => onChange(selected.filter((x) => x !== o.fsc))} />
        ))}
        {list.rest.map((o) => (
          <FscRow key={o.fsc} o={o} checked={false} onChange={() => onChange([...selected, o.fsc])} />
        ))}
        {options && !list.picked.length && !list.rest.length && <p className="hint">{find ? `No supply class matches “${find}”.` : "No supply classes in these results."}</p>}
        {!options && Array.from({ length: 6 }, (_, i) => <span key={i} className="skel skel-line" />)}
      </div>
      {selected.length > 0 && <button className="btn-quiet" onClick={() => onChange([])}>Clear {selected.length} selected</button>}
    </fieldset>
  );
}

function FscRow({ o, checked, onChange }: { o: { fsc: string; n: number }; checked: boolean; onChange: () => void }) {
  return (
    <Check checked={checked} onChange={onChange} count={o.n} label={<><span className="code">{o.fsc}</span> <span className="fsc-name">{fscName(o.fsc)}</span></>} />
  );
}

/* ---------- Table ---------- */

const COLUMNS: { key: Sort | null; label: string; className?: string }[] = [
  { key: "solicitation", label: "Solicitation" },
  { key: "nsn", label: "NSN" },
  { key: "nomenclature", label: "Item" },
  { key: "qty", label: "Qty", className: "right" },
  { key: "fsc", label: "FSC" },
  { key: null, label: "Set-aside" },
  { key: null, label: "Award" },
  { key: "issued", label: "Issued" },
  { key: "return_by", label: "Return by" },
  { key: null, label: "PDF", className: "center" },
];

function RfqTable({ rows, today, filters, set, stale }: { rows: Rfq[]; today?: string; filters: Filters; set: (p: Partial<Filters>) => void; stale: boolean }) {
  const sortBy = (key: Sort) =>
    set({ sort: key, dir: filters.sort === key ? (filters.dir === "asc" ? "desc" : "asc") : key === "issued" || key === "qty" ? "desc" : "asc", page: 1 });

  return (
    <div className={`table-wrap ${stale ? "stale" : ""}`}>
      <table className="rfqs">
        <caption className="sr-only">RFQ lines. Selecting a row opens its DIBBS page in a new tab.</caption>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.label} scope="col" className={c.className} aria-sort={c.key && filters.sort === c.key ? (filters.dir === "asc" ? "ascending" : "descending") : undefined}>
                {c.key ? (
                  <button className="th-sort" onClick={() => sortBy(c.key!)}>
                    {c.label}
                    <Icon name={filters.sort === c.key ? (filters.dir === "asc" ? "up" : "down") : "updown"} />
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.solicitation}|${r.pr_number}|${r.nsn}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a") || window.getSelection()?.toString()) return;
                window.open(r.package_url, "_blank", "noopener");
              }}
            >
              <td className="c-sol">
                <a href={r.package_url} target="_blank" rel="noopener noreferrer" className="code sol">
                  {r.solicitation}
                  <span className="sr-only"> (opens DIBBS in a new tab)</span>
                </a>
                <span className="pr">PR {r.pr_number}</span>
              </td>
              <td className="c-nsn code">{r.nsn}</td>
              <td className="c-item">
                <span className="item">{r.nomenclature}</span>
                <span className="item-nsn code">{r.nsn}</span>
                <span className="burden">
                  {r.status !== "Open" && <span className={`status status-${r.status.toLowerCase()}`}>{r.status}</span>}
                  {r.tech_docs.startsWith("Tech Docs") && <span>{r.tech_docs.includes("Spec") ? "Spec/Std docs" : "Tech docs"}</span>}
                  {r.mil_spec === 1 && <span>Mil-Spec</span>}
                </span>
              </td>
              <td className="c-qty right num">{r.qty === null ? "—" : fmt.format(r.qty)}</td>
              <td className="c-fsc">
                {r.fsc ? <><span className="code">{r.fsc}</span><span className="fsc-name">{fscName(r.fsc)}</span></> : <span className="muted">Part no.</span>}
              </td>
              <td className="c-sa">
                {r.set_aside === "unrestricted" ? <span className="muted">Unrestricted</span> : <span className="tag">{SET_ASIDES[r.set_aside]}</span>}
              </td>
              <td className="c-fast">{r.fast_award === 1 ? <span className="tag tag-fast">Fast</span> : <span className="muted" aria-label="Standard">—</span>}</td>
              <td className="c-issued num">{day(r.issued)}</td>
              <td className="c-due"><Due returnBy={r.return_by} today={today} /></td>
              <td className="c-meta">
                <span className="num">Qty {r.qty === null ? "—" : fmt.format(r.qty)}</span>
                {r.fsc && <span><span className="code">{r.fsc}</span> {fscName(r.fsc)}</span>}
                {r.set_aside !== "unrestricted" && <span className="tag">{SET_ASIDES[r.set_aside]}</span>}
                {r.fast_award === 1 && <span className="tag tag-fast">Fast</span>}
                {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="pdf" aria-label={`Solicitation PDF for ${r.solicitation}`}><Icon name="file" /></a>}
              </td>
              <td className="c-pdf center">
                {r.pdf_url ? (
                  <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="pdf" aria-label={`Solicitation PDF for ${r.solicitation}`} title="Open solicitation PDF">
                    <Icon name="file" />
                  </a>
                ) : <span className="muted" title="DIBBS hasn't posted the PDF yet">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "in N days" with a gauge whose length is the time left on a 14-day scale; red at 2 days or fewer. */
function Due({ returnBy, today }: { returnBy: string; today?: string }) {
  if (!today) return <span className="num">{day(returnBy)}</span>;
  const n = daysBetween(today, returnBy);
  const urgent = n >= 0 && n <= 2;
  const text = n < 0 ? `closed ${-n} d ago` : n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
  return (
    <span className={`due ${urgent ? "urgent" : ""} ${n < 0 ? "past" : ""}`}>
      <span className="due-text">{text}</span>
      <span className="due-date num">{day(returnBy, { weekday: "short", month: "short", day: "numeric" })}</span>
      <span className="gauge" aria-hidden="true"><span style={{ inlineSize: `${Math.max(0, Math.min(1, (n + 1) / 15)) * 100}%` }} /></span>
    </span>
  );
}

function Pager({ page, total, set }: { page: number; total: number; set: (p: Partial<Filters>) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const go = (p: number) => { set({ page: p }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  if (pages === 1) return null;
  return (
    <nav className="pager" aria-label="Pages">
      <button className="btn" disabled={page <= 1} onClick={() => go(page - 1)}><Icon name="left" /> Previous</button>
      <span className="num">
        {fmt.format((page - 1) * PAGE_SIZE + 1)}–{fmt.format(Math.min(page * PAGE_SIZE, total))} of {fmt.format(total)}
      </span>
      <button className="btn" disabled={page >= pages} onClick={() => go(page + 1)}>Next <Icon name="right" /></button>
    </nav>
  );
}

/* ---------- States ---------- */

function Skeleton() {
  return (
    <div className="table-wrap skeleton" aria-busy="true" aria-label="Loading RFQs">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="skel-row"><span className="skel" /><span className="skel" /><span className="skel" /><span className="skel" /></div>
      ))}
    </div>
  );
}

function Empty({ filters, set, clearAll }: { filters: Filters; set: (p: Partial<Filters>) => void; clearAll: () => void }) {
  const ways: ReactNode[] = [];
  if (filters.q) ways.push(<button key="q" className="btn" onClick={() => set({ q: "" })}>Search all items, not “{filters.q}”</button>);
  if (filters.due !== "upcoming" && filters.due !== "all") ways.push(<button key="d" className="btn" onClick={() => set({ due: "upcoming" })}>Any return-by date</button>);
  if (filters.fsc.length || filters.setAside.length) ways.push(<button key="f" className="btn" onClick={() => set({ fsc: [], setAside: [] })}>Every FSC and set-aside</button>);
  return (
    <Notice
      title="No RFQs match these filters"
      body="Try loosening one of them. Searching an NSN works with or without dashes."
      action={<>{ways}<button className="btn-quiet" onClick={clearAll}>Clear all filters</button></>}
    />
  );
}

function NoData() {
  return (
    <section className="plate notice nodata">
      <h2>No RFQ data yet</h2>
      <p>The database at <code>data/dibbs.db</code> is missing or empty. From the project root, run:</p>
      <pre><code>npm run scrape</code></pre>
      <p>then reload this page.</p>
    </section>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="notice" role="status">
      <h2>{title}</h2>
      <p>{body}</p>
      {action && <div className="notice-actions">{action}</div>}
    </div>
  );
}

/* ---------- Icons: authored, 16px, 1.5 stroke ---------- */

const PATHS: Record<string, ReactNode> = {
  search: <><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" /></>,
  x: <path d="m4 4 8 8M12 4l-8 8" />,
  file: <><path d="M9.5 1.75H4.25v12.5h7.5V4z" /><path d="M9.5 1.75V4h2.25M6 8h4M6 10.5h4" /></>,
  sliders: <><path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7" /><circle cx="10.5" cy="4.5" r="1.5" /><circle cx="5.5" cy="11.5" r="1.5" /></>,
  up: <path d="m5 9.5 3-3 3 3" />,
  down: <path d="m5 6.5 3 3 3-3" />,
  updown: <path d="m5.5 6 2.5-2.5L10.5 6M5.5 10l2.5 2.5 2.5-2.5" />,
  left: <path d="M9.5 4 5.5 8l4 4" />,
  right: <path d="m6.5 4 4 4-4 4" />,
};

function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg className="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
