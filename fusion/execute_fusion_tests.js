'use strict';

/**
 * execute_fusion_tests.js — executes Fusion-generated tests (fusion_tests.json)
 * against the live site using ONLY existing validated machinery:
 *   - target resolution: S1 catalog element records (a_selectors + label)
 *   - existence check:   live querySelector BEFORE any action (no stale coords)
 *   - coordinates:       live getBoundingClientRect at execution time
 *   - execution:         same Playwright primitives Architecture A uses
 *
 * ZERO LLM calls. Every step records: target, resolved element, live
 * coordinates, before/after state, verification method, PASS/FAIL.
 * Failures are classified: fusion_generation | catalog_grounding |
 * target_resolution | browser_execution | semantic_verification.
 *
 * Usage: node fusion/execute_fusion_tests.js <run_id | run_dir> [--test FT001]
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'web', 'node_modules', 'playwright'));

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

const VIEWPORT = { width: 1280, height: 900 };
const POPUP_WAIT_MS = Number(process.env.FUSION_POPUP_WAIT_MS) || 6000;

async function snapshotState(page, context) {
  return {
    url: page.url(),
    title: await page.title().catch(() => null),
    body_text_length: await page.evaluate(() =>
      document.body ? document.body.innerText.length : 0).catch(() => null),
    open_pages_in_context: context.pages().length,
    open_pages_urls: context.pages().map(p => p.url()),
  };
}

/** Live existence + geometry probe for a catalog-resolved selector. */
async function probeSelector(page, selector, expectedLabel) {
  return page.evaluate(([sel, wantLabel]) => {
    const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const el = document.querySelector(sel);
    if (!el) return { exists: false };
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const visible = r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    const label = (el.innerText || el.value || el.textContent || '').trim();
    return {
      exists: true,
      visible,
      enabled: !el.disabled,
      tag: el.tagName.toLowerCase(),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      label,
      label_matches_catalog: !wantLabel || norm(label).includes(norm(wantLabel)),
      scroll_y: window.scrollY || 0,
    };
  }, [selector, expectedLabel || null]);
}

