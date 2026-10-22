import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ParamError, parseParams, type Filters } from "./query";

const DB_PATH = process.env.DIBBS_DB ?? path.resolve(/*turbopackIgnore: true*/ process.cwd(), "../data/dibbs.db");

let db: DatabaseSync | undefined;

export class NoDataError extends Error {}

export function getDb(): DatabaseSync {
  if (db) return db;
  if (!existsSync(/*turbopackIgnore: true*/ DB_PATH)) throw new NoDataError();
  const open = new DatabaseSync(/*turbopackIgnore: true*/ DB_PATH, { readOnly: true });
  if (!open.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'rfqs'").get()) {
    open.close();
    throw new NoDataError();
  }
  return (db = open);
}

/** The vendor's "today", in server local time, as yyyy-mm-dd. */
export const today = () => new Date().toLocaleDateString("en-CA");

/** Shared route wrapper: parse params, map known failures to clear JSON errors. */
export function handle(req: Request, body: (f: Filters, db: DatabaseSync) => unknown): Response {
  const params = new URL(req.url).searchParams; // outside the try: Next's prerender bail-out must propagate
  try {
    const f = parseParams(params);
    return Response.json(body(f, getDb()));
  } catch (e) {
    if (e instanceof ParamError) return Response.json({ error: e.message }, { status: 400 });
    if (e instanceof NoDataError) return Response.json({ error: "No data yet. Run `npm run scrape` first.", code: "NO_DATA" }, { status: 503 });
    console.error(e);
    return Response.json({ error: "Something went wrong reading the RFQ database." }, { status: 500 });
  }
}
