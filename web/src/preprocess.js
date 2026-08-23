'use strict';

const { reconstructWorkflows } = require('./exploreHelpers');

const MAX_ELEMENTS = 50;
const ALLOWED_TAGS = new Set(['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA']);

function preprocessDOM(rawElements) {
  if (!Array.isArray(rawElements)) return [];

  let filtered = rawElements.filter(el =>
    ALLOWED_TAGS.has((el.tag || '').toUpperCase())
  );

  filtered = filtered.filter(el => {
    const hasText        = el.text && el.text.trim() !== '';
    const hasId          = el.id && el.id.trim() !== '';
    const hasPlaceholder = el.placeholder && el.placeholder.trim() !== '';
    const hasAriaLabel   = el.ariaLabel && el.ariaLabel.trim() !== '';
    const hasHref        = el.href && el.href.trim() !== '' && el.href !== '#';
    const hasName        = el.name && el.name.trim() !== '';
    return hasText || hasId || hasPlaceholder || hasAriaLabel || hasHref || hasName;
  });

  const seenSelectors = new Set();
  filtered = filtered.filter(el => {
    const key = el.selector;
    if (seenSelectors.has(key)) return false;
    seenSelectors.add(key);
    return true;
  });

  const seenTexts = new Set();
  filtered = filtered.filter(el => {
    const t = el.text.trim().toLowerCase();
    if (t && seenTexts.has(t)) return false;
    if (t) seenTexts.add(t);
    return true;
  });

  const tagPriority = { 'BUTTON': 0, 'A': 1, 'INPUT': 2, 'SELECT': 3, 'TEXTAREA': 4 };
  filtered.sort((a, b) => {
    const pa = tagPriority[(a.tag || '').toUpperCase()] ?? 5;
    const pb = tagPriority[(b.tag || '').toUpperCase()] ?? 5;
    return pa - pb;
  });

  filtered = filtered.slice(0, MAX_ELEMENTS);
  filtered = filtered.map((el, index) => ({ ...el, elementId: index }));

  return filtered;
}

function buildExplorationPrompt(elements, memoryLog, flowName = 'unknown', pageText = '', seed = null) {
  const recentSteps = memoryLog.slice(-5).map(s => ({
    step: s.step,
    state_id: s.state_id,
    action: s.action,
    selector: s.target_element_details ? s.target_element_details.selector : '',
    text: s.target_element_details ? s.target_element_details.text : '',
    from_url: s.from_url,
    to_url: s.to_url,
  }));

  const usedSelectors = new Set(
    memoryLog.map(s => s.target_element_details ? s.target_element_details.selector : '')
  );

  const compactElements = elements.map(el => ({
    elementId: el.elementId,
    tag: el.tag,
    text: el.text || '',
    selector: el.selector,
    inputType: el.inputType || '',
    placeholder: el.placeholder || '',
    href: el.href || '',
    disabled: el.disabled || false,
    isDropdown: !!el.isDropdown,
    alreadyUsed: usedSelectors.has(el.selector),
  }));
  const untried = compactElements.filter(el => !el.alreadyUsed).length;

  const demoqaGoals = [
    '- If this is "Elements": navigate into Text Box, fill the form, submit it.',
    '- If this is "Forms": navigate into Practice Form, fill all fields, submit.',
    '- If this is "Alerts": click Browser Windows or Alerts to trigger them.',
    '- If this is "Widgets": interact with Accordian or Tabs.',
    '- If this is "Interactions": try Sortable or Droppable.',
  ];
  const isDemoQAFlow = /element|form|alert|widget|interaction|book/i.test(flowName);
  const goalLines = isDemoQAFlow
    ? demoqaGoals
    : [
      '- If a login form is present and the PAGE TEXT shows example usernames/passwords, use EXACTLY those values (never invent credentials).',
      '- Fill EVERY required field of a form you can see (e.g., username AND password) before submitting it.',
      '- After submitting, continue exploring newly reachable links/buttons; revisit forms with different values if an error appeared.',
      '- Prefer actions that navigate to new URLs over re-interacting with already-used elements.',
    ];
  if (seed && seed.username && seed.password) {
    goalLines.unshift(
      `- SEEDED CREDENTIALS for this site: username="${seed.username}" password="${seed.password}". ` +
      'Use EXACTLY these values when filling any login/signup/credential fields.'
    );
  }

  const pageTextBlock = pageText
    ? `\nPAGE TEXT (on-screen hints, credentials, labels):\n${pageText.replace(/\s+/g, ' ').trim().slice(0, 700)}\n`
    : '';

  return `You are an AI web exploration agent. You are currently exploring the "${flowName}" section of a website.

CURRENT PAGE ELEMENTS:
${JSON.stringify(compactElements)}
${pageTextBlock}
RECENT STEPS TAKEN:
${recentSteps.length > 0 ? JSON.stringify(recentSteps) : 'None — this is the first step in this flow.'}

EXPLORATION STATE: ${untried} of ${compactElements.length} elements on this page have NOT been interacted with yet.

YOUR GOAL for this flow ("${flowName}"):
${goalLines.join('\n')}

STRICT RULES:
1. NEVER pick an element where alreadyUsed is true.
2. NEVER pick a disabled element.
3. NEVER pick an element with empty text, empty id, empty placeholder, and empty href.
4. For anchor <a> tags, ALWAYS use action "navigate" with the full href as the url field. NEVER use "click" for links.
5. Only use "click" for BUTTON and INPUT elements.
6. If an element has isDropdown=true (custom combobox / react-select / native <select>), you MUST use action "select_option" with the desired option text as "value". NEVER use "fill" on a dropdown — it will fail. For a login dropdown, pick the option matching the seeded or on-screen credential (e.g., the username option).
7. If you just navigated to a new page, pick the most meaningful element on that new page.
8. If nothing useful remains or the flow goal is complete, return action "done".
9. Do NOT navigate back to the homepage — stay focused on completing the current flow.
10. If the current page has input fields, fill them ALL before submitting.
11. Respond ONLY with raw JSON — no markdown, no explanation, even if the answer feels obvious.

Respond with EXACTLY:
{
  "action": "click" | "fill" | "navigate" | "select_option" | "done",
  "elementId": <number or null>,
  "selector": "<css selector>",
  "value": "<text to type, only for fill>",
  "url": "<full absolute url from href field, required for navigate>",
  "reason": "<one sentence>"
}`;
}

