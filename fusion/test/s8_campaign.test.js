'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { parseIndex, buildEvaluation, classifySite, confidence } = require('../s8_campaign_eval');

const INDEX_FIXTURE = `# Site Testing Index

| # | Site | URL | Date | Report | Run ID | A expl | B expl | S4 accepted | FT live | Fusion-attributable |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ShopA | https://a.example | 2026-08-23 | a.md | \`run_20260823_225906\` | ✅ 8 steps/2 URLs | ⚠️ login only | 3/3 grounded | 2/3 PASS | **37.5%** |
| 2 | WallB | https://b.example | 2026-08-24 | b.md | \`run_20260824_095411\` | 🚫 **BLOCKED** — bot-wall | 🚫 blocked | — | — | — |
`;

function fakeReadJson(rel) {
  if (rel.endsWith('dashboard_data.json')) {
    return {
      headline: { tests_fusion_created: 3, novel_targets_exercised_by_fusion: 2 },
      fusion: { offered: 5 },
      execution: { total: 3, passed: 2 },
      architecture_comparison: { elements_a: 13, elements_b: 68 },
    };
  }
  if (rel.endsWith('run_manifest.json')) {
    return { overall_status: 'SUCCESS', architecture_a: { duration_ms: 60000 }, architecture_b: { duration_ms: 30000 } };
  }
  return null;
}

test('parseIndex extracts ledger rows and run ids', () => {
  const rows = parseIndex(INDEX_FIXTURE);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].site, 'ShopA');
  assert.strictEqual(rows[0].run_id, 'run_20260823_225906');
  assert.strictEqual(rows[0].fusion_pct, 37.5);
  assert.strictEqual(rows[1].blocked, true);
});

test('classifySite honors BLOCKED flag over manifest', () => {
  const rows = parseIndex(INDEX_FIXTURE);
  assert.strictEqual(classifySite(rows[1], { overall_status: 'SUCCESS' }), 'BLOCKED');
  assert.strictEqual(classifySite(rows[0], { overall_status: 'SUCCESS' }), 'SUCCESS');
  assert.strictEqual(classifySite(rows[0], { overall_status: 'PARTIAL_FAILURE' }), 'PARTIAL');
  assert.strictEqual(classifySite({ ...rows[0], blocked: false }, null), 'SUCCESS');
});

test('confidence heuristic levels', () => {
  const rows = parseIndex(INDEX_FIXTURE);
  assert.strictEqual(confidence(rows[1]).level, 'LOW');
  // A ✅ B ⚠️ FT PASS -> MEDIUM (only A completed)
  assert.strictEqual(confidence(rows[0]).level, 'MEDIUM');
  const hi = confidence({ blocked: false, a_expl: '✅', b_expl: '✅', ft_live: '3/3 PASS', fusion_pct: 40 });
  assert.strictEqual(hi.level, 'HIGH');
});

test('buildEvaluation aggregates deterministic sections', () => {
  const root = '/fake/root';
  const readJson = (p) => fakeReadJson(path.relative(root, String(p)).replace(/\\/g, '/'));
  const out = buildEvaluation(parseIndex(INDEX_FIXTURE), readJson, root);

  assert.ok(out.includes('# Campaign Evaluation'));
  assert.ok(out.includes('Sites attempted:              2'));
  assert.ok(out.includes('Sites scored:                 1'));
  assert.ok(out.includes('Sites blocked:                1'));
  assert.ok(out.includes('Fusion accepted:              3'));
  assert.ok(out.includes('Fusion live PASS:             2'));
  assert.ok(out.includes('Mean fusion-attributable %:   37.5%'));
  assert.ok(out.includes('| 2 | WallB | BLOCKED | LOW |'));
  assert.ok(out.includes('## 6. Pipeline defect history'));
  assert.ok(out.includes('NOT evidence of absence'));
  // cost table from manifests
  assert.ok(out.includes('| ShopA | 1.5 |'));
});

test('buildEvaluation degrades honestly without artifacts', () => {
  const out = buildEvaluation(parseIndex(INDEX_FIXTURE), () => null, '/root');
  assert.ok(out.includes('_No dashboard_data.json found'));
  assert.ok(out.includes('not recorded'));
});
