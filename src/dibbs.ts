// DIBBS client: gets past the DoD consent banner, then walks the ASP.NET-paged RFQ grid for one issue date.
const BASE = 'https://www.dibbs.bsm.dla.mil';

export type Rfq = {
  solicitation: string;
  prNumber: string;
  nsn: string;
  fsc: string | null;
  nomenclature: string;
  qty: number | null;
  issued: string; // yyyy-mm-dd
  returnBy: string; // yyyy-mm-dd
  status: string;
  setAside: string | null;
  fastAward: boolean;
  milSpec: boolean;
  techDocs: string;
  pdfUrl: string | null;
  packageUrl: string;
};

const decode = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&raquo;/g, '»').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const isoDate = (mdy: string) => mdy.replace(/^(\d\d)-(\d\d)-(\d{4})$/, '$3-$1-$2');

// Each grid cell is a <span id="..._lblX"> that may hold nested spans, so read to the end of its <td>.
const cell = (row: string, id: string) => row.match(new RegExp(`_${id}"[^>]*>([\\s\\S]*?)</td>`))?.[1] ?? '';

export function parseRows(html: string): Rfq[] {
  return html.split(/_lblRowNum"/).slice(1).map((row) => {
    const nsnCell = cell(row, 'lblNsn');
    const solCell = cell(row, 'lblSolicitation');
    const pr = text(cell(row, 'lblPr')).match(/^(\S*)\s*(?:QTY:\s*([\d,]+))?/)!;
    const nsn = text(nsnCell).replace(/\s*Mil-Spec$/, '');
    // Plain text, not the link: solicitations without a PDF yet have no <a>.
    const solicitation = text(solCell).match(/^[A-Z0-9]{6}-\d{2}-[A-Z]-\d{4}/)?.[0] ?? '';
    const alts = [...row.matchAll(/alt='([^']*)'/g)].map((m) => m[1]);
    return {
      solicitation,
      prNumber: pr[1],
      nsn,
      fsc: /^\d{4}-\d{2}-\d{3}-\d{4}$/.test(nsn) ? nsn.slice(0, 4) : null,
      nomenclature: text(cell(row, 'lblNomenclature')),
      qty: pr[2] ? Number(pr[2].replace(/,/g, '')) : null,
      issued: isoDate(text(cell(row, 'lblIssued'))),
      returnBy: isoDate(text(cell(row, 'lblReturnBy'))),
      status: text(cell(row, 'lblStatus')).replace(/\s*uote$/, ''), // "uote" is the label beside the Q(uote) button image
      setAside: alts.find((a) => /set.?aside/i.test(a)) ?? null,
      fastAward: alts.some((a) => a.startsWith('Fast Award')),
      milSpec: /Mil-Spec/.test(nsnCell),
      techDocs: text(cell(row, 'lblTechnicalDocuments')),
      pdfUrl: solCell.match(/href='([^']*\.PDF)'/i)?.[1] ?? null,
      packageUrl: `${BASE}/rfq/rfqrec.aspx?sn=${solicitation.replace(/-/g, '')}`,
    };
  });
}

// All hidden inputs of the page's form (ASP.NET splits __VIEWSTATE into hundreds of fields).
export function hiddenFields(html: string): [string, string][] {
  return [...html.matchAll(/<input[^>]*type="hidden"[^>]*>/gi)].map(([tag]) => [
    decode(tag.match(/name="([^"]*)"/)?.[1] ?? ''),
    decode(tag.match(/value="([^"]*)"/)?.[1] ?? ''),
  ]);
}

export const hasNextPage = (html: string, page: number) => html.includes(`Page$${page + 1}&#39;`);

class Session {
  cookies = new Map<string, string>();

  async request(path: string, body?: [string, string][]): Promise<Response> {
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(BASE + path, {
          method: body ? 'POST' : 'GET',
          body: body && new URLSearchParams(body),
          headers: { cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
          redirect: 'manual',
          signal: AbortSignal.timeout(90_000),
        });
        for (const c of res.headers.getSetCookie()) {
          const [kv] = c.split(';');
          const i = kv.indexOf('=');
          this.cookies.set(kv.slice(0, i), kv.slice(i + 1));
        }
        if (res.status >= 500) throw new Error(`HTTP ${res.status} for ${path}`);
        return res;
      } catch (err) {
        // DIBBS drops connections now and then; back off and retry the same request.
        if (attempt >= 3) throw err;
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
  }

  async page(path: string, body?: [string, string][]): Promise<string> {
    let res = await this.request(path, body);
    // Any redirect means the consent cookie is missing or expired: accept the banner, then retry once.
    if (res.status >= 300 && res.status < 400) {
      const warn = `/dodwarning.aspx?goto=${encodeURIComponent(path)}`;
      const form = await (await this.request(warn)).text();
      await this.request(warn, [...hiddenFields(form), ['butAgree', 'OK']]);
      res = await this.request(path, body);
    }
    if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.text();
  }
}

// Issue dates DIBBS currently lists, newest first, as MM-DD-YYYY.
export async function issueDates(): Promise<string[]> {
  const html = await new Session().page('/Rfq/RfqDates.aspx?category=issue');
  return [...new Set([...html.matchAll(/Value=(\d\d-\d\d-\d{4})/g)].map((m) => m[1]))];
}

export async function fetchDay(mdy: string, onPage?: (page: number, rows: number) => void): Promise<Rfq[]> {
  const s = new Session();
  const path = `/RFQ/RfqRecs.aspx?category=issue&TypeSrch=dt&Value=${mdy}`;
  let html = await s.page(path);
  const all = parseRows(html);
  onPage?.(1, all.length);
  for (let page = 1; hasNextPage(html, page) && page < 500; page++) {
    const form = hiddenFields(html).filter(([k]) => k !== '__EVENTTARGET' && k !== '__EVENTARGUMENT');
    html = await s.page(path, [...form, ['__EVENTTARGET', 'ctl00$cph1$grdRfqSearch'], ['__EVENTARGUMENT', `Page$${page + 1}`]]);
    const rows = parseRows(html);
    if (!rows.length) throw new Error(`${mdy}: page ${page + 1} came back empty`);
    all.push(...rows);
    onPage?.(page + 1, rows.length);
  }
  return all;
}