/**
 * Build a multi-step workflow test-case prompt from recorded exploration
 * history. Steps are strictly grounded: every selector/URL/value must come
 * from a recorded transition — nothing may be invented.
 *
 * @param {Array|Object} history - memory log array, or {memoryLog, transitions}
 */
function buildTestCasePrompt(history) {
  const memoryLog = Array.isArray(history) ? history : (history.memoryLog || []);
  const transitions = (!Array.isArray(history) && history.transitions) || [];
  const trimmedLog = memoryLog.map(s => ({
    step: s.step,
    state_id: s.state_id,
    action: s.action,
    selector: s.target_element_details ? s.target_element_details.selector : (s.action_details ? s.action_details.target : ''),
    value: (s.action_details && s.action_details.value) || '',
    from_url: s.from_url,
    to_url: s.to_url,
  }));

  // Reconstruct recorded workflows: consecutive successful transitions
  // chained by state continuity. These are REAL observed sequences.
  const workflows = reconstructWorkflows(transitions);

  const workflowText = workflows.length
    ? JSON.stringify(workflows.map(wf => wf.map(t => ({
        action: t.action.type,
        selector: t.action.target,
        value: t.action.value || ''
      }))))
    : 'None reconstructed — rely on the chronological log above.';

  return `You are a QA engineer. Based on the following web UI exploration history, generate structured functional test cases.

EXPLORATION LOG (chronological):
${JSON.stringify(trimmedLog)}

RECORDED WORKFLOWS (real observed action sequences — prefer these):
${workflowText}

Generate 3 to 5 functional test cases covering key user flows discovered above.

Each test case must follow this EXACT JSON schema:
{
  "id": "TC001",
  "objective": "Short description of what is being tested",
  "steps": [
    {
      "stepNum": 1,
      "action": "click" | "fill" | "navigate",
      "selector": "<css selector>",
      "value": "<text, only for fill>",
      "description": "Human-readable step description"
    }
  ],
  "expected_result": "What should happen after all steps complete"
}

STRICT GROUNDING RULES:
- Every selector MUST appear verbatim in the exploration log/workflows. Never invent a selector.
- Every navigate URL MUST be one of the URLs visited during exploration.
- Prefer multi-step workflows (navigate -> fill -> select -> submit) over single actions.
- Return ONLY a valid JSON array. No markdown, no extra text.`;
}

module.exports = { preprocessDOM, buildExplorationPrompt, buildTestCasePrompt };