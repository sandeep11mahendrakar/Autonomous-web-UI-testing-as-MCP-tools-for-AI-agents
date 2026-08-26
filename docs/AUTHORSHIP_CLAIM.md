# Authorship Claim Guide — making the contribution graph count

## Overview

The GitHub contribution graph for [`sandeep11mahendrakar`](https://github.com/sandeep11mahendrakar)
shows almost no activity even though this repository carries 294 commits. This guide
explains exactly why, and gives three remediation paths with runnable commands.

**Verified facts (from `git log --format='%ae' --all` at HEAD, 2026-08-27):**

| Author email | Commits | Linked to GitHub? |
|---|---|---|
| `sandeep_mahendrakar.11@pes.edu` | **281** | No — PES student mailbox, since dissolved |
| `navyagn66564@gmail.com` | 6 | teammate account |
| `pes2ug23cs387@pesu.pes.edu` | 3 | teammate account |
| `143856083+Neonishh@users.noreply.github.com` | 2 | yes |
| `nidhinairy96@gmail.com` | 1 | teammate account |
| `sandeep@local` | 1 | no (misconfigured one-off) |

Two independent causes, both required to break the graph:

1. **Unlinked author email.** GitHub attributes a commit only when the author email
   matches an address verified on some GitHub account. The PES address was never
   registered there, and the mailbox has been dissolved by the university.
2. **Non-default branches.** All work lived on `after-tier-2` (and earlier working
   branches) while the repository's default branch showed none of it. Contribution
   graphs count commits reachable from the default branch head only after the branch
   history was force-moved did the commits become visible at all — but they still do
   not *count* while cause 1 stands.

## Prerequisites

- Git 2.22+ (`git --version`)
- Admin access to the local clone: `C:\Users\sandeep\pes\vs code\Capstone-Project`
- Your GitHub numeric ID — find it with either of:
  ```bash
  curl -s https://api.github.com/users/sandeep11mahendrakar | findstr '"id"'
  ```
  or open `https://api.github.com/users/sandeep11mahendrakar` in a browser and read the
  `"id"` field. If you see HTTP 403, you are rate-limited; retry from a browser while
  logged in.

> **Warning:** Path 2 rewrites commit SHAs across all branches. Every clone except the
> one you rewrite becomes invalid, and any open pull requests break. Do it once, on a
> fresh backup, and force-push only after verifying the rewritten copy.

---

## Path 1 — Add the PES address to your GitHub account (zero rewrite)

Works only if the dissolved mailbox can still receive mail (mailbox restored,
forwarding rule, or admin re-enable). GitHub sends a verification message there.

1. Open <https://github.com/settings/emails>.
2. In **Add email address**, enter `sandeep_mahendrakar.11@pes.edu` and click **Add**.
3. Click the verification link in the mail GitHub sends.
4. Keep **Keep my email addresses private** unchecked *or* leave it checked — attribution
   works either way once the address is verified on the account.

Result: all 281 historical commits attribute immediately; future commits keep working
only while your local git still uses that address.

---

## Path 2 — Switch identity + optional one-time history rewrite (recommended)

### Step 2a — Point new commits at your GitHub identity

Use the noreply address so the real mailbox is never exposed in public commits:

```bash
cd "C:\Users\sandeep\pes\vs code\Capstone-Project"
git config user.email "YOUR_ID+sandeep11mahendrakar@users.noreply.github.com"
git config user.name "sandeep11mahendrakar"
```

Replace `YOUR_ID` with the numeric ID from Prerequisites (for example
`12345678+sandeep11mahendrakar@users.noreply.github.com`). Verify:

```bash
git config user.email
# Expected: YOUR_ID+sandeep11mahendrakar@users.noreply.github.com
```

Every commit made after this attributes to your account automatically — no rewrite
needed for future work.

### Step 2b (optional) — Rewrite past commits to the same identity

Install the filter tool first:

```bash
pip install git-filter-repo
```

Then, **from a fresh clone** of the branch you want to fix (never your only copy):

```bash
git clone --branch after-tier-2 --no-single-branch https://github.com/sandeep11mahendrakar/mcp-for-the-testing-temp-.git rewrite-work
cd rewrite-work
git filter-repo --email-callback "
return email if email != b'sandeep_mahendrakar.11@pes.edu' else b'YOUR_ID+sandeep11mahendrakar@users.noreply.github.com'
"
```

Check the result before pushing:

```bash
git log --format="%ae" | sort | uniq -c
```
Expected: only your noreply address (plus teammates' untouched addresses) remains.

Push the rewritten branches:

```bash
git push origin --force --all
git push origin --force --tags
```

> **Warning — read before force-pushing**
> - Rewriting changes **every commit SHA**, including teammates' commits whose trees
>   touch rewritten ones.
> - All other clones must be re-cloned; old PRs and issue references to SHAs detach.
> - The `backup` remote is the project archive — coordinate with the team and take a
>   second backup bundle first: `git bundle create capstone-pre-rewrite.bundle --all`.
> - Teammates' emails are deliberately left untouched by the callback above.

---

## Path 3 — GitHub Support for dissolved institutional mailboxes

If the PES mailbox cannot receive verification mail, GitHub Support can attribute
historical commits manually:

1. Open <https://support.github.com/request> and sign in.
2. Choose **Account or profile → General account query**.
3. State: *"My university (PES University) dissolved the student mailbox
   `sandeep_mahendrakar.11@pes.edu`, which authored 281 commits in
   sandeep11mahendrakar/mcp-for-the-testing-temp-. I cannot add or verify it under
   Path 1. Please attach these commits to my account."*
4. Attach proof of ownership: student ID screenshot, transcript line, or the university
   portal showing the assigned address.

Typical turnaround is a few business days. Support applies attribution server-side;
no history rewrite is involved.

---

## Troubleshooting

**Contribution graph still empty after Path 1**
Commits count only when they are on the default branch of a repo *owned by you* and
created after... check three things: (1) default branch actually contains the commits
(`git log origin/HEAD --oneline | Select-Object -First 5`), (2) the repo is not a fork
(forks count only after being made public again), (3) **Contribution settings** in your
profile includes "Private contributions" if the repo is private.

**`git filter-repo` refuses to run ("fresh clone check")**
The tool aborts inside a non-fresh repo on purpose. Re-run in a brand-new clone as shown
in Step 2b, or pass `--force` only if you understand the risk.

**403 from api.github.com when looking up your ID**
Unauthenticated requests are rate-limited per IP. Retry from a logged-in browser session
(the JSON `"id"` field renders fine there), or run the curl against
`https://api.github.com/users/USERNAME` from a different network.

**Commit shows the wrong name but right email (or vice-versa)**
Name and email are configured separately: `git config user.name "..."` next to the
Step 2a email command.

## Related resources

- [GitHub Docs — why are my contributions not showing up?](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/managing-contribution-settings-on-your-profile/why-are-my-contributions-not-showing-up-on-my-profile)
- [git-filter-repo manual](https://htmlpreview.github.io/?https://github.com/newren/git-filter-repo/blob/docs/html/git-filter-repo.html)
