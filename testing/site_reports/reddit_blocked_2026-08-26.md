# Site Test Report — Reddit Public (old.reddit.com) — BLOCKED — 2026-08-26

## 1. Metadata

| Field | Value |
|---|---|
| Site | Reddit public front page (old.reddit) |
| URL | `https://old.reddit.com` |
| Test date | 2026-08-26 |
| Unified run ID | none — no pipeline launched (quota-preservation rule) |
| Repo state | `after-tier-2` @ `916b88e` (W5 lane) |
| Explorer | W5 / ox-alpha serial-E (opencode) |
| Report status | FINAL (BLOCKED) |

## 2. Verdict

**BLOCKED — anonymous-access login wall.** old.reddit.com 302-redirects all
anonymous homepage requests to `/login/?reason=lor2&dest=…`. Per Tier-3
policy (read-only public pages only; no logins) and D8 decision (a)
("old.reddit LOGIN_REDIRECT = honest BLOCKED, no spare promotion without
user approval"), no pipeline was launched and zero LLM quota was burned.
The originally planned spare promotion (www.reddit.com public front page)
was NOT taken because D8 (a) explicitly requires user approval for spare
promotion on this row.

## 3. What actually happened

Three-probe evidence trail, all identical:

1. **Preflight (2026-08-25 ~17:45 IST, testing/TIER3_PREFLIGHT.md):**
   `LOGIN_REDIRECT` — 200 after following redirect to
   `…/login/?reason=lor2&dest=…` (4736 ms).
2. **Claim-time runtime re-check (2026-08-25 23:08 IST, realistic Chrome
   UA):** `HTTP 302` → `https://old.reddit.com/login/?reason=lor2&dest=…`
   (1059 ms).
3. **Report-time re-check (2026-08-26 00:13 IST):** `HTTP 302` → same
   login redirect (1083 ms). Not transient; `reason=lor2` is Reddit's
   logged-out redirect gate on the old.reddit surface.

The TIER3_SITES.md row-30 rationale ("old.reddit chosen: lighter DOM,
fewer consent walls") predates this gate; anonymous old.reddit is no
longer reachable, and logging in is forbidden by campaign policy.

## 4. Findings for the pipeline

| # | Finding | Class |
|---|---|---|
| 1 | Login-redirect walls (302 → /login) are a distinct block class from bot-walls (403/202): the site would gladly serve a logged-in session, but campaign policy forbids logins. Preflight tool classifies it (`LOGIN_REDIRECT`) but the class has no dedicated INDEX vocabulary — recorded as generic BLOCKED. | Backlog: distinguish `login_walled` from `bot_walled` in campaign aggregates (different remediation paths: none-in-policy vs residential session) |
| 2 | Spare promotion for this row is gated on explicit user approval (D8-a) — the www.reddit.com public front page remains available as a future candidate if the human Master approves. | Coordination note, no code change |

## 5. Metrics

```
A/B/S1/S2/S4/FT/S6: not run - blocked at pre-gate by design (D8-a)
Quota spent: 0 requests, 0 tokens (policy: do not burn quota on known walls)
Evidence: 3 independent HTTP probes (preflight + 2 runtime re-checks), all 302 -> /login/?reason=lor2
```

## 6. Disposition

Site stays registered as honestly BLOCKED in INDEX row #30. Per D9, the
blocked Tier-3 rows (22/24/25/29/30) are replaced by rows 31-35 toward the
campaign target; W5 proceeds to the replacement pool after this report.
Re-attempt of old.reddit is only worthwhile if the human Master approves
either a www.reddit.com public-front-page spare or an authenticated session
(currently out of policy). Counts toward the C5 blocking-rate statistic.
