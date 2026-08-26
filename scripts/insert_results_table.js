'use strict';
/* Insert a compact results table into README.md generated from INDEX rows. */
const fs = require('fs');

const idx = fs.readFileSync('testing/site_reports/INDEX.md', 'utf8').split(/\r?\n/);
const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');

function cell(line, i) {
  const c = line.split('|');
  return (c[i] || '').trim();
}

const rows = [];
for (const line of idx) {
  if (!/^\|\s*\d+\s*\|/.test(line)) continue;
  const cells = line.split('|');
  const num = cells[1].trim();
  const site = cells[2].trim();
  const runM = line.match(/run_\d{8}_\d{6}/);
  let ft = cells[10] ? cells[10].trim() : '';
  let fusion = cells[11] ? cells[11].trim() : '';
  // extract FT x/y pattern
  const ftm = ft.match(/(\d+)\/(\d+)/);
  if (ftm) ft = `${ftm[1]}/${ftm[2]}`;
  const fus = (fusion.match(/([\d.]+)\s*%/));
  rows.push({ num, site, runId: runM ? runM[0] : null, ft, fus: fus ? fus[1] + '%' : '—', rawLine: line });
}

// Determine verdict per row from markers/absence
const tableLines = [
  '',
  '| # | Site | Verdict | FT live | Fusion-attributable |',
  '|---|---|---|---|---|',
];
for (const r of rows) {
  let verdict = 'CLEARED';
  let note = '';
  if (/DO-NOT-CITE|CONTAMINATION-EVIDENCE/i.test(r.rawLine)) { verdict = 'DO-NOT-CITE'; }
  else if (/BLOCKED|MIRROR/i.test(r.rawLine)) { verdict = /MIRROR/.test(r.rawLine) ? 'MIRROR-EVIDENCE' : 'BLOCKED-honest'; }
  if (verdict === 'DO-NOT-CITE') note = 'contaminated folder — evidence only';
  else if (r.runId && r.ft === '—') note = 'no executable tests';
  tableLines.push(`| ${r.num} | ${r.site} | ${verdict} | ${r.ft} | ${r.fus} |${note ? ` <sub>${note}</sub>` : ''}`);
}

const tableBlock = [
  '### Final scoreboard (all registered rows)',
  ...tableLines,
  '',
  '_Verdicts: CLEARED = guard-passing run on-target; BLOCKED-honest = environment/'
    + 'bot-wall recorded without quota burn; MIRROR-EVIDENCE / DO-NOT-CITE = see '
    + 'QUARANTINE_TIER2.md. Rows without FT data are exploration-only or '
    + 'exploration-thin runs._',
  '',
].join('\n');

// Insert before "## Quickstart" or append at end
if (readme.includes('## Quickstart')) {
  readme = readme.replace('## Quickstart', tableBlock + '\n## Quickstart');
} else {
  readme += '\n' + tableBlock;
}
fs.writeFileSync(readmePath, readme);
console.log('results table inserted:', rows.length, 'rows');
