'use strict';

/**
 * mcp/tools.js — tool schemas + stub handlers for the Vision MCP server.
 *
 * SKELETON ONLY: every handler returns the typed error -32006
 * (not_implemented). No real pipeline logic is wired yet — see
 * docs/MCP_READINESS.md for the full gap analysis and contract design.
 */

const TOOLS = [
  {
    name: 'explore_site',
    description:
      'Explore a URL with the vision architecture (screenshot -> YOLO+OCR -> ' +
      'visual DOM -> generated tests). Heavy: minutes of wall clock and LLM ' +
      'quota. Returns a run_id usable with the other tools.',
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', format: 'uri', description: 'http(s) URL to explore' },
        max_steps: { type: 'integer', minimum: 1, maximum: 60, default: 25 },
      },
    },
  },
  {
    name: 'get_visual_dom',
    description:
      'Return the visual DOM (YOLO+OCR elements with bboxes and confidences) ' +
      'for one captured state of a run, plus a screenshot reference.',
    inputSchema: {
      type: 'object',
      required: ['run_id'],
      properties: {
        run_id: { type: 'string' },
        state: { type: 'string', description: 'state name; defaults to the initial state' },
      },
    },
  },
  {
    name: 'list_tests',
    description: 'List the tests generated for a run.',
    inputSchema: {
      type: 'object',
      required: ['run_id'],
      properties: { run_id: { type: 'string' } },
    },
  },
  {
    name: 'run_test',
    description:
      'Execute one generated test against the live site. On failure returns ' +
      'the typed failure taxonomy (failure_stage/class) from the FT executor.',
    inputSchema: {
      type: 'object',
      required: ['run_id', 'test_id'],
      properties: { run_id: { type: 'string' }, test_id: { type: 'string' } },
    },
  },
  {
    name: 'get_evidence',
    description:
      'Fetch the evidence bundle for an executed test: final/per-step ' +
      'screenshot paths and the raw execution record.',
    inputSchema: {
      type: 'object',
      required: ['run_id', 'test_id'],
      properties: { run_id: { type: 'string' }, test_id: { type: 'string' } },
    },
  },
];

/** Typed JSON-RPC error payloads per docs/MCP_READINESS.md cross-cutting rules. */
const ERRORS = {
  RUN_NOT_FOUND: { code: -32001, message: 'run_not_found' },
  TEST_NOT_FOUND: { code: -32002, message: 'test_not_found' },
  STAGE_FAILED: { code: -32003, message: 'stage_failed' },
  QUOTA_EXHAUSTED: { code: -32004, message: 'quota_exhausted' },
  BUSY: { code: -32005, message: 'busy: another exploration/execution holds the lock' },
  NOT_IMPLEMENTED: { code: -32006, message: 'not implemented (MCP skeleton)' },
};

/**
 * Stub dispatch. Returns { error } for every call until real logic lands.
 * Argument validation against each tool's inputSchema happens in server.js.
 */
function callTool(name /* , args */) {
  if (!TOOLS.some((t) => t.name === name)) {
    return { error: { code: -32602, message: `unknown tool "${name}"` } };
  }
  return { error: { ...ERRORS.NOT_IMPLEMENTED, data: { tool: name } } };
}

module.exports = { TOOLS, ERRORS, callTool };
