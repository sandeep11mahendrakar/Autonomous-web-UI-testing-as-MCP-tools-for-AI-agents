'use strict';
/** One-shot: append "Re-run (decontaminated)" sections to the 4 site reports
 * and update INDEX rows. Run from repo root: node testing/patch_reports.js */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'site_reports');

const data = {
  books_toscrape: { old: 'run_20260825_025619', new: 'run_20260825_131135', status: 'SUCCESS',
    a: 'OK 8 steps / 8 states (no timeout)', b: 'OK 1/1 PASS',
    s4: '5/5 grounded', ft: '4/5 PASS', pct: '71.4%',
    note: 'A completed fully; decontamination CONFIRMED for this site: with A healthy the pipeline finished SUCCESS. FT live 4/5, fusion-attributable 71.4% (5/7 final tests), 8 novel targets.' },
  quotes_toscrape: { old: 'run_20260825_035039', new: 'run_20260825_131756', status: 'PARTIAL_FAILURE',
    a: 'OK 8 steps / 5 states', b: 'PARTIAL (exploration produced no test cases)',
    s4: '5/5 accepted', ft: '4/5 PASS', pct: '83.3%',
    note: 'A fully healthy this time; PARTIAL is B-side (B exploration produced no test cases). FT live 4/5, fusion-attributable 83.3%, 10 novel targets. External navigations to goodreads.com / zyte.com blocked by policy and recorded honestly.' },
  lambdatest_playground: { old: 'run_20260825_053921', new: 'run_20260825_133122', status: 'FAILED',
    a: 'TIMEOUT (internal A 900s cap)', b: 'PARTIAL (no test cases)',
    s4: '4/5 accepted (1 cross_page_ref rejected)', ft: '1/4 PASS', pct: '100%*',
    note: 'REVISION OF CONTAMINATION CLAIM: A timed out AGAIN on a fresh ox-alpha pool — this is the pipeline internal 900s A-timeout on a heavy site, NOT quota starvation. The quota-contamination hypothesis is withdrawn for this site; heavy-DOM A-timeout is a genuine finding. Fusion = 100% of a fusion-only final set (15 novel targets) but the denominator caveat applies.' },
  docs_python: { old: 'run_20260825_055129', new: 'run_20260825_134803', status: 'PARTIAL_FAILURE',
    a: 'TIMEOUT (internal A 900s cap)', b: 'OK 1/1 PASS (weak verif)',
    s4: '8/9 accepted', ft: '2/8 PASS', pct: '88.9%',
    note: 'Same revision as lambdatest: A hit its internal 900s cap again despite fresh quota (mega-DOM docs tree), so this run is also NOT fully decontaminated for A. FT live fell to 2/8 vs the original 7/7 — high variance under A-timeout conditions; recorded honestly as a finding.' },
};

for (const [key, v] of Object.entries(data)) {
  const p = path.join(DIR, key + '_2026-08-25.md');
  let t = fs.readFileSync(p, 'utf8');
  const sec = [
    '', '', '## Re-run (decontaminated) — ' + v.new, '',
    '- New run ID: `' + v.new + '` (replaces contaminated `' + v.old + '` above; old numbers kept as evidence).',
    '- Status: ' + v.status + ' | A: ' + v.a + ' | B: ' + v.b,
    '- S4: ' + v.s4 + ' | FT live: ' + v.ft + ' | Fusion-attributable: ' + v.pct,
    '- ' + v.note, '',
  ].join('\n');
  t += sec;
  fs.writeFileSync(p, t, 'utf8');
  console.log('patched', path.basename(p));
}

// INDEX rows
const ip = path.join(DIR, 'INDEX.md');
let ix = fs.readFileSync(ip, 'utf8');
const rows = {
  books_toscrape: '| 11 | Books to Scrape | https://books.toscrape.com | 2026-08-25 | `books_toscrape_2026-08-25.md` | `run_20260825_131135` | OK 8 steps/8 states | OK 1/1 PASS | 5/5 grounded | 4/5 PASS | **71.4%** |',
  quotes_toscrape: '| 12 | Quotes to Scrape | https://quotes.toscrape.com | 2026-08-25 | `quotes_toscrape_2026-08-25.md` | `run_20260825_131756` | OK 8 steps/5 states | PARTIAL no test cases | 5/5 accepted | 4/5 PASS | **83.3%** |',
  lambdatest_playground: '| 13 | LambdaTest Playground | https://www.lambdatest.com/selenium-playground/ | 2026-08-25 | `lambdatest_playground_2026-08-25.md` | `run_20260825_133122` | TIMEOUT (internal 900s) | PARTIAL no test cases | 4/5 grounded | 1/4 PASS | **100%*** |',
  docs_python: '| 14 | Python.org Docs | https://docs.python.org/3/ | 2026-08-25 | `docs_python_2026-08-25.md` | `run_20260825_134803` | TIMEOUT (internal 900s) | OK 1/1 PASS (weak verif) | 8/9 grounded | 2/8 PASS | **88.9%** |',
};
// Replace rows by locating each row via its report file token
ix = ix.split('\n').map((line) => {
  for (const [key, v] of Object.entries(data)) {
    if (line.includes('`' + key + '_2026-08-25.md`') && !line.includes(v.new)) {
      return rows[key];
    }
  }
  return line;
}).join('\n');
fs.writeFileSync(ip, ix, 'utf8');
console.log('INDEX updated');
