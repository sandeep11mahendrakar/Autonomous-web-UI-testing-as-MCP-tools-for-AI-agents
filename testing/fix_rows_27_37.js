'use strict';
/* Register missing verdict rows + repair malformed row 37 (utf8 via fs). */
const fs = require('fs');
const p = 'testing/site_reports/INDEX.md';
let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

// 1. Repair malformed row 37 (starts without leading pipe)
lines = lines.map((l) => {
  if (/^37 \| GlobalSQA/.test(l)) return '| ' + l.trim();
  return l;
});

// 2. Insert row 27 after row 26 if not present
if (!lines.some((l) => /^\|\s*27\s*\|/.test(l))) {
  const i = lines.findIndex((l) => /^\|\s*26\s*\|/.test(l));
  const row = '| 27 | BBC News | https://www.bbc.com/news | 2026-08-26 | `bbc_news_2026-08-26.md` | `run_20260826_000112` | ⚠️ A timeout @900s | ✅ B replay 1/1 PASS | 7 accepted | **5/7 PASS** | **77.8%** |';
  if (i >= 0) lines.splice(i + 1, 0, row); else lines.push(row);
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('INDEX repaired: row 37 fixed, row 27 registered');
