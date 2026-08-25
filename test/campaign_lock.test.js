'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { lockIsFreeOrStale, isPidAlive } = require('../testing/campaign_lock');

function tmpLock(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clock-'));
  const p = path.join(dir, '.campaign.lock');
  if (content !== null) fs.writeFileSync(p, content);
  return p;
}

test('isPidAlive: own pid alive, absurd pid dead', () => {
  assert.equal(isPidAlive(process.pid), true);
  // PID 0/4-ish system pids vary; use a value far beyond Windows pid range
  assert.equal(isPidAlive(999999999), false);
});

test('lockIsFreeOrStale: no lock -> free', () => {
  const p = tmpLock(null);
  const logs = [];
  assert.equal(lockIsFreeOrStale(p, (m) => logs.push(m)), true);
});

test('lockIsFreeOrStale: live holder (self) -> NOT free', () => {
  const p = tmpLock(String(process.pid)); // our own pid is definitely alive
  const logs = [];
  assert.equal(lockIsFreeOrStale(p, (m) => logs.push(m)), false);
  assert.ok(fs.existsSync(p)); // untouched
});

test('lockIsFreeOrStale: dead-pid lock is STOLEN loudly and removed', () => {
  const p = tmpLock(String(999999999)); // not a live pid
  const logs = [];
  assert.equal(lockIsFreeOrStale(p, (m) => logs.push(m)), true);
  assert.equal(fs.existsSync(p), false); // moved aside
  assert.ok(logs.some((l) => l.includes('STALE LOCK STOLEN')));
  assert.ok(fs.readdirSync(path.dirname(p)).some((f) => f.includes('.stale.')));
});

test('lockIsFreeOrStale: unreadable pid -> conservative NOT free', () => {
  const p = tmpLock('garbage');
  const logs = [];
  assert.equal(lockIsFreeOrStale(p, (m) => logs.push(m)), false);
  assert.ok(fs.existsSync(p));
});
