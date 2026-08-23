'use strict';

/**
 * s4_fusion_synthesis.js — Fusion Phase S4 runner.
 *
 * Consumes ONLY compact deterministic artifacts:
 *   runs/<run>/fusion/catalog.json      (S1)
 *   runs/<run>/fusion/gap_report.json   (S2)
 *   runs/<run>/{dom,vision}/.../test_cases*  (existing A/B tests, dedup base)
 *
 * Produces:
 *   runs/<run>/fusion/fusion_tests.json    accepted grounded novel tests
 *   runs/<run>/fusion/fusion_report.json   full acceptance/rejection audit
 *
 * Exactly ONE Fusion LLM call per invocation (--dry-run skips the call).
 * FUSION_LLM_PROVIDER / FUSION_LLM_API_KEY / FUSION_LLM_MODEL configure the
 * provider; falls back to GROQ_API_KEY like architectures A and B.
 *
 * Usage: node fusion/s4_fusion_synthesis.js <run_id | run_dir> [--dry-run] [--max-tests N]
 */

const fs = require('fs');
const path = require('path');

const { resolveLLMConfig, chatCompletion } = require('../lib/llmProvider');
const { normText } = require('./lib/normalize');
const {
  buildFusionContext,
  buildPrompt,
} = require('./lib/s4_context');
const { extractJson, validateTests, testSignature } = require('./lib/s4_validate');
const { collectCoverage } = require('./s2_gap_report');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

/** Non-destructive .env loading (same convention as runBoth.js). */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

function collectExistingTests(runDir) {
  const out = [];
  const aCases = readJson(path.join(runDir, 'dom', 'test_cases.json')) || [];
  for (const tc of Array.isArray(aCases) ? aCases : []) {
    out.push({ source: 'A', objective: tc.objective || '' });
  }
  const visionOut = path.join(runDir, 'vision', 'outputs');
  if (fs.existsSync(visionOut)) {
    for (const f of fs.readdirSync(visionOut).sort()) {
      if (!/^test_cases_.*\.json$/.test(f)) continue;
      for (const tc of readJson(path.join(visionOut, f)) || []) {
        out.push({ source: 'B', objective: tc.objective || '' });
      }
    }
  }
  return out;
}

