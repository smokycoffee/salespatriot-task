import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { hasNextPage, hiddenFields, parseRows } from '../src/dibbs.ts';

// First 3 rows of the real 10-21-2026 issue-date page.
const html = readFileSync(new URL('./fixtures/rfq-page.html', import.meta.url), 'utf8');

test('parses every field of a grid row', () => {
  const rows = parseRows(html);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    solicitation: 'SPE1C1-27-Q-0091',
    prNumber: '7018738031',
    nsn: '8475-01-537-3803',
    fsc: '8475',
    nomenclature: 'PAD, HELMET, AIRCRAFT',
    qty: 600,
    issued: '2026-10-21',
    returnBy: '2026-11-23',
    status: 'Open',
    setAside: 'Unrestricted/Not Set Aside',
    fastAward: false,
    milSpec: false,
    techDocs: 'None',
    pdfUrl: 'https://dibbs2.bsm.dla.mil/Downloads/RFQ/1/SPE1C127Q0091.PDF',
    packageUrl: 'https://www.dibbs.bsm.dla.mil/rfq/rfqrec.aspx?sn=SPE1C127Q0091',
  });
  assert.equal(rows[1].nsn, '8305-01-100-9061');
  assert.equal(rows[1].milSpec, true);
  assert.equal(rows[1].setAside, 'Small Business Set-Aside');
  assert.equal(rows[1].techDocs, 'Tech Docs');
  assert.equal(rows[1].qty, 20000);
});

test('pager and form helpers', () => {
  assert.equal(hasNextPage(html, 1), true);
  assert.equal(hasNextPage(html, 11), false); // page 1's pager links 2..10 and "..." -> 11
  assert.deepEqual(hiddenFields('<input type="hidden" name="__VIEWSTATE" id="x" value="a&amp;b" />'), [['__VIEWSTATE', 'a&b']]);
  assert.deepEqual(parseRows('<html>no grid</html>'), []);
});
