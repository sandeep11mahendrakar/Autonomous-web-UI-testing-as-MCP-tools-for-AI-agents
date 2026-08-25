'use strict';
/** WP-2: validate README quickstart JSON blocks parse and have right shapes. */
const fs = require('fs');
const md = fs.readFileSync('mcp/README.md', 'utf8');
const fence = '```';
const re = new RegExp(fence + 'json\\n([\\s\\S]*?)' + fence, 'g');
const blocks = [...md.matchAll(re)].map((m) => m[1]);
console.log('json blocks found:', blocks.length);
let fail = 0;
blocks.forEach((b, i) => {
  try {
    const parsed = JSON.parse(b);
    console.log('block', i + 1, 'parses OK:', Array.isArray(parsed) ? 'array(' + parsed.length + ')' : typeof parsed);
    if (parsed.mcpServers) console.log('  claude-code shape OK:', Object.keys(parsed.mcpServers).join(','));
    if (parsed.mcp) console.log('  opencode shape OK:', Object.keys(parsed.mcp).join(','));
  } catch (e) {
    console.log('block', i + 1, 'PARSE FAIL:', e.message);
    fail = 1;
  }
});
// the four example JSON-RPC lines in the "Run" jsonc block
const jsoncRe = new RegExp(fence + 'jsonc\\n([\\s\\S]*?)' + fence, 'g');
const jc = [...md.matchAll(jsoncRe)].map((m) => m[1]);
for (const block of jc) {
  for (const line of block.split('\n')) {
    const t = line.trim().replace(/,$/, '');
    if (!t.startsWith('{')) continue;
    try { JSON.parse(t); } catch (e) { console.log('example line PARSE FAIL:', t.slice(0, 60), e.message); fail = 1; }
  }
}
console.log('jsonc example lines parse OK');
process.exit(fail);
