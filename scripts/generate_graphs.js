'use strict';

/**
 * generate_graphs.js | D12 SERIAL 1: campaign result charts as SVG.
 *
 * Zero dependencies. Reads canonical run data selected via testing/site_reports/
 * INDEX.md (run ids registered there are the citable ones) plus
 * testing/VISION_TEST_QUALITY.md for the verification-strength rubric.
 *
 * Outputs (docs/artifacts/):
 *   fusion_attribution_by_site.svg  | horizontal bars, % fusion-attributable
 *   ft_pass_rates.svg               | FT live pass rate per site
 *   quality_rubric.svg              | donut: STRONG / MEDIUM / WEAK tests
 *   perception_asymmetry.svg        | mean A-vs-B perception (elements/states/tests)
 *
 * Usage: node scripts/generate_graphs.js [--root <dir>]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const rootIdx = args.indexOf('--root');
const ROOT_DIR = rootIdx >= 0 && args[rootIdx + 1] ? path.resolve(args[rootIdx + 1]) : ROOT;

const INDEX_PATH = path.join(ROOT_DIR, 'testing', 'site_reports', 'INDEX.md');
const VTQ_PATH = path.join(ROOT_DIR, 'testing', 'VISION_TEST_QUALITY.md');
const OUT_DIR = path.join(ROOT_DIR, 'docs', 'artifacts');

// ---------- helpers ----------

function readText(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found at ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

/** Board rows carry mojibake from emoji churn; charts must stay ASCII English. */
function toAsciiLabel(text) {
  return String(text)
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pull [siteLabel, runId] pairs from INDEX table rows. */
function extractIndexRows(indexMarkdown) {
  const rows = [];
  for (const line of indexMarkdown.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 7 || !/^\d+s?$/.test(cells[1])) continue;
    const runMatch = cells[6].match(/run_\d{8}_\d{6}/);
    if (!runMatch) continue; // blocked/no-run rows carry no citable run
    rows.push({ siteNumber: cells[1], siteLabel: toAsciiLabel(cells[2]), runId: runMatch[0] });
  }
  // First registration wins (later duplicate rows are re-run/evidence notes).
  const seen = new Set();
  return rows.filter((r) => (seen.has(r.runId) ? false : seen.add(r.runId)));
}

function loadDashboards(indexRows) {
  const loaded = [];
  for (const row of indexRows) {
    const dashboardPath = path.join(ROOT_DIR, 'runs', row.runId, 'fusion', 'dashboard_data.json');
    if (!fs.existsSync(dashboardPath)) {
      console.warn(`[generate_graphs] skip ${row.runId} (${row.siteLabel}): no dashboard_data.json`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    } catch (err) {
      console.warn(`[generate_graphs] skip ${row.runId}: unparseable dashboard (${err.message})`);
      continue;
    }
    loaded.push({ ...row, dashboard: data });
  }
  if (!loaded.length) throw new Error('no usable dashboard_data.json files found');
  return loaded;
}

/** Count STRONG/MEDIUM/WEAK classes from the VISION_TEST_QUALITY ledger table. */
function extractQualityCounts(vtqMarkdown) {
  const counts = { STRONG: 0, MEDIUM: 0, WEAK: 0 };
  for (const line of vtqMarkdown.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 5) continue;
    if (cells[3] in counts) counts[cells[3]] += 1;
  }
  if (counts.STRONG + counts.MEDIUM + counts.WEAK === 0) {
    throw new Error('quality ledger parsed to zero rows - check VISION_TEST_QUALITY.md format');
  }
  return counts;
}

// ---------- SVG primitives (hand-rolled, no deps) ----------

function svgOpen(width, height, title) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" font-family="Helvetica,Arial,sans-serif">\n` +
    `  <title>${title}</title>\n` +
    `  <rect width="100%" height="100%" fill="#ffffff"/>\n`
  );
}

