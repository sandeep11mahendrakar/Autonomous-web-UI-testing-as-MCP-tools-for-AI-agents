'use strict';

/* Patch INDEX.md Tier-2 rows 13-20 -> QUARANTINED markers (utf8-safe via fs). */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'site_reports', 'INDEX.md');

let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const q = ['13', '14', '15', '16', '17', '18', '19', '20'];

lines = lines.map((line) => {
  const m = line.match(/^\|\s*(\d+)\s*\|/);
  if (!m || !q.includes(m[1])) return line;
  // prepend QUARANTINED marker to the Site cell
  return line.replace(/^(\|\s*\d+\s*\|\s*)/, '$1🚫 QUARANTINED-WRONG-SITE · ');
});

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('INDEX rows 13-20 marked QUARANTINED-WRONG-SITE');
