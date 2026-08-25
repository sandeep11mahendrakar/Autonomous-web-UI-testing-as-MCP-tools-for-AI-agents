'use strict';

/**
 * mcp/server.js — SKELETON MCP server (stdio, JSON-RPC 2.0) for the Vision
 * architecture. Zero dependencies, Node >= 18.
 *
 * Exposes five tools (see mcp/tools.js): explore_site, get_visual_dom,
 * list_tests, run_test, get_evidence. All tool calls currently return the
 * typed error -32006 not_implemented — no pipeline logic is wired yet.
 *
 * Protocol implemented:
 *   initialize / initialized notification
 *   tools/list
 *   tools/call            -> typed stub error
 *   ping                  -> {}
 *   anything else         -> -32601 method_not_found
 *
 * Run: node mcp/server.js   (speaks one JSON-RPC message per stdin line)
 */

const { TOOLS, callTool } = require('./tools');
const pkg = require('../package.json');

const PROTOCOL_VERSION = '2024-11-05';

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
        serverInfo: { name: 'vision-mcp', version: `0.1.0-skeleton (${pkg.name})` },
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
      if (res.error) {
        return ok(id, {
          content: [{ type: 'text', text: JSON.stringify(res.error) }],
          isError: true,
        });
      }
      return ok(id, { content: [{ type: 'text', text: JSON.stringify(res.result ?? {}) }] });
    }

    default:
      return isNotification ? null : err(id, -32601, `method not found: ${msg.method}`);
  }
}

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
    const out = handleMessage(msg);
    if (out) write(out);
  }
});
process.stdin.on('end', () => process.exit(0));

// Signal readiness on stderr so harnesses can detect startup without
// polluting the stdout JSON-RPC channel.
process.stderr.write('[vision-mcp] skeleton server ready on stdio\n');
