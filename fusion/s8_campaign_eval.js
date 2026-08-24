'use strict';

/**
 * s8_campaign_eval.js — deterministic campaign-level evaluation generator.
 *
 * Aggregates the site ledger (testing/site_reports/INDEX.md) with per-run
 * artifacts (runs/<id>/fusion/dashboard_data.json, run_manifest.json) into
 * testing/CAMPAIGN_EVALUATION.md.
 *
 * ZERO LLM calls. Every number is either COMPUTED from artifacts/ledger or
 * explicitly marked CURATED (historical facts quoted from the retrospective
 * reports, with source pointers). Nothing is estimated.
 *
 * Usage: node fusion/s8_campaign_eval.js [--index <path>] [--out <path>]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_INDEX = path.join(ROOT, 'testing', 'site_reports', 'INDEX.md');
const DEFAULT_OUT = path.join(ROOT, 'testing', 'CAMPAIGN_EVALUATION.md');

// ---------------------------------------------------------------------------
// Curated evidence (quoted from testing/TIER1_RETROSPECTIVE.md and the
// per-site reports — historical facts, not recomputable from artifacts).
// ---------------------------------------------------------------------------

const PIPELINE_DEFECTS = [
  ['1', 'A invented credentials, looped on login', 'saucedemo', 'Prompt was DemoQA-hardcoded, no page text shown', 'Generic goals + PAGE TEXT block in prompt'],
  ['2', 'B refilled username endlessly', 'saucedemo', 'No form-completion rules in vision prompt', 'Fill-every-field-distinct rules; top/bottom input heuristic'],
  ['3', 'B replay died re_detection_unavailable', 'saucedemo', 'Re-detection fired before YOLO model loaded', 'Retry with backoff (3x)'],
  ['4', 'All fusion tests failed: no A-side selector', 'saucedemo', 'S4 offered vision-only gaps', 'Executability filter in S4 context builder'],
  ['5', 'Every navigate step failed', 'saucedemo', 'Strict URL equality vs trailing slash', 'Slash-tolerant comparison'],
  ['6', 'Test-gen JSON truncated', 'saucedemo', 'max_tokens too small for reasoning models', 'Raised to 3000'],
  ['7', 'Behavior refs unresolvable by executor', 'saucedemo', 'Executor only looked in elements map', 'Behavior-to-owner-selector resolution'],
  ['8', 'Tests clicked against about:blank', 'CURA', 'start_page ignored by executor', 'Implicit routing to declared start_page'],
  ['9', 'Catalog selectors matched nothing live', 'CURA', 'Flattened document index vs sibling-relative position', 'Sibling-relative computation + href-preferred link selectors'],
  ['10', 'parseAction failed on unescaped attr-selector quotes', 'ParaBank', 'Model emits CSS attr-selectors with raw quotes', 'Attr-quote repair pass'],
  ['11', 'Inline ```html fragments corrupted JSON', 'bstackdemo+', 'Reasoning-model quirk', 'Fence-strip + newline-collapse pass'],
  ['12', 'select_option hung on missing option text', 'bstackdemo', 'Strict option-text matching inside menu', 'First-available-option deterministic fallback'],
  ['13', 'FT failed: target exists only post-login', 'bstackdemo rerun', 'Fresh executor context = unauthenticated', 'Pre-authentication block in FT executor'],
  ['14', 'fill steps executed via click path', 'CURA re-run', 'Executor vocabulary predated fill support', 'Real fill branch + value-persisted verification'],
  ['15', 'fill timed out 40s on display box', 'CURA re-run', 'Readonly box clustered as editable target', 'Readonly probe -> fast honest FAIL'],
  ['16', 'Valid select_option rejected invalid_action', 'GlobalSQA', 'S4 validator vocabulary predated new action', 'select_option added across validator/prompt/executor'],
  ['17', 'UUID ids -> querySelectorAll SyntaxError', 'The Internet', 'CSS ids cannot start with digits', '[id="..."] attribute-form selectors'],
  ['18', 'A fatal: networkidle never settles on SPAs', 'Juice Shop', 'Background traffic infinite', 'networkidle -> domcontentloaded fallback'],
  ['19', 'Navigate false-FAIL "/" vs "/#/"', 'Juice Shop', 'Hash-router fragments not normalized', 'Strip mixed trailing /#+'],
];

const SITE_DISCOVERIES = [
  ['OWASP Juice Shop', 'application/security', 'Publicly served /ftp/legal.md directory exposure', 'Found by Architecture B vision exploration (juiceshop_2026-08-24.md)'],
  ['CURA Healthcare', 'automation/UI', 'Demo-credential box is readonly; misclustered as editable', 'Proven by FT selector_readonly fast-fail (cura_rerun_2026-08-24.md)'],
  ['Demoblaze', 'automation/UI', '"Cart" element ambiguity (link vs button)', 'Conflict probe resolved at zero LLM cost (demoblaze_2026-08-24.md)'],
  ['OpenCart demo', 'environment', 'Cloudflare bot-wall blocks automation', 'Recorded honestly as BLOCKED (opencart_blocked_2026-08-24.md)'],
];

const LIMITATIONS = {
  Architecture: [
    'A/B identity spaces never merge (selector-space vs label-space): common elements ~0-1 despite describing the same controls',
    'Text-change fingerprinting inflates A state counts on fill-heavy pages',
    'A terminates on activity, not goals (no objective representation)',
  ],
  Perception: [
    'B cannot read placeholder-only inputs (OCR blindness on credential forms)',
    'YOLO+OCR variance across runs breaks exact replay matching (mitigated by fuzzy matcher, not eliminated)',
    'Banner/footer pseudo-links and rotating ads pollute B candidates',
  ],
  LLM: [
    'Reasoning models burn budget in reasoning channels; JSON corruption classes required repair passes',
    'Free-tier quota caps concurrent campaign throughput',
    'Grounding validator must track every new action type manually',
  ],
  Executor: [
    'Vision-only targets unreachable without coordinate-execution paradigm (V2 backlog #1)',
    'Weak verification ladder always flags body_text_fallback',
    'No file choosers / iframes / native dialogs support',
  ],
  Environment: [
    'Bot-walls (Cloudflare) block entire sites — recorded honestly, never bypassed',
    'Herokuapp free-tier sleeps make availability nondeterministic',
  ],
  Coverage: [
    'Single execution per site (except designated re-runs): flakiness bounds unknown until C4 study',
    'Capability-class coverage (forms/modals/tabs...) not yet systematically classified',
  ],
};

// ---------------------------------------------------------------------------
// INDEX.md parsing (deterministic markdown table reader)
// ---------------------------------------------------------------------------

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function parseIndex(md) {
  const rows = [];
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\|\s*\d+/.test(line)) continue;
    if (lines[i + 1] && /^\|[\s-]+\|/.test(lines[i + 1])) continue; // header separator
    const cells = splitRow(line);
    // # | Site | URL | Date | Report | Run ID | A expl | B expl | S4 accepted | FT live | Fusion-attributable
    rows.push({
      num: cells[0],
      site: cells[1],
      url: cells[2],
      date: cells[3],
      report: cells[4],
      run_id: (cells[5].match(/run_\d{8}_\d{6}/) || [null])[0],
      a_expl: cells[6],
      b_expl: cells[7],
      s4_accepted: cells[8],
      ft_live: cells[9],
      fusion_pct: parseFloat((cells[10].match(/([\d.]+)%/) || [])[1]),
      blocked: /BLOCKED|🚫/.test(line),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Per-run artifact loading
// ---------------------------------------------------------------------------

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function classifySite(row, manifest) {
  if (row.blocked) return 'BLOCKED';
  if (!manifest) return row.ft_live && /FAIL/.test(row.ft_live) ? 'PARTIAL' : 'SUCCESS';
  if (manifest.overall_status === 'SUCCESS') return 'SUCCESS';
  if (manifest.overall_status === 'PARTIAL_FAILURE') return 'PARTIAL';
  if (manifest.overall_status === 'FAILED') return 'PIPELINE FAILURE';
  return 'SITE FAILURE';
}

/** Coverage confidence heuristic — explicitly labelled as such in output. */
function confidence(row, dd) {
  if (row.blocked) return { level: 'LOW', why: 'blocked environment; no meaningful interaction possible' };
  const aOk = /✅/.test(row.a_expl);
  const bOk = /✅/.test(row.b_expl);
  const both = aOk && bOk;
  const ftPass = /PASS/.test(row.ft_live);
  const fusion = (row.fusion_pct || 0) >= 20;
  if (both && (ftPass || fusion)) {
    return { level: 'HIGH', why: 'both architectures explored end-to-end' + (ftPass ? '; FT live PASS' : '') + (fusion ? '; fusion-attributable >=20%' : '') };
  }
  if (aOk || bOk) {
    return { level: 'MEDIUM', why: `only ${aOk ? 'A' : 'B'} explored fully${ftPass ? '; FT live PASS though' : ''}` };
  }
  return { level: 'LOW', why: 'neither architecture completed exploration' };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function pct(n, d) {
  return d ? Math.round((n / d) * 1000) / 10 : null;
}

function buildEvaluation(indexRows, readJson = loadJson, root = ROOT) {
  const enriched = indexRows.map((row) => {
    const runDir = row.run_id ? path.join(root, 'runs', row.run_id) : null;
    const dd = runDir ? readJson(path.join(runDir, 'fusion', 'dashboard_data.json')) : null;
    const manifest = runDir ? readJson(path.join(runDir, 'run_manifest.json')) : null;
    return { ...row, dd, manifest, status: classifySite(row, manifest), conf: confidence(row, dd) };
  });

  const scored = enriched.filter((r) => !r.blocked);
  const summary = {
    attempted: enriched.length,
    scored: scored.length,
    blocked: enriched.filter((r) => r.blocked).length,
    a_completed: enriched.filter((r) => /✅/.test(r.a_expl)).length,
    b_completed: enriched.filter((r) => /✅/.test(r.b_expl)).length,
    full_pipeline: enriched.filter((r) => r.status === 'SUCCESS').length,
    fusion_generated: scored.reduce((n, r) => n + ((r.dd?.fusion?.offered) ?? 0), 0),
    fusion_accepted: scored.reduce((n, r) => n + ((r.dd?.headline?.tests_fusion_created) ?? 0), 0),
    ft_total: scored.reduce((n, r) => n + ((r.dd?.execution?.total) ?? 0), 0),
    ft_pass: scored.reduce((n, r) => n + ((r.dd?.execution?.passed) ?? 0), 0),
    mean_fusion_pct: (() => {
      const vals = scored.map((r) => r.fusion_pct).filter((v) => Number.isFinite(v));
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    })(),
  };

  // A-vs-B aggregate means from dashboard data where available
  const withDD = scored.filter((r) => r.dd);
  const mean = (fn) => {
    const vals = withDD.map(fn).filter(Number.isFinite);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 'not recorded';
  };

  const lines = [];
  lines.push('# Campaign Evaluation (auto-generated)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()} by \`fusion/s8_campaign_eval.js\`.`);
  lines.push('Deterministic, zero LLM. Values are COMPUTED from `testing/site_reports/INDEX.md`');
  lines.push('and `runs/<id>/fusion/dashboard_data.json` unless marked **CURATED** (historical');
  lines.push('evidence quoted with source). Sites marked BLOCKED are excluded from pass-rate');
  lines.push('denominators by design.');
  lines.push('');
  lines.push('## 1. Campaign summary');
  lines.push('');
  lines.push('```text');
  lines.push(`Sites attempted:              ${summary.attempted}`);
  lines.push(`Sites scored:                 ${summary.scored}`);
  lines.push(`Sites blocked:                ${summary.blocked}`);
  lines.push(`A completed:                  ${summary.a_completed}`);
  lines.push(`B completed:                  ${summary.b_completed}`);
  lines.push(`Full A+B pipeline completed:  ${summary.full_pipeline}`);
  lines.push(`Fusion generated (offered):   ${withDD.length ? summary.fusion_generated : 'not recorded for these runs'}`);
  lines.push(`Fusion accepted:              ${withDD.length ? summary.fusion_accepted : 'not recorded'}`);
  lines.push(`Fusion live tests executed:   ${withDD.length ? summary.ft_total : 'not recorded'}`);
  lines.push(`Fusion live PASS:             ${withDD.length ? summary.ft_pass : 'not recorded'}`);
  lines.push(`Fusion live FAIL:             ${withDD.length ? summary.ft_total - summary.ft_pass : 'not recorded'}`);
  lines.push(`Mean fusion-attributable %:   ${summary.mean_fusion_pct != null ? summary.mean_fusion_pct + '%' : 'not recorded'}`);
  lines.push('```');
  lines.push('');
  lines.push('## 2. Site matrix');
  lines.push('');
  lines.push('| # | Site | Status | Confidence (heuristic) | Why |');
  lines.push('|---|---|---|---|---|');
  for (const r of enriched) {
    lines.push(`| ${r.num} | ${r.site} | ${r.status} | ${r.conf.level} | ${r.conf.why} |`);
  }
  lines.push('');
  lines.push('Confidence is a DETERMINISTIC HEURISTIC from ledger signals (both-arch ✅, FT');
  lines.push('PASS, fusion >=20%) — not a human judgment.');
  lines.push('');
  lines.push('## 3. A vs B comparison (means over runs with dashboard data)');
  lines.push('');
  if (withDD.length) {
    const cmp = withDD.map((r) => r.dd.architecture_comparison || {});
    lines.push('| Measure | Value |');
    lines.push('|---|---|');
    const firstObj = cmp.find((c) => Object.keys(c).length) || {};
    for (const k of Object.keys(firstObj)) {
      const nums = cmp.map((c) => c[k]).filter(Number.isFinite);
      lines.push(`| ${k} | mean ${nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 'mixed/not numeric'} (n=${nums.length}) |`);
    }
    lines.push('');
    lines.push('Raw keys of `architecture_comparison` vary per run schema; see each run\'s dashboard.');
  } else {
    lines.push('_No dashboard_data.json found for indexed runs — comparison not computable._');
  }
  lines.push('');
  lines.push('## 4. Fusion contribution quality');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Runs with dashboard data | ${withDD.length} |`);
  lines.push(`| Fusion tests offered/generated | ${withDD.length ? summary.fusion_generated : 'not recorded'} |`);
  lines.push(`| Fusion tests accepted (grounded) | ${withDD.length ? summary.fusion_accepted : 'not recorded'} |`);
  lines.push(`| Fusion tests executed live | ${withDD.length ? summary.ft_total : 'not recorded'} |`);
  lines.push(`| Executed successfully | ${withDD.length ? summary.ft_pass : 'not recorded'} |`);
  lines.push(`| Novel targets exercised by fusion | ${sum(withDD.map((r) => r.dd?.headline?.novel_targets_exercised_by_fusion))} |`);
  lines.push('');
  lines.push('> Quality note: fusion % alone does not equal value. Cross-origin composed');
  lines.push('> workflows (GlobalSQA) and quiet-page coverage (DemoQA FT001) are qualitative');
  lines.push('> wins beyond the percentage. **CURATED** — see per-site reports.');
  lines.push('');
  lines.push('## 4b. Mutation bug-detection scorecard');
  lines.push('');
  const mutDir = path.join(root, 'mutation', 'results');
  const mutScores = [];
  try {
    for (const d of fs.readdirSync(mutDir)) {
      const s = readJson(path.join(mutDir, d, 'score.json'));
      if (s && !s.error) mutScores.push(s);
    }
  } catch (_) { /* no mutation results yet */ }
  if (mutScores.length) {
    lines.push('| Variant | Bug | arch_b | fused |');
    lines.push('|---|---|---|---|');
    for (const s of mutScores) {
      lines.push(`| ${s.variant} | ${s.bug_name || '(baseline)'} | ${s.arch_b} | ${s.fused} |`);
    }
    lines.push('');
    lines.push('Full analysis incl. verification-strength ceiling finding:');
    lines.push('`mutation/results/ANALYSIS.md`. NOT_COVERED = buggy surface never exercised');
    lines.push('(cannot conclude); NO_REPORT = channel produced no report that run.');
  } else {
    lines.push('_No completed mutation runs found under `mutation/results/`._');
  }
  lines.push('');
  lines.push('## 5. Reliability / repeatability');
  lines.push('');
  lines.push('Single-run results dominate this ledger. Variance data lives in');
  lines.push('`testing/REPEATABILITY.md` (3 sites x 3 runs; exploration variability,');
  lines.push('execution flakiness, and API variability reported separately).');
  lines.push('');
  lines.push('## 6. Pipeline defect history (**CURATED** from TIER1_RETROSPECTIVE.md)');
  lines.push('');
  lines.push('| # | Symptom | Detected on | Root cause | Fix |');
  lines.push('|---|---|---|---|---|');
  for (const [num, sym, site, cause, fix] of PIPELINE_DEFECTS) {
    lines.push(`| ${num} | ${sym} | ${site} | ${cause} | ${fix} |`);
  }
  lines.push('');
  lines.push('## 7. Site issue discovery ledger (**CURATED** from per-site reports)');
  lines.push('');
  lines.push('| Site | Class | Finding | Evidence |');
  lines.push('|---|---|---|---|');
  for (const [site, cls, finding, ev] of SITE_DISCOVERIES) {
    lines.push(`| ${site} | ${cls} | ${finding} | ${ev} |`);
  }
  lines.push('');
  lines.push('"Not enough coverage to conclude" applies to every site NOT listed here:');
  lines.push('absence of a listed finding is NOT evidence of absence.');
  lines.push('');
  lines.push('## 8. Cost / time (from run manifests where present)');
  lines.push('');
  const durations = scored
    .map((r) => r.manifest && {
      site: r.site,
      ms: (r.manifest.architecture_a?.duration_ms || 0) + (r.manifest.architecture_b?.duration_ms || 0),
    })
    .filter(Boolean);
  if (durations.length) {
    lines.push('| Site | A+B wall time (min) |');
    lines.push('|---|---|');
    for (const d of durations) lines.push(`| ${d.site} | ${(d.ms / 60000).toFixed(1)} |`);
    const totalMs = durations.reduce((n, d) => n + d.ms, 0);
    lines.push('');
    lines.push(`Total A+B wall time across ${durations.length} sites: ${(totalMs / 60000).toFixed(1)} min.`);
  } else {
    lines.push('_No manifests found for indexed runs._');
  }
  lines.push('');
  lines.push('LLM call counts per run: see `runs/<id>/fusion/dashboard_data.json` (`llm_calls`).');
  lines.push('Token counts were not recorded for Tier-1 runs and are reported as not recorded');
  lines.push('(never estimated).');
  lines.push('');
  lines.push('## 9. Limitation taxonomy (**CURATED**)');
  lines.push('');
  for (const [cat, items] of Object.entries(LIMITATIONS)) {
    lines.push(`### ${cat}`);
    for (const it of items) lines.push(`- ${it}`);
    lines.push('');
  }
  lines.push('## 10. Conclusions');
  lines.push('');
  lines.push(`1. Full-pipeline success: ${summary.full_pipeline}/${summary.scored} runnable sites`
    + `${summary.blocked ? ` (+${summary.blocked} honestly BLOCKED)` : ''}.`);
  if (Number.isFinite(summary.mean_fusion_pct)) {
    lines.push(`2. Mean fusion-attributable coverage: ${summary.mean_fusion_pct}%.`);
  }
  lines.push('3. Blocked environments are tracked separately and never counted as failures.');
  lines.push('4. Historical evidence (19 pipeline defects, seeded-bug mutation scorecard in');
  lines.push('   `mutation/results/SCORECARD.md`) demonstrates hardening through heterogeneous');
  lines.push('   testing.');
  lines.push('');
  return lines.join('\n');
}

function sum(arr) {
  const nums = (arr || []).filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : 'not recorded';
}

function main() {
  const args = process.argv.slice(2);
  const idxIdx = args.indexOf('--index');
  const outIdx = args.indexOf('--out');
  const indexPath = idxIdx >= 0 ? args[idxIdx + 1] : DEFAULT_INDEX;
  const outPath = outIdx >= 0 ? args[outIdx + 1] : DEFAULT_OUT;

  const md = fs.readFileSync(indexPath, 'utf8');
  const rows = parseIndex(md);
  if (!rows.length) {
    console.error('[s8] No ledger rows parsed from', indexPath);
    process.exit(2);
  }
  const report = buildEvaluation(rows);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report);
  console.log(`[s8] Evaluation written: ${outPath} (${rows.length} sites aggregated)`);
}

if (require.main === module) main();

module.exports = { parseIndex, buildEvaluation, classifySite, confidence };
