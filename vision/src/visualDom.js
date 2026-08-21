'use strict';

/**
 * visualDom.js
 * Builds compact prompts from the merged visual DOM for LLM consumption.
 * Keeps token usage low by summarising only meaningful elements.
 */

const MAX_ELEMENTS = 40;

function buildTestPrompt(visualDOM) {
  const elements = (visualDOM.elements || [])
    .filter((el) => el.text || el.yolo_label)
    .slice(0, MAX_ELEMENTS);

  const compact = elements.map((el) => ({
    id: el.id,
    type: el.type,
    text: el.text,
    center: {
      x: Math.round((el.bbox.x1 + el.bbox.x2) / 2),
      y: Math.round((el.bbox.y1 + el.bbox.y2) / 2),
    },
  }));

  return `You are a QA engineer. Below is the detected UI of a web page (from YOLO object detection + OCR).

PAGE TEXT SUMMARY:
${(visualDOM.raw && visualDOM.raw.full_text ? visualDOM.raw.full_text : '').slice(0, 800)}

DETECTED ELEMENTS:
${JSON.stringify(compact, null, 2)}

Generate functional test cases for this page. Each test case must be a JSON object with:
- "id": short identifier (e.g. TC01, TC02)
- "objective": what to verify
- "steps": array of { "action": "click"|"fill"|"navigate", "x": number|null, "y": number|null, "value": string }
  Use element centre coordinates for click/fill. Use null for navigate.
- "expected_result": expected behaviour

ASSERTION RULES (IMPORTANT):
- Do NOT assert on exact text of headings, banners, or carousel content. These may be animated, rotating, or conditionally rendered. Instead, assert on structural outcomes (page loads, element is present, navigation occurs).
- For navigation tests (clicking a link/button), assert that the URL changes away from the current page or that the new page loads successfully.
- For form/input tests, assert that the field accepts the value and the form submits or validation appears.
- Do NOT assert on exact copyright/footer text unless it is the primary purpose of the test.
- Prefer assertions that are verifiable from the DOM after the action completes.
- Keep assertions specific enough to be meaningful but not so strict that minor UI animations or dynamic content cause false failures.
- Generate 5-10 test cases covering different element types (links, buttons, forms, headings, images).

Return ONLY a raw JSON array. No markdown, no explanation.`;
}

module.exports = { buildTestPrompt };

