import { handle, today } from "@/lib/db";
import { buildRowsQuery } from "@/lib/query";

export function GET(req: Request) {
  return handle(req, (f, db) => {
    const q = buildRowsQuery(f, today());
    const { n } = db.prepare(q.total.sql).get(...q.total.params) as { n: number };
    return { rows: db.prepare(q.rows.sql).all(...q.rows.params), total: n };
  });
}
