#!/usr/bin/env node
'use strict';

/**
 * mcp/server.js — MCP server (stdio, JSON-RPC 2.0) for the Vision
 * architecture. Zero dependencies, Node >= 18.
 *
 * Exposes five tools (see mcp/tools.js): explore_site, get_visual_dom,
 * list_tests, run_test, get_evidence — all fully wired.
 *   - explore_site spawns `runVision.js --explore` (spawn + streamed logs)
 *   - run_test spawns `src/executeTests.js` replay and returns the verdict
 *   - get_visual_dom / list_tests / get_evidence read storage artifacts
 *
 * Protocol implemented:
 *   initialize / initialized notification
 *   tools/list
 *   tools/call            -> explore_site / run_test run async; others sync
 *   notifications/message -> pipeline log lines from heavy tools
 *   ping                  -> {}
 *   anything else         -> -32601 method_not_found
 *
 * Run: node mcp/server.js   (speaks one JSON message per stdin line)
 */

const { TOOLS, callTool, setLogSink } = require('./tools');
const pkg = require('../package.json');

// Load .env here as well (children like runVision.js load their own copy):
// tools.js needs YOLO_MODEL_PATH visible in-process so it can normalize a
// repo-relative model path to absolute before spawning heavy children.
require('dotenv').config();

const PROTOCOL_VERSION = '2024-11-05';

/**
 * Message-only error details: no stacks, and redact anything shaped like an
 * env assignment (KEY=...) or containing the user home path before it can
 * reach a caller.
 */
function redactMessage(text) {
  let s = String(text);
  s = s.replace(/\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)\s*=\s*\S+/gi, '$1=<redacted>');
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) s = s.split(home).join('~');
  return s;
}

function write(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function ok(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function err(id, code, message, data) {
  const e = { code, message };
  if (data !== undefined) e.data = data;
  return { jsonrpc: '2.0', id, error: e };
}

/** Minimal structural validation against each tool's inputSchema. */
function validateArgs(tool, args) {
  const required = (tool.inputSchema && tool.inputSchema.required) || [];
  const missing = required.filter((k) => !args || typeof args[k] === 'undefined');
  if (missing.length) {
    return `missing required argument(s): ${missing.join(', ')}`;
  }
  // Type-check every provided argument against the schema's declared types
  // so wrong-typed calls fail as -32602 instead of surfacing as confusing
  // domain errors downstream.
  const props = (tool.inputSchema && tool.inputSchema.properties) || {};
  const bad = [];
  for (const [key, spec] of Object.entries(props)) {
    if (!args || typeof args[key] === 'undefined' || args[key] === null) continue;
    switch (spec.type) {
      case 'string':
        if (typeof args[key] !== 'string') bad.push(`${key} (want string)`);
        break;
      case 'integer':
        if (!Number.isInteger(args[key])) bad.push(`${key} (want integer)`);
        else if (
          (spec.minimum !== undefined && args[key] < spec.minimum) ||
          (spec.maximum !== undefined && args[key] > spec.maximum)
        ) {
          bad.push(
            `${key} (out of range ${spec.minimum ?? '-inf'}..${spec.maximum ?? '+inf'})`
          );
        }
        break;
      case 'boolean':
        if (typeof args[key] !== 'boolean') bad.push(`${key} (want boolean)`);
        break;
      default:
        break;
    }
  }
  if (bad.length) return `invalid argument type/value: ${bad.join(', ')}`;
  return null;
}

function handleMessage(msg) {
  const id = typeof msg.id === 'undefined' ? null : msg.id;
  const isNotification = typeof msg.id === 'undefined';
  switch (msg.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'vision-mcp', version: `1.0.0 (${pkg.name})` },
      });

    case 'notifications/initialized':
    case 'initialized':
      return null; // notifications get no response

    case 'ping':
      return isNotification ? null : ok(id, {});

    case 'tools/list':
      return ok(id, { tools: TOOLS });

    case 'tools/call': {
      const name = msg.params && msg.params.name;
      const args = (msg.params && msg.params.arguments) || {};
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) {
        return isNotification ? null : err(id, -32602, `unknown tool "${name}"`);
      }
      const invalid = validateArgs(tool, args);
      if (invalid) {
        return isNotification ? null : err(id, -32602, `invalid arguments: ${invalid}`);
      }
      const res = callTool(name, args);
      // MCP wraps handler results in content blocks; errors surface as isError.
      const wrap = (r) => {
        if (r && r.error) {
          return ok(id, {
            content: [{ type: 'text', text: JSON.stringify(r.error) }],
            isError: true,
          });
        }
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify((r && r.result) || {}) }],
        });
      };
      // explore_site / run_test return Promise<{result|error}> — respond when
      // settled. Internal errors are message-only (no stacks, no env values).
      if (res && typeof res.then === 'function') {
        return isNotification
          ? null
          : res.then(wrap).catch((e) =>
              err(id, -32603, 'internal error', redactMessage((e && e.message) || String(e)))
            );
      }
      return isNotification ? null : wrap(res);
    }

    default:
      return isNotification ? null : err(id, -32601, `method not found: ${msg.method}`);
  }
}

// Streamed pipeline logs (from explore_site) go out as logging
// notifications so they never pollute response ordering on stdout.
setLogSink((line) =>
  write({ jsonrpc: '2.0', method: 'notifications/message', params: { level: 'info', data: line } })
);

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (_) {
      write(err(null, -32700, 'parse error'));
      continue;
    }
    // explore_site resolves asynchronously; responses may arrive out of
    // order relative to later requests. Notifications stay synchronous.
    Promise.resolve(handleMessage(msg))
      .then((out) => {
        if (out) write(out);
      })
      .catch((e) => {
        if (typeof msg.id !== 'undefined') {
          write(err(msg.id, -32603, 'internal error', redactMessage((e && e.message) || String(e))));
        }
      });
  }
});
process.stdin.on('end', () => process.exit(0));

// Signal readiness on stderr so harnesses can detect startup without
// polluting the stdout JSON-RPC channel.
process.stderr.write('[vision-mcp] server ready on stdio\n');
