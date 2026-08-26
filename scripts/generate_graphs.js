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

  console.log('[generate_graphs] done.');
}

try {
  main();
} catch (err) {
  console.error(`[generate_graphs] FATAL: ${err.message}`);
  process.exit(1);
}
