'use strict';
/**
 * campaign_lock.js — acquisition-side liveness check for testing/.campaign.lock
 *
 * The lockfile convention in this repo is: file exists = locked, content =
 * holder PID (written by rerun_starved.js, night_chain.js, rerun_quarantine.js).
 * Until now a STALE lock — holder crashed, or machine rebooted — was honored
 * forever: the AUDIT-3 window sat locked-out behind dead PID 18592 for hours,
 * and another window had to manually remove dead PID 25664's lock.
 *
 * acquireLockOrAbort(log): if the lock holds a PID that is no longer alive,
 * steal the lock LOUDLY (log + rename the stale file aside as evidence) and
 * proceed; if the holder is alive (or pid unreadable — be conservative),
 * abort with exit 2 exactly like the previous behavior.
 *
 * Release paths are unchanged (each driver unlinks on exit/finally).
 */
const fs = require('fs');
const path = require('path');

function isPidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/** Returns true if acquisition may proceed (fresh or stolen-stale), false if
 * a live holder exists. Never throws. */
function lockIsFreeOrStale(lockPath, log) {
  if (!fs.existsSync(lockPath)) return true;
  let pid = NaN;
  try { pid = parseInt(String(fs.readFileSync(lockPath, 'utf8')).trim(), 10); } catch (_) {}
  if (!Number.isInteger(pid) || pid <= 0) {
    // Unreadable/garbage lock — treat as LIVE (conservative; human decides).
    log(`lock exists with unreadable pid — honoring (delete manually if stale): ${lockPath}`);
    return false;
  }
  if (isPidAlive(pid)) {
    log(`lock held by LIVE pid ${pid} — aborting`);
    return false;
  }
  const aside = `${lockPath}.stale.${Date.now()}`;
  try { fs.renameSync(lockPath, aside); } catch (_) {}
  log(`STALE LOCK STOLEN: pid ${pid} is not alive — moved to ${path.basename(aside)}, acquiring`);
  return true;
}

module.exports = { lockIsFreeOrStale, isPidAlive };