/** Catalog provenance sources for every record a test touches. */
function provenanceFor(test, index) {
  const srcs = new Set();
  for (const s of test.steps) {
    if (s.ref_kind === 'element') {
      const el = index.elements.get(s.ref);
      for (const x of (el && el.sources) || []) srcs.add(x);
    } else if (s.ref_kind === 'behavior') {
      const bh = index.behaviors.get(s.ref);
      for (const x of (bh && (bh.sources || bh.provenance)) || []) srcs.add(x);
    } else if (s.url) {
      const pg = index.pages.get(s.url);
      for (const x of (pg && pg.provenance) || []) srcs.add(x);
    }
  }
  return [...srcs].sort();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.FUSION_DRY_RUN === 'true';
  const maxTestsIdx = args.indexOf('--max-tests');
  const maxTests = maxTestsIdx >= 0 ? Number(args[maxTestsIdx + 1]) || 8 : 8;

  const arg = args.find(a => !a.startsWith('--') && (maxTestsIdx < 0 || a !== args[maxTestsIdx + 1]));
  if (!arg) { console.error('Usage: node fusion/s4_fusion_synthesis.js <run_id | run_dir> [--dry-run] [--max-tests N]'); process.exit(2); }

  const root = path.join(__dirname, '..', 'runs');
  const runDir = fs.existsSync(arg) ? arg : path.join(root, arg);
  const fusionDir = path.join(runDir, 'fusion');
  const catalog = readJson(path.join(fusionDir, 'catalog.json'));
  const gapReport = readJson(path.join(fusionDir, 'gap_report.json'));
  if (!catalog || !gapReport) {
    console.error(`Missing S1/S2 artifacts in ${fusionDir} — run S1 and S2 first.`);
    process.exit(2);
  }

  for (const f of [path.join(__dirname, '..', 'vision', '.env'), path.join(__dirname, '..', 'web', '.env')]) {
    loadEnvFile(f);
  }

  // ---- deterministic context ----------------------------------------------
  const coverage = collectCoverage(runDir);
  const existingTests = collectExistingTests(runDir);
  const { candidates, index, payload } = buildFusionContext({
    catalog,
    gapReport,
    existingTests,
    coveredKeys: [...coverage.aSelectorActions, ...coverage.bLabelActions],
  });
  const prompt = buildPrompt(payload);

  console.log('[s4] gap candidates offered:', candidates.length,
    JSON.stringify(candidates.reduce((m, c) => (m[c.kind] = (m[c.kind] || 0) + 1, m), {})));
  console.log('[s4] prompt chars:', prompt.length,
    `(~${Math.round(prompt.length / 4)} tokens estimated)`);

  if (dryRun) {
    const preview = path.join(fusionDir, 'fusion_prompt_preview.json');
    fs.writeFileSync(preview, prompt);
    console.log('[s4] DRY RUN — no LLM call. Prompt written to', preview);
    return;
  }

  // ---- exactly ONE real call ----------------------------------------------
  const config = resolveLLMConfig({
    env: process.env,
    prefix: 'FUSION_',
    legacyApiKey: process.env.GROQ_API_KEY,
    legacyModel: process.env.FUSION_MODEL || process.env.GROQ_MODEL_B || process.env.GROQ_MODEL || undefined,
  });
  if (!config.apiKey) {
    console.error('[s4] No API key (FUSION_LLM_API_KEY / GROQ_API_KEY). Aborting before any call.');
    process.exit(3);
  }

  const maxTokens = Number(process.env.FUSION_MAX_TOKENS) || 1500;
  console.log(`[s4] ONE Fusion call -> ${config.provider}:${config.model} (max_tokens=${maxTokens}) ...`);
  let ok = false;
  let raw = '';
  try {
    raw = await chatCompletion(config, {
      maxTokens,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a test-synthesis engine. You respond with ONE raw JSON object matching ' +
            'the provided output_schema. No markdown, no code fences, no commentary.',
        },
        { role: 'user', content: prompt },
      ],
    });
    ok = true;
  } catch (err) {
    console.error('[s4] Fusion LLM call failed:', err.message);
  }
  if (!ok) { process.exitCode = 4; return; }
  // Always persist the raw response so failures are diagnosable WITHOUT
  // burning another API call.
  fs.writeFileSync(path.join(fusionDir, 'fusion_raw_response.txt'), String(raw));
  console.log('[s4] raw response chars:', String(raw).length,
    '->', path.join(fusionDir, 'fusion_raw_response.txt'));

  const response = extractJson(raw);
  const result = validateTests({
    response,
    candidates,
    index,
    coveredA: coverage.aSelectorActions,
    coveredB: coverage.bLabelActions,
    maxTests,
  });

  // ---- persist --------------------------------------------------------------
  const accepted = result.accepted.map((t, i) => ({
    test_id: `FT${String(i + 1).padStart(3, '0')}`,
    ...t,
    provenance: {
      generated_by: 'fusion_s4',
      catalog_sources: provenanceFor(t, index),
      step_targets: t.steps.map(s =>
        s.action === 'navigate'
          ? `navigate->${s.url}`
          : `${s.action}->${s.ref}`),
    },
  }));

  const report = {
    phase: 'S4_fusion_synthesis',
    llm_calls: 1,
    provider: `${config.provider}:${config.model}`,
    prompt_chars: prompt.length,
    approx_prompt_tokens: Math.round(prompt.length / 4),
    gap_candidates_offered: candidates.length,
    candidates_generated: Array.isArray(response && response.tests) ? response.tests.length : 0,
    accepted_count: accepted.length,
    rejected_count: result.rejected.length,
    rejections: result.rejected,
    novelty_reasons: accepted.map(t => ({ test_id: t.test_id, source_gap_id: t.source_gap_id, reason: t.novelty_reason })),
    gap_ids_used: [...new Set(accepted.map(t => t.source_gap_id))],
    all_accepted_grounded: true, // validator guarantees refs exist; audited below
    duplicated_existing_ab_tests: false,
    offline_deterministic: false,
  };
  // Audit the guarantees explicitly rather than asserting them.
  report.all_accepted_grounded = accepted.every(t =>
    t.steps.every(s => s.action === 'navigate'
      ? index.pages.has(s.url)
      : index.elements.has(s.ref) || index.behaviors.has(s.ref)));

  fs.writeFileSync(path.join(fusionDir, 'fusion_tests.json'), JSON.stringify(accepted, null, 2));
  fs.writeFileSync(path.join(fusionDir, 'fusion_report.json'), JSON.stringify(report, null, 2));

  console.log(`[s4] candidates from LLM: ${report.candidates_generated}`);
  console.log(`[s4] accepted: ${accepted.length}  rejected: ${result.rejected.length}`);
  for (const r of result.rejected) console.log(`[s4]   REJECT #${r.index}: ${r.reason}${r.detail ? ' — ' + String(r.detail).slice(0, 80) : ''}`);
  console.log('[s4] gap ids used:', report.gap_ids_used.join(', ') || '(none)');
  console.log('[s4] all accepted grounded:', report.all_accepted_grounded);
  console.log(`[s4] Wrote ${path.join(fusionDir, 'fusion_tests.json')}`);
  console.log(`[s4] Wrote ${path.join(fusionDir, 'fusion_report.json')}`);
}

if (require.main === module) main();
module.exports = { loadEnvFile, collectExistingTests, provenanceFor };