function normTxt(t) {
  return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function classifyFailure(stage) {
  // stage: where in the pipeline the failure occurred
  return {
    no_selector_in_catalog: 'catalog_grounding',
    navigation_failed: 'browser_execution',
    selector_not_found: 'target_resolution',
    selector_not_visible: 'target_resolution',
    selector_disabled: 'browser_execution',
    label_mismatch: 'semantic_verification',
    click_threw: 'browser_execution',
    no_post_action_change: 'semantic_verification',
  }[stage] || 'browser_execution';
}

async function waitForContextPageChange(context, baselineUrls, waitMs) {
  const start = Date.now();
  while (Date.now() - start < waitMs) {
    const pages = context.pages();
    const fresh = pages.filter(p => !baselineUrls.includes(p.url()));
    if (fresh.length) {
      // settle briefly so the popup renders content
      await fresh[0].waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      return { changed: true, kind: 'new_page_opened', urls: fresh.map(p => p.url()) };
    }
    if (pages.some(p => !baselineUrls.includes(p.url()))) { /* unreachable */ }
    await new Promise(r => setTimeout(r, 250));
  }
  return { changed: false };
}

async function runTest(browser, testCase, index) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const evidenceDir = path.join(EVIDENCE_DIR, `FT${String(index).padStart(3, '0')}`);
  fs.mkdirSync(evidenceDir, { recursive: true });
  let shotN = 0;
  async function shot(pageObj, name) {
    shotN += 1;
    const f = path.join(evidenceDir, `${String(shotN).padStart(2, '0')}_${name}.png`);
    await pageObj.screenshot({ path: f }).catch(() => null);
    return path.relative(RUN_DIR, f).replace(/\\/g, '/');
  }

  const result = {
    test_id: testCase.test_id,
    source_gap_id: testCase.source_gap_id,
    objective: testCase.objective,
    status: 'PASS',
    steps: [],
    warnings: [],
    started_at: new Date().toISOString(),
  };

  try {
    // Implicit routing: a test without a leading navigate step still declares
    // its start_page — open it, otherwise the first click would run on
    // about:blank and every target would fail resolution.
    if (testCase.steps[0] && testCase.steps[0].action !== 'navigate' && testCase.start_page) {
      try {
        await page.goto(testCase.start_page, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.setViewportSize(VIEWPORT).catch(() => {});
        await page.waitForTimeout(800);
        result.warnings.push(`implicit_routing:navigated_to_start_page:${testCase.start_page}`);
      } catch (err) {
        result.warnings.push(`implicit_routing_failed:${err.message.slice(0, 120)}`);
      }
    }
    for (let i = 0; i < testCase.steps.length; i++) {
      const step = testCase.steps[i];
      const rec = {
        step: i + 1,
        action: step.action,
        ref: step.ref || null,
        target_url: step.url || null,
      };

      // ---------- resolve target from the CATALOG (grounding) ----------
      let catalogRecord = null;
      if (step.action !== 'navigate') {
        catalogRecord = CATALOG_INDEX.elements.get(step.ref);
        // Behavior refs resolve through their recorded target selector, but
        // only when that target is a real DOM selector (A-side behaviors).
        if (!catalogRecord && CATALOG_INDEX.behaviors.has(step.ref)) {
          const bh = CATALOG_INDEX.behaviors.get(step.ref);
          const owner = catalog.elements.find(el =>
            el.page_key === bh.page_key && (el.a_selectors || []).includes(bh.target));
          if (owner) catalogRecord = owner;
        }
        if (!catalogRecord) {
          rec.result = 'FAIL';
          rec.failure_stage = 'no_selector_in_catalog';
          rec.detail = `ref ${step.ref} not found in S1 catalog`;
          result.status = 'FAIL';
          result.steps.push(rec);
          break;
        }
        rec.resolved_element = {
          element_id: catalogRecord.element_id,
          type: catalogRecord.element_type,
          label: catalogRecord.label,
          selectors: catalogRecord.a_selectors || [],
        };
        if (!(catalogRecord.a_selectors || []).length) {
          rec.result = 'FAIL';
          rec.failure_stage = 'no_selector_in_catalog';
          rec.detail = 'catalog record has no A-side selector to resolve';
          result.status = 'FAIL';
          result.steps.push(rec);
          break;
        }
      }
      const selector = catalogRecord ? catalogRecord.a_selectors[0] : null;

      // ---------------- pre-action state + existence check ----------------
      rec.before_state = await snapshotState(page, context);
      const baselineUrls = context.pages().map(p => p.url());

      if (step.action === 'navigate') {
        try {
          await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.setViewportSize(VIEWPORT).catch(() => {});
          await page.waitForTimeout(800);
        } catch (err) {
          rec.result = 'FAIL';
          rec.failure_stage = 'navigation_failed';
          rec.detail = err.message;
          result.status = 'FAIL';
          result.steps.push(rec);
          break;
        }
        rec.after_state = await snapshotState(page, context);
        rec.verification_method = 'url_change';
        const norm = (u) => String(u || '').replace(/\/+$/, '');
        const ok = norm(rec.after_state.url) === norm(step.url);
        rec.result = ok ? 'PASS' : 'FAIL';
        rec.detail = `landed on ${rec.after_state.url}`;
        if (!ok) { rec.failure_stage = 'navigation_failed'; result.status = 'FAIL'; }
        rec.after_screenshot = await shot(page, `step${rec.step}_after_navigate`);
        result.steps.push(rec);
        continue;
      }

      // click: verify the target EXISTS on the CURRENT live page first
      const probe = await probeSelector(page, selector, catalogRecord.label);
      rec.live_probe = probe;
      rec.coordinates_live = probe.exists ? probe.rect : null;
      rec.verification_method = 'popup_opened_or_dom_response';

      if (!probe.exists) {
        rec.result = 'FAIL';
        rec.failure_stage = 'selector_not_found';
        rec.detail = `selector ${selector} not present on current page ${page.url()}`;
        result.status = 'FAIL';
        result.steps.push(rec);
        break;
      }
      if (!probe.visible) {
        rec.result = 'FAIL';
        rec.failure_stage = 'selector_not_visible';
        rec.detail = `selector ${selector} present but not visible/renderable`;
        result.status = 'FAIL';
        result.steps.push(rec);
        break;
      }
      if (!probe.enabled) {
        rec.result = 'FAIL';
        rec.failure_stage = 'selector_disabled';
        rec.detail = `selector ${selector} is disabled`;
        result.status = 'FAIL';
        result.steps.push(rec);
        break;
      }
      if (!probe.label_matches_catalog) {
        // Resolution landed somewhere real but semantics disagree -> honest FAIL.
        rec.result = 'FAIL';
        rec.failure_stage = 'label_mismatch';
        rec.detail = `live label "${probe.label}" does not match catalog label "${catalogRecord.label}"`;
        result.status = 'FAIL';
        result.steps.push(rec);
        break;
      }
      rec.target_exists_verified = true;

      // ------------------------------ execute ------------------------------
      try {
        await Promise.race([
          (async () => {
            await page.click(selector, { timeout: 8000 });
            // messageWindowButton has a built-in 3s delay before window.open
            await page.waitForTimeout(POPUP_WAIT_MS - 2000 > 0 ? POPUP_WAIT_MS - 2000 : 1000);
          })(),
          new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error('click+settle timed out')), POPUP_WAIT_MS + 12000)),
        ]);
      } catch (err) {
        rec.result = 'FAIL';
        rec.failure_stage = 'click_threw';
        rec.detail = err.message;
        result.status = 'FAIL';
        result.steps.push(rec);
        break;
      }

      // --------------------- post-action verification ---------------------
      rec.after_state = await snapshotState(page, context);
      const popup = await waitForContextPageChange(context, baselineUrls, 3000);
      if (popup.changed) {
        rec.popup = popup;
        const p = context.pages().find(pg => !baselineUrls.includes(pg.url()));
        if (p) {
          rec.popup_body_text_length = await p.evaluate(() =>
            document.body ? document.body.innerText.length : 0).catch(() => null);
          rec.popup_screenshot = await shot(p, `step${rec.step}_popup`);
        }
        rec.result = 'PASS';
        rec.detail = `action opened a new page (${(popup.urls || []).join(', ')})`;
      } else if (rec.after_state.open_pages_in_context > rec.before_state.open_pages_in_context) {
        rec.result = 'PASS';
        rec.detail = 'context page count increased';
      } else if (rec.after_state.body_text_length !== rec.before_state.body_text_length ||
                 rec.after_state.url !== rec.before_state.url) {
        rec.warnings = rec.warnings || [];
        result.warnings.push(`Step ${rec.step}: no popup detected; verified via weak page-change signal only`);
        rec.result = 'PASS';
        rec.verification_method = 'weak_page_change';
        rec.detail = 'URL or body text changed after click (weak signal)';
      } else {
        rec.result = 'FAIL';
        rec.failure_stage = 'no_post_action_change';
        rec.detail = 'no new page, no URL change, no body-text change observable after click';
        result.status = 'FAIL';
      }
      rec.after_screenshot = await shot(page, `step${rec.step}_after_click`);
      result.steps.push(rec);
    }

    // final state for the whole test
    result.final_state = await snapshotState(page, context);
    result.final_screenshot = await shot(page, 'final');
  } finally {
    await context.close().catch(() => {});
  }

  result.finished_at = new Date().toISOString();
  return result;
}

