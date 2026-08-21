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
- "id": short identifier
- "objective": what to verify
- "steps": array of { "action": "click"|"fill"|"navigate", "x": number|null, "y": number|null, "value": string }
  Use element centre coordinates for click/fill. Use null for navigate.
- "expected_result": expected behaviour

Return ONLY a raw JSON array. No markdown, no explanation.`;
}

module.exports = { buildTestPrompt };