function svgText(x, y, text, opts = {}) {
  const size = opts.size || 12;
  const anchor = opts.anchor || 'start';
  const fill = opts.fill || '#222222';
  const weight = opts.weight || 'normal';
  return `  <text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" font-weight="${weight}">${text}</text>\n`;
}

function svgBar(x, y, width, height, fill, label) {
  return `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"${label ? `><title>${label}</title></rect>` : '/>'}\n`;
}

function writeSvg(fileName, content) {
  const outPath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`[generate_graphs] wrote ${path.relative(ROOT_DIR, outPath)} (${content.split('\n').length} lines)`);
}

// ---------- chart builders ----------

function buildFusionAttribution(sites) {
  const usable = sites
    .map((s) => ({ label: s.siteLabel, pct: s.dashboard.headline.pct_final_tests_attributable_to_fusion }))
    .filter((s) => typeof s.pct === 'number')
    .sort((a, b) => b.pct - a.pct);

  const rowHeight = 22;
  const chartLeft = 260;
  const chartWidth = 420;
  const height = usable.length * rowHeight + 70;
  let svg = svgOpen(chartLeft + chartWidth + 60, height, 'Fusion attribution by site');
  svg += svgText(20, 30, 'Fusion-attributable % of final tests (per site)', { size: 16, weight: 'bold' });

  usable.forEach((site, i) => {
    const y = 55 + i * rowHeight;
    const barWidth = Math.max(2, Math.round((site.pct / 100) * chartWidth));
    svg += svgText(chartLeft - 10, y + 14, `${site.label.slice(0, 38)}`, { anchor: 'end', size: 11 });
    svg += svgBar(chartLeft, y, barWidth, rowHeight - 8, '#3b7dd8', `${site.label}: ${site.pct}%`);
    svg += svgText(chartLeft + barWidth + 6, y + 14, `${site.pct}%`, { size: 11 });
  });

  const mean = (usable.reduce((sum, s) => sum + s.pct, 0) / usable.length).toFixed(1);
  svg += svgText(20, height - 12, `Mean across ${usable.length} sites: ${mean}%  (canonical runs per testing/site_reports/INDEX.md)`, { size: 11, fill: '#555555' });
  return svg + '</svg>\n';
}

function buildFtPassRates(sites) {
  const usable = sites
    .filter((s) => s.dashboard.execution && s.dashboard.execution.available)
    .map((s) => ({
      label: s.siteLabel,
      passed: s.dashboard.execution.passed,
      executed: s.dashboard.execution.executed_tests,
      rate: s.dashboard.execution.pass_rate,
    }));

  const rowHeight = 22;
  const chartLeft = 260;
  const chartWidth = 380;
  const height = usable.length * rowHeight + 70;
  let svg = svgOpen(chartLeft + chartWidth + 80, height, 'FT live pass rates');
  svg += svgText(20, 30, 'Fusion-test live execution pass rate (per site)', { size: 16, weight: 'bold' });

  usable.forEach((site, i) => {
    const y = 55 + i * rowHeight;
    const barWidth = Math.max(2, Math.round((site.rate / 100) * chartWidth));
    const color = site.rate >= 75 ? '#2e9e5b' : site.rate >= 40 ? '#d8a53b' : '#c94f4f';
    svg += svgText(chartLeft - 10, y + 14, `${site.label.slice(0, 38)}`, { anchor: 'end', size: 11 });
    svg += svgBar(chartLeft, y, barWidth, rowHeight - 8, color, `${site.label}: ${site.passed}/${site.executed}`);
    svg += svgText(chartLeft + chartWidth + 8, y + 14, `${site.passed}/${site.executed}`, { size: 10, fill: '#555555' });
  });

  svg += svgText(20, height - 12, 'green >=75% | amber >=40% | red <40% | honest failures are data, not defects', { size: 11, fill: '#555555' });
  return svg + '</svg>\n';
}