// ---------------------------------------------------------------------------
let RUN_DIR = '';
let EVIDENCE_DIR = '';
let CATALOG_INDEX = null;

async function main() {
  const args = process.argv.slice(2);
  const arg = args.find(a => !a.startsWith('--'));
  const testFilterIdx = args.indexOf('--test');
  const testFilter = testFilterIdx >= 0 ? args[testFilterIdx + 1] : null;
  if (!arg) {
    console.error('Usage: node fusion/execute_fusion_tests.js <run_id | run_dir> [--test FT001]');
    process.exit(2);
  }
  const root = path.join(__dirname, '..', 'runs');
  RUN_DIR = fs.existsSync(arg) ? arg : path.join(root, arg);

  const tests = readJson(path.join(RUN_DIR, 'fusion', 'fusion_tests.json'));
  const catalog = readJson(path.join(RUN_DIR, 'fusion', 'catalog.json'));
  if (!tests || !tests.length) { console.error('No fusion_tests.json — run S4 first.'); process.exit(2); }
  if (!catalog) { console.error('No catalog.json — run S1 first.'); process.exit(2); }
  CATALOG_INDEX = {
    elements: new Map(catalog.elements.map(e => [e.element_id, e])),
    behaviors: new Map(catalog.behaviors.map(b => [b.behavior_id, b])),
  };
  EVIDENCE_DIR = path.join(RUN_DIR, 'fusion', 'ft_execution_evidence');

  const selected = testFilter ? tests.filter(t => t.test_id === testFilter) : tests;
  console.log(`[exec] Executing ${selected.length} Fusion test(s) from ${RUN_DIR}`);

  const browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false' });
  const results = [];
  try {
    for (let i = 0; i < selected.length; i++) {
      console.log(`\n[exec] === ${selected[i].test_id}: ${selected[i].objective}`);
      const r = await runTest(browser, selected[i], i + 1);
      results.push(r);
      for (const s of r.steps) {
        console.log(`[exec]   step ${s.step} ${s.action.padEnd(8)} ` +
          `${(s.ref || s.target_url || '')}`.padEnd(50) +
          ` -> ${s.result}${s.detail ? ' (' + s.detail.slice(0, 70) + ')' : ''}`);
      }
      console.log(`[exec] RESULT ${r.test_id}: ${r.status}`);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const report = {
    phase: 'S4_ft_execution',
    executed_at_input: null, // wall-clock only in started_at per test
    llm_calls: 0,
    deterministic: false, // live-site execution
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      steps_total: results.reduce((n, r) => n + r.steps.length, 0),
      steps_passed: results.reduce((n, r) => n + r.steps.filter(s => s.result === 'PASS').length, 0),
      targets_preverified: results.reduce((n, r) => n + r.steps.filter(s => s.target_exists_verified).length, 0),
      warnings: results.reduce((n, r) => n + r.warnings.length, 0),
    },
    failure_classification: results.flatMap(r => r.steps)
      .filter(s => s.result === 'FAIL')
      .map(s => ({ step: s.step, stage: s.failure_stage, class: classifyFailure(s.failure_stage) })),
    results,
  };

  const out = path.join(RUN_DIR, 'fusion', 'ft_execution_results.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('\n[exec] Summary:', JSON.stringify(report.summary));
  if (report.failure_classification.length) {
    console.log('[exec] Failure classification:', JSON.stringify(report.failure_classification));
  }
  console.log(`[exec] Wrote ${out}`);
  console.log(`[exec] Evidence: ${path.relative(RUN_DIR, EVIDENCE_DIR)}/`);
}

if (require.main === module) main().catch(err => {
  console.error('[exec] Fatal:', err.message);
  process.exit(1);
});
module.exports = { classifyFailure, normTxt };
