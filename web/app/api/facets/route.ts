import { handle, today } from "@/lib/db";
import { addDays, buildWhere, SET_ASIDE_SQL, type Facets } from "@/lib/query";

const counts = (rows: unknown[]) => Object.fromEntries((rows as { k: string; n: number }[]).map((r) => [r.k, r.n]));

export function GET(req: Request) {
  return handle(req, (f, db): Facets => {
    const t = today();
    const all = (sql: string, ...p: (string | number)[]) => db.prepare(sql).all(...p);
    const one = (sql: string, ...p: (string | number)[]) => db.prepare(sql).get(...p) as Record<string, number | string | null>;

    // Summary tiles are global (they ignore the current filters); option counts respect every other filter.
    const latest = one("SELECT max(issued) AS d, max(scraped_at) AS s FROM rfqs");
    const latestIssued = latest.d as string | null;
    const openUpcoming = "status = 'Open' AND return_by >= ?";
    const s = one(
      `SELECT count(*) AS open,
        sum(return_by <= ?) AS closing48,
        sum(issued = ?) AS newLatest
       FROM rfqs WHERE ${openUpcoming}`,
      addDays(t, 2), latestIssued ?? "", t,
    );

    const st = buildWhere(f, t, "status");
    const sa = buildWhere(f, t, "setAside");
    const fs = buildWhere(f, t, "fsc");
    return {
      today: t,
      latestIssued,
      scrapedAt: latest.s as string | null,
      summary: {
        open: Number(s.open ?? 0),
        closing48: Number(s.closing48 ?? 0),
        newLatest: Number(s.newLatest ?? 0),
        topFsc: all(`SELECT fsc, count(*) AS n FROM rfqs WHERE ${openUpcoming} AND fsc IS NOT NULL GROUP BY fsc ORDER BY n DESC LIMIT 3`, t) as Facets["summary"]["topFsc"],
      },
      status: counts(all(`SELECT status AS k, count(*) AS n FROM rfqs ${st.sql} GROUP BY status`, ...st.params)),
      setAside: counts(all(`SELECT ${SET_ASIDE_SQL} AS k, count(*) AS n FROM rfqs ${sa.sql} GROUP BY k`, ...sa.params)),
      fsc: all(`SELECT fsc, count(*) AS n FROM rfqs ${fs.sql ? `${fs.sql} AND` : "WHERE"} fsc IS NOT NULL GROUP BY fsc ORDER BY n DESC, fsc`, ...fs.params) as Facets["fsc"],
    };
  });
}