function buildQualityRubric(counts) {
  const total = counts.STRONG + counts.MEDIUM + counts.WEAK;
  const segments = [
    { key: 'STRONG', value: counts.STRONG, color: '#2e9e5b' },
    { key: 'MEDIUM', value: counts.MEDIUM, color: '#d8a53b' },
    { key: 'WEAK', value: counts.WEAK, color: '#c94f4f' },
  ];
  const size = 340;
  const center = size / 2;
  const radius = 110;
  const innerRadius = 62;
  let svg = svgOpen(size + 220, size + 40, 'Verification strength rubric');
  svg += svgText(20, 30, 'B-side test verification strength', { size: 16, weight: 'bold' });

  let angle = -Math.PI / 2;
  for (const seg of segments) {
    if (!seg.value) continue;
    const sweep = (seg.value / total) * Math.PI * 2;
    const endAngle = angle + sweep;
    const largeArc = sweep > Math.PI ? 1 : 0;
    const x1 = center + radius * Math.cos(angle);
    const y1 = center + radius * Math.sin(angle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(angle);
    const y4 = center + innerRadius * Math.sin(angle);
    svg +=
      `  <path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} ` +
      `L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z" ` +
      `fill="${seg.color}"><title>${seg.key}: ${seg.value}</title></path>\n`;
    angle = endAngle;
  }

  segments.forEach((seg, i) => {
    const y = 90 + i * 30;
    svg += svgBar(size + 30, y - 12, 16, 16, seg.color);
    svg += svgText(size + 54, y, `${seg.key}: ${seg.value} (${((seg.value / total) * 100).toFixed(1)}%)`, { size: 13 });
  });
  svg += svgText(center, size - 6, `${total} tests`, { anchor: 'middle', size: 14, weight: 'bold' });
  svg += svgText(20, size + 24, 'Boundary: STRONG iff any step used input_value/checked_state/dropdown/select/scroll verification', { size: 10, fill: '#555555' });
  return svg + '</svg>\n';
}

function buildPerceptionAsymmetry(sites) {
  const usable = sites.filter((s) => s.dashboard.architecture_comparison);
  const mean = (field, arch) =>
    usable.reduce((sum, s) => sum + (s.dashboard.architecture_comparison[arch][field] || 0), 0) / usable.length;

  const metrics = [
    { key: 'Elements seen', a: mean('elements_seen', 'a'), b: mean('elements_seen', 'b') },
    { key: 'States explored', a: mean('states', 'a'), b: mean('states', 'b') },
    { key: 'Tests generated', a: mean('tests', 'a'), b: mean('tests', 'b') },
    { key: 'Behaviors seen', a: mean('behaviors_seen', 'a'), b: mean('behaviors_seen', 'b') },
  ];

  const groupWidth = 150;
  const chartLeft = 70;
  const baseY = 300;
  const maxScale = Math.max(...metrics.flatMap((m) => [m.a, m.b]), 1);
  let svg = svgOpen(chartLeft + metrics.length * groupWidth + 60, 360, 'A vs B perception means');
  svg += svgText(20, 30, `Perception asymmetry: Architecture A (DOM) vs B (vision), means over ${usable.length} sites`, { size: 15, weight: 'bold' });

  metrics.forEach((metric, i) => {
    const x0 = chartLeft + i * groupWidth;
    const scale = (value) => Math.round((value / maxScale) * 200);
    const barWidth = 46;
    svg += svgBar(x0 + 10, baseY - scale(metric.a), barWidth, scale(metric.a), '#3b7dd8', `A ${metric.key}: ${metric.a.toFixed(1)}`);
    svg += svgText(x0 + 10 + barWidth / 2, baseY - scale(metric.a) - 6, metric.a.toFixed(1), { anchor: 'middle', size: 10 });
    svg += svgBar(x0 + 10 + barWidth + 12, baseY - scale(metric.b), barWidth, scale(metric.b), '#e07b39', `B ${metric.key}: ${metric.b.toFixed(1)}`);
    svg += svgText(x0 + 10 + barWidth * 1.5 + 12, baseY - scale(metric.b) - 6, metric.b.toFixed(1), { anchor: 'middle', size: 10 });
    svg += svgText(x0 + groupWidth / 2, baseY + 18, metric.key, { anchor: 'middle', size: 11 });
  });

  svg += svgBar(70, 330, 14, 14, '#3b7dd8');
  svg += svgText(90, 341, 'Architecture A (DOM)', { size: 12 });
  svg += svgBar(240, 330, 14, 14, '#e07b39');
  svg += svgText(260, 341, 'Architecture B (vision)', { size: 12 });
  return svg + '</svg>\n';
}

// ---------- zero-dependency PNG fallbacks (zlib + hand-rolled rasterizer) ----------

const zlib = require('zlib');

/* Classic 5x7 bitmap font (rows are 5-bit values, bit 4 = leftmost column). */
const FONT_5X7 = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17], X: [17, 10, 4, 4, 4, 10, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 6, 8, 16, 31],
  '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12], '%': [25, 26, 2, 4, 8, 11, 19], '/': [1, 1, 2, 4, 8, 16, 16],
  '-': [0, 0, 0, 31, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ':': [0, 12, 12, 0, 12, 12, 0],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '+': [0, 4, 4, 31, 4, 4, 0],
  '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '=': [0, 0, 31, 0, 31, 0, 0],
  ' ': [0, 0, 0, 0, 0, 0, 0],
};

