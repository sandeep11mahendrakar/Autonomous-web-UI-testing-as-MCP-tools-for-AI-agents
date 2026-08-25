'use strict';
/* Repair emoji markers in the Tier-2 INDEX rows (PS Add-Content mangling)
 * and normalize to ASCII-safe tokens the parser understands. Zero LLM. */
const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'testing', 'site_reports', 'INDEX.md');
let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const tier2Nums = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
// Per-site A/B status derived from the reports (ground truth):
const status = {
  11: ['OK', 'OK'],
  12: ['OK', 'OK'],
  13: ['OK', 'OK'],
  14: ['TIMEOUT', 'PORT-CONFLICT'],
  15: ['OK', 'OK'],
  16: ['OK', 'FAIL-HONEST'],
  17: ['OK', 'FAIL-HONEST'],
  18: ['OK', 'FAIL-HONEST'],
  19: ['OK', 'FAIL-HONEST'],
  20: ['OK', 'PARTIAL'],
};

lines = lines.map((line) => {
  const m = line.match(/^\|\s*(\d+)\s*\|/);
  if (!m || !tier2Nums.includes(m[1])) return line;
  const num = m[1];
  const cells = line.split('|');
  // cells: ['', num, site, url, date, report, runId, aExpl, bExpl, s4, ft, fusionPct, '']
  if (cells.length >= 12) {
    cells[7] = ` ${status[num][0]} ${cells[7].replace(/^\s*\?\s*/, '').trim()} `;
    cells[8] = ` ${status[num][1]} ${cells[8].replace(/^\s*\?\s*/, '').trim()} `;
    line = cells.join('|');
  }
  return line;
});

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('INDEX tier-2 markers repaired');
