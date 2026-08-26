'use strict';

/**
 * server.js — minimal static server for mutation fixtures.
 * Serves the generated site map; unknown paths get the fixture 404 page
 * (with HTTP 404 status) so a broken_nav probe behaves like a real site.
 */

const http = require('http');
const { buildSite } = require('./fixtures');

function createFixtureServer(activeBugs, port = 0) {
  const site = buildSite(activeBugs);
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p;
      try {
        p = new URL(req.url, 'http://x').pathname;
      } catch (_) {
        p = '/';
      }
      if (p.endsWith('/') && p !== '/') p += 'index.html';
      const body = site[p] != null ? site[p] : site['__404'];
      res.writeHead(site[p] != null ? 200 : 404, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

module.exports = { createFixtureServer };
