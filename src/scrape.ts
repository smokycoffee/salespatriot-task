// Usage: node src/scrape.ts [days=3 | MM-DD-YYYY ...] — pulls the newest N issue dates (or the given dates) into data/dibbs.db.
import { mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fetchDay, issueDates } from './dibbs.ts';

const args = process.argv.slice(2);
const concurrency = Number(process.env.CONCURRENCY ?? 3); // days fetched at once; DIBBS starts dropping connections above ~5
mkdirSync('data', { recursive: true });
const db = new DatabaseSync('data/dibbs.db');
// WAL + busy timeout so several scraper processes can write the same file.
db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 60000');
db.exec(`CREATE TABLE IF NOT EXISTS rfqs (
  solicitation TEXT NOT NULL,
  pr_number TEXT NOT NULL,
  nsn TEXT NOT NULL,
  fsc TEXT,
  nomenclature TEXT NOT NULL,
  qty INTEGER,
  issued TEXT NOT NULL,
  return_by TEXT NOT NULL,
  status TEXT NOT NULL,
  set_aside TEXT,
  fast_award INTEGER NOT NULL,
  mil_spec INTEGER NOT NULL,
  tech_docs TEXT NOT NULL,
  pdf_url TEXT,
  package_url TEXT NOT NULL,
  scraped_at TEXT NOT NULL,
  PRIMARY KEY (solicitation, pr_number, nsn) -- first-article / testing sub-lines share a PR
)`);
// Re-running a day refreshes status (e.g. Open -> Removed) instead of duplicating rows.
const upsert = db.prepare(`INSERT INTO rfqs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT (solicitation, pr_number, nsn) DO UPDATE SET status = excluded.status, return_by = excluded.return_by,
  qty = excluded.qty, set_aside = excluded.set_aside, fast_award = excluded.fast_award, scraped_at = excluded.scraped_at`);

const dates = args.some((a) => a.includes('-')) ? args : (await issueDates()).slice(0, Number(args[0] ?? 3));
console.log(`Scraping issue dates: ${dates.join(', ')}`);

// One session per day so days page in parallel without sharing ASP.NET view state.
const queue = [...dates];
await Promise.all(Array.from({ length: concurrency }, async () => {
  for (let d; (d = queue.shift()); ) await saveDay(d);
}));

async function saveDay(d: string) {
  const rows = await fetchDay(d, (page, n) => console.log(`${d} page ${page}: ${n} rows`));
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  for (const r of rows) {
    upsert.run(r.solicitation, r.prNumber, r.nsn, r.fsc, r.nomenclature, r.qty, r.issued, r.returnBy, r.status,
      r.setAside, Number(r.fastAward), Number(r.milSpec), r.techDocs, r.pdfUrl, r.packageUrl, now);
  }
  db.exec('COMMIT');
  console.log(`${d}: saved ${rows.length} rows`);
}

const { n } = db.prepare('SELECT COUNT(*) AS n FROM rfqs').get() as { n: number };
console.log(`Done. ${n} RFQ lines in data/dibbs.db`);
