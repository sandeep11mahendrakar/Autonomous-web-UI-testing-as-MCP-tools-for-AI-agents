# AUTHORSHIP_CLAIM.md — making the contribution graph show this project

**Audience:** the repo owner (sandeep11mahendrakar), fixing an empty GitHub
contribution graph before submission/grading.
**Verified facts on 2026-08-27:** local `git config user.email` is
`sandeep_mahendrakar.11@pes.edu`; recent commits are authored **and**
committed with that address; all campaign work sits on the non-default branch
`after-tier-2`.

---

## Why the graph is empty

GitHub attributes a commit to your profile only when **both** are true:

1. The commit's author email matches an email **verified on your GitHub
   account**, and
2. The commit lands on the repository's **default branch** (or is merged into
   it).

This repo fails both tests:

- Every commit uses `sandeep_mahendrakar.11@pes.edu`. If that PES student
  mailbox is dissolved (typical after graduation), it can never be verified
  on a personal GitHub account, so GitHub drops attribution.
- All campaign work lives on `after-tier-2` / earlier feature branches;
  commits count for the graph only once they are reachable from the default
  branch, which happened late (force-move) or not at all.

## Remediation paths

Do **one** of paths 1–3, then path 4 (branch merge), which applies regardless.

### Path 1 — Add the PES address to your GitHub account (if the mailbox still works)

Only viable if `sandeep_mahendrakar.11@pes.edu` can still receive mail
(GitHub sends a verification message there).

1. GitHub → **Settings → Emails → Add email address**.
2. Enter `sandeep_mahendrakar.11@pes.edu`, click **Add**.
3. Open the verification mail in the PES inbox and click **Verify**.

Done. Existing commits attribute retroactively — no history rewrite needed.
This is the safest path: zero SHA changes.

### Path 2 — Rewrite history to your GitHub noreply identity (if the mailbox is dead)

Find your noreply address: GitHub → Settings → Emails → "Keep my email
addresses private" shows `ID+sandeep11mahendrakar@users.noreply.github.com`.
Substitute your real numeric ID below.

#### 2a. Point future commits at it (do this first, always)

```bash
git config user.name "sandeep11mahendrakar"
git config user.email "12345678+sandeep11mahendrakar@users.noreply.github.com"
```

(Run inside the repo; omit `--global` so other projects are untouched.)

#### 2b. One-time rewrite of existing history with git-filter-repo

> ⚠️ **Safety warnings — read before running**
> - Rewriting **changes every commit SHA** on the branch.
> - Any clone/fork/local copy elsewhere becomes stale and must be re-cloned.
> - Open PRs referencing old SHAs break.
> - Back up first: `git bundle create ../capstone-backup.bundle --all`
> - Requires [git-filter-repo](https://github.com/newren/git-filter-repo):
>   `pip install git-filter-repo`

```bash
# from the repo root, on after-tier-2, with a clean working tree
git filter-repo --email-callback '
  return b"12345678+sandeep11mahendrakar@users.noreply.github.com" \
    if email == b"sandeep_mahendrakar.11@pes.edu" else email
'
```

Then re-add the remote (filter-repo removes it by design) and force-push:

```bash
git remote add backup https://github.com/sandeep11mahendrakar/mcp-for-the-testing-temp-.git
git push backup after-tier-2 --force
```

Force-pushing is required because rewritten history shares no SHAs with the
remote. Coordinate with any other agent windows first.

### Path 3 — GitHub Support route (mailbox dead, no rewrite wanted)

1. github.com/support → category **"My commits are not linked to my
   profile"**.
2. State that the author email belongs to a **dissolved institutional
   mailbox** you cannot access, that you own the repository and made the
   pushes from your account, and request attribution transfer to
   `12345678+sandeep11mahendrakar@users.noreply.github.com`.
3. Attach proof of ownership (repo URL, account, commit samples). Support
   handles dissolved-domain cases case-by-case.

### Path 4 — Branch merge (required regardless of path chosen)

Commits count only when reachable from the **default branch**.

```bash
# inspect what would move first
git log --oneline after-tier-2 | head -20

# fast-forward the default branch
git checkout main          # or whichever branch GitHub shows as default
git merge --ff-only after-tier-2
git push origin main
```

If the default branch diverged irreconcilably, a merge commit is acceptable:
`git merge after-tier-2` (drop `--ff-only`).

## Verification

1. Push, wait ~1 minute, refresh your profile — contributions appear for the
   campaign window (from 2026-08-22 onward).
2. Spot-check a commit page (e.g. the freeze-tag commit): your avatar must
   replace the bare email.
3. `git log --format="%ae" -5` shows the identity you chose.

## Recommendation

Path 1 if the PES inbox still lives; otherwise **Path 2b + Path 4** — fully
under your control, ~10 minutes, no third party. Keep the bundle from the
backup step until the graph verifies.