function makeCanvas(width, height) {
  return { width, height, pixels: Buffer.alloc(width * height * 3, 0xff) };
}

function canvasFillRect(canvas, x, y, w, h, [r, g, b]) {
  for (let row = y; row < y + h && row < canvas.height; row++) {
    for (let col = x; col < x + w && col < canvas.width; col++) {
      if (col < 0 || row < 0) continue;
      const offset = (row * canvas.width + col) * 3;
      canvas.pixels[offset] = r; canvas.pixels[offset + 1] = g; canvas.pixels[offset + 2] = b;
    }
  }
}

function canvasDrawLine(canvas, x1, y1, x2, y2, color, thickness = 2) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x1 + ((x2 - x1) * i) / steps);
    const y = Math.round(y1 + ((y2 - y1) * i) / steps);
    canvasFillRect(canvas, x - thickness / 2, y - thickness / 2, thickness, thickness, color);
  }
}

/** Uppercase-only bitmap text (fallback charts are English/ASCII by policy). */
function canvasDrawText(canvas, text, x, y, color, scale = 2) {
  let cursor = x;
  for (const rawChar of String(text).toUpperCase()) {
    const glyph = FONT_5X7[rawChar] || FONT_5X7[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row] & (1 << (4 - col))) {
          canvasFillRect(canvas, cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
  return cursor;
}

function measureText(text, scale = 2) {
  return String(text).length * 6 * scale;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encode RGB canvas -> PNG bytes (color type 2, filter 0 per scanline). */
function writePng(filePath, canvas) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas.width, 0);
  ihdr.writeUInt32BE(canvas.height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const raw = Buffer.alloc(canvas.height * (canvas.width * 3 + 1));
  for (let row = 0; row < canvas.height; row++) {
    const dest = row * (canvas.width * 3 + 1);
    raw[dest] = 0; // filter none
    canvas.pixels.copy(raw, dest + 1, row * canvas.width * 3, (row + 1) * canvas.width * 3);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

/** Post-write integrity gate: signature, IHDR dims, inflated size == w*h*3 + h. */
function verifyPngBytes(filePath, canvas) {
  const bytes = fs.readFileSync(filePath);
  const signatureOk = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const widthOk = bytes.readUInt32BE(16) === canvas.width;
  const heightOk = bytes.readUInt32BE(20) === canvas.height;
  const idatStart = bytes.indexOf(Buffer.from('IDAT', 'ascii'));
  if (!signatureOk || !widthOk || !heightOk || idatStart < 0) {
    throw new Error(`PNG integrity failed for ${filePath}`);
  }
  const idatLen = bytes.readUInt32BE(idatStart - 4);
  const inflated = zlib.inflateSync(bytes.subarray(idatStart + 4, idatStart + 4 + idatLen));
  const expected = canvas.height * (canvas.width * 3 + 1);
  if (inflated.length !== expected) {
    throw new Error(`PNG inflate size ${inflated.length} != expected ${expected} for ${filePath}`);
  }
}

// ---------- architecture diagram (SVG + PNG) ----------

const ARCH_NODES = [
  { id: 'a', label: 'ARCH A - DOM EXPLORER', sub: 'web/ runBoth + Playwright', x: 60, y: 60, w: 250, h: 64 },
  { id: 'b', label: 'ARCH B - VISION', sub: 'YOLO + OCR gateway (vision/)', x: 640, y: 60, w: 280, h: 64 },
  { id: 's1', label: 'S1 CATALOG MERGE', sub: 'fusion/catalog.json', x: 350, y: 180, w: 260, h: 56 },
  { id: 's2', label: 'S2 GAP REPORT', sub: 'uncovered elements/behaviors', x: 350, y: 270, w: 260, h: 52 },
  { id: 's4', label: 'S4 FUSION SYNTHESIS', sub: 'LLM-composed grounded tests', x: 350, y: 356, w: 260, h: 52 },
  { id: 'ft', label: 'FT LIVE EXECUTION', sub: 'Playwright replay + evidence', x: 680, y: 356, w: 240, h: 52 },
  { id: 's6', label: 'S6 DASHBOARD', sub: 'dashboard_data.json + reports', x: 60, y: 356, w: 220, h: 52 },
];

const ARCH_EDGES = [
  ['a', 's1'], ['b', 's1'], ['s1', 's2'], ['s2', 's4'], ['s4', 'ft'], ['ft', 's6'],
];

function buildArchDiagramSvg() {
  const width = 980;
  const height = 470;
  let svg = svgOpen(width, height, 'System architecture: dual exploration + fusion pipeline');
  svg += svgText(20, 28, 'System architecture - dual-explorer fusion testing pipeline', { size: 16, weight: 'bold' });
  svg += `  <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#444444"/></marker></defs>\n`;

  const centers = {};
  for (const node of ARCH_NODES) {
    centers[node.id] = { cx: node.x + node.w / 2, cy: node.y + node.h / 2 };
    svg += `  <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="8" fill="#eef3fb" stroke="#3b7dd8" stroke-width="2"/>\n`;
    svg += svgText(node.x + node.w / 2, node.y + 24, node.label, { anchor: 'middle', size: 13, weight: 'bold', fill: '#1d4f91' });
    svg += svgText(node.x + node.w / 2, node.y + 42, node.sub, { anchor: 'middle', size: 10, fill: '#555555' });
  }
  for (const [from, to] of ARCH_EDGES) {
    const start = centers[from];
    const end = centers[to];
    const bendY = end.cy < start.cy ? start.cy + (end.cy - start.cy) / 2 : start.cy;
    const midX = start.cx + (end.cx - start.cx) / 2;
    const pathD =
      from === 'a' || from === 'b'
        ? `M ${start.cx} ${start.cy + 32} C ${start.cx} ${bendY}, ${end.cx} ${end.y - 20}, ${end.cx} ${end.y - 4}`
        : `M ${start.cx} ${start.cy + 26} L ${midX} ${start.cy + 26} L ${midX} ${end.cy - 4} L ${end.cx} ${end.cy - 4}`;
    // vertical chains use straight arrows into node top; side flows route via mid points
    const d = from === 'a' || from === 'b'
      ? pathD
      : (Math.abs(start.cy - end.cy) < 5
        ? `M ${start.cx + 130} ${start.cy} L ${end.cx - 6} ${end.cy}`
        : pathD);
    svg += `  <path d="${d}" fill="none" stroke="#444444" stroke-width="2" marker-end="url(#arr)"/>\n`;
  }
  svg += svgText(20, height - 12, 'Guards on every edge of evidence: strict run attribution + catalog domains + vision start_urls + folder purity', { size: 10, fill: '#777777' });
  return svg + '</svg>\n';
}

function renderArchDiagramPng(filePath) {
  const width = 980;
  const height = 470;
  const canvas = makeCanvas(width, height);
  const blue = [59, 125, 216];
  const dark = [34, 34, 34];
  const gray = [85, 85, 85];
  canvasDrawText(canvas, 'SYSTEM ARCHITECTURE - DUAL-EXPLORER FUSION PIPELINE', 20, 16, dark);

  for (const node of ARCH_NODES) {
    canvasFillRect(canvas, node.x, node.y, node.w, node.h, [238, 243, 251]);
    for (let t = 0; t < 2; t++) {
      canvasFillRect(canvas, node.x + t, node.y + t, node.w - t * 2, node.h - t * 2 - (node.h - t * 2 - 1), blue); // top+bottom lines
      canvasFillRect(canvas, node.x + t, node.y + t, 1, node.h - t * 2, blue);
      canvasFillRect(canvas, node.x + node.w - 1 - t, node.y + t, 1, node.h - t * 2, blue);
    }
    const labelScale = 2;
    canvasDrawText(canvas, node.label, node.x + Math.max(6, (node.w - measureText(node.label, labelScale)) / 2), node.y + 12, [29, 79, 145], labelScale);
    canvasDrawText(canvas, node.sub.toUpperCase(), node.x + Math.max(6, (node.w - measureText(node.sub, 1)) / 2), node.y + 34, gray, 1);
  }
  const centers = {};
  for (const node of ARCH_NODES) centers[node.id] = { cx: node.x + node.w / 2, cy: node.y + node.h / 2 };
  for (const [from, to] of ARCH_EDGES) {
    const s = centers[from];
    const e = centers[to];
    if (from === 'a' || from === 'b') {
      canvasDrawLine(canvas, s.cx, s.cy + 32, e.cx, e.y - 3, dark);
    } else if (Math.abs(s.cy - e.cy) < 5) {
      canvasDrawLine(canvas, s.cx + 130, s.cy, e.cx - 4, e.cy, dark);
    } else {
      canvasDrawLine(canvas, s.cx, s.cy + 26, e.cx, e.cy - 4, dark);
    }
  }
  canvasDrawText(canvas, 'GUARDS ON EVERY EVIDENCE EDGE: STRICT ATTRIBUTION + DOMAIN CHECKS + FOLDER PURITY', 20, height - 22, [119, 119, 119], 1);
  writePng(filePath, canvas);
  verifyPngBytes(filePath, canvas);
}



/** Simplified horizontal bar chart fallback (labels uppercase, values annotated). */
function renderBarChartPng(filePath, title, rows, footer) {
  const rowHeight = 26;
  const width = 760;
  const height = rows.length * rowHeight + 90;
  const canvas = makeCanvas(width, height);
  const chartLeft = 300;
  const chartWidth = 330;
  canvasDrawText(canvas, title.toUpperCase(), 20, 14, [34, 34, 34]);
  rows.forEach((row, i) => {
    const y = 50 + i * rowHeight;
    canvasDrawText(canvas, row.label.slice(0, 30), 8, y + 4, [85, 85, 85], 1);
    const barWidth = Math.max(2, Math.round((row.value / 100) * chartWidth));
    canvasFillRect(canvas, chartLeft, y, barWidth, rowHeight - 10, row.color || [59, 125, 216]);
    canvasDrawText(canvas, row.annotation, chartLeft + chartWidth + 8, y + 4, [85, 85, 85], 1);
  });
  if (footer) canvasDrawText(canvas, footer.toUpperCase(), 20, height - 24, [119, 119, 119], 1);
  writePng(filePath, canvas);
  verifyPngBytes(filePath, canvas);
}

function renderDonutPng(filePath, segments, total, title) {
  const size = 320;
  const canvas = makeCanvas(size + 260, size + 40);
  const center = size / 2;
  const outer = 110;
  const inner = 62;
  canvasDrawText(canvas, title.toUpperCase(), 20, 14, [34, 34, 34]);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - center;
      const dy = py - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= outer && dist >= inner) {
        let angle = Math.atan2(dy, dx) + Math.PI / 2;
        if (angle < 0) angle += Math.PI * 2;
        let acc = 0;
        for (const seg of segments) {
          const sweep = (seg.value / total) * Math.PI * 2;
          if (angle >= acc && angle < acc + sweep) {
            canvasFillRect(canvas, px, py, 1, 1, seg.color);
            break;
          }
          acc += sweep;
        }
      }
    }
  }
  segments.forEach((seg, i) => {
    const y = 80 + i * 34;
    canvasFillRect(canvas, size + 24, y - 12, 16, 16, seg.color);
    canvasDrawText(canvas, `${seg.key}: ${seg.value} (${((seg.value / total) * 100).toFixed(1)}%)`, size + 48, y, [34, 34, 34], 1);
  });
  canvasDrawText(canvas, `${total} TESTS`, center - 30, size - 12, [34, 34, 34]);
  writePng(filePath, canvas);
  verifyPngBytes(filePath, canvas);
}

/** Emit same-basename .png fallbacks for every shipped SVG + verify raw bytes. */
function generatePngFallbacks(sites, qualityCounts) {
  const outDir = OUT_DIR;

  const attributionRows = sites
    .map((s) => ({ label: s.siteLabel, value: s.dashboard.headline.pct_final_tests_attributable_to_fusion || 0, annotation: `${s.dashboard.headline.pct_final_tests_attributable_to_fusion}%` }))
    .sort((a, b) => b.value - a.value);
  renderBarChartPng(path.join(outDir, 'fusion_attribution_by_site.png'), 'Fusion-attributable % of final tests', attributionRows,
    `MEAN ${ (attributionRows.reduce((s, r) => s + r.value, 0) / attributionRows.length).toFixed(1) }% ACROSS ${attributionRows.length} SITES`);

  const ftRows = sites
    .filter((s) => s.dashboard.execution && s.dashboard.execution.available)
    .map((s) => ({
      label: s.siteLabel,
      value: s.dashboard.execution.pass_rate,
      color: s.dashboard.execution.pass_rate >= 75 ? [46, 158, 91] : s.dashboard.execution.pass_rate >= 40 ? [216, 165, 59] : [201, 79, 79],
      annotation: `${s.dashboard.execution.passed}/${s.dashboard.execution.executed_tests}`,
    }));
  renderBarChartPng(path.join(outDir, 'ft_pass_rates.png'), 'FT live pass rate per site', ftRows,
    'GREEN >=75 | AMBER >=40 | RED <40 - HONEST FAILURES ARE DATA');

  const qualityTotal = qualityCounts.STRONG + qualityCounts.MEDIUM + qualityCounts.WEAK;
  renderDonutPng(path.join(outDir, 'quality_rubric.png'), [
    { key: 'STRONG', value: qualityCounts.STRONG, color: [46, 158, 91] },
    { key: 'MEDIUM', value: qualityCounts.MEDIUM, color: [216, 165, 59] },
    { key: 'WEAK', value: qualityCounts.WEAK, color: [201, 79, 79] },
  ], qualityTotal, 'B-side test verification strength');

  const asymSites = sites.filter((s) => s.dashboard.architecture_comparison);
  const meanOf = (field, arch) =>
    (asymSites.reduce((sum, s) => sum + (s.dashboard.architecture_comparison[arch][field] || 0), 0) / asymSites.length).toFixed(1);
  const metrics = [
    { name: 'ELEMENTS', a: Number(meanOf('elements_seen', 'a')), b: Number(meanOf('elements_seen', 'b')) },
    { name: 'STATES', a: Number(meanOf('states', 'a')), b: Number(meanOf('states', 'b')) },
    { name: 'TESTS', a: Number(meanOf('tests', 'a')), b: Number(meanOf('tests', 'b')) },
    { name: 'BEHAVIORS', a: Number(meanOf('behaviors_seen', 'a')), b: Number(meanOf('behaviors_seen', 'b')) },
  ];
  const asymWidth = 720;
  const asymCanvas = makeCanvas(asymWidth, 340);
  const baseY = 280;
  const maxScale = Math.max(...metrics.flatMap((m) => [m.a, m.b]), 1);
  canvasDrawText(asymCanvas, `PERCEPTION ASYMMETRY - A VS B MEANS OVER ${asymSites.length} SITES`, 20, 14, [34, 34, 34]);
  metrics.forEach((metric, i) => {
    const x0 = 60 + i * 160;
    const scaleH = (value) => Math.round((value / maxScale) * 180);
    canvasFillRect(asymCanvas, x0, baseY - scaleH(metric.a), 46, scaleH(metric.a), [59, 125, 216]);
    canvasDrawText(asymCanvas, String(metric.a), x0 + 10, baseY - scaleH(metric.a) - 18, [34, 34, 34], 1);
    canvasFillRect(asymCanvas, x0 + 58, baseY - scaleH(metric.b), 46, scaleH(metric.b), [224, 123, 57]);
    canvasDrawText(asymCanvas, String(metric.b), x0 + 68, baseY - scaleH(metric.b) - 18, [34, 34, 34], 1);
    canvasDrawText(asymCanvas, metric.name, x0 + 20, baseY + 10, [85, 85, 85], 1);
  });
  canvasFillRect(asymCanvas, 60, 316, 14, 14, [59, 125, 216]);
  canvasDrawText(asymCanvas, 'ARCH A (DOM)', 80, 318, [34, 34, 34], 1);
  canvasFillRect(asymCanvas, 220, 316, 14, 14, [224, 123, 57]);
  canvasDrawText(asymCanvas, 'ARCH B (VISION)', 240, 318, [34, 34, 34], 1);
  writePng(path.join(outDir, 'perception_asymmetry.png'), asymCanvas);
  verifyPngBytes(path.join(outDir, 'perception_asymmetry.png'), asymCanvas);

  console.log('[generate_graphs] PNG fallbacks written + byte-verified (5 files)');
}

// ---------- main ----------

function main() {
  const indexMarkdown = readText(INDEX_PATH, 'site report INDEX');
  const indexRows = extractIndexRows(indexMarkdown);
  console.log(`[generate_graphs] INDEX rows with runnable ids: ${indexRows.length}`);

  const sites = loadDashboards(indexRows);
  console.log(`[generate_graphs] dashboards loaded: ${sites.length}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  writeSvg('fusion_attribution_by_site.svg', buildFusionAttribution(sites));

  const ftUsable = sites.filter((s) => s.dashboard.execution && s.dashboard.execution.available);
  if (ftUsable.length) writeSvg('ft_pass_rates.svg', buildFtPassRates(sites));
  else console.warn('[generate_graphs] no FT execution data - ft_pass_rates.svg skipped');

  const vtqMarkdown = readText(VTQ_PATH, 'VISION_TEST_QUALITY ledger');
  writeSvg('quality_rubric.svg', buildQualityRubric(extractQualityCounts(vtqMarkdown)));

  writeSvg('perception_asymmetry.svg', buildPerceptionAsymmetry(sites));

  writeSvg('system_architecture.svg', buildArchDiagramSvg());

  generatePngFallbacks(sites, extractQualityCounts(vtqMarkdown));
  renderArchDiagramPng(path.join(OUT_DIR, 'system_architecture.png'));

  console.log('[generate_graphs] done.');
}

try {
  main();
} catch (err) {
  console.error(`[generate_graphs] FATAL: ${err.message}`);
  process.exit(1);
}
