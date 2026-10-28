# Git Workflow

Interactive commit + PR flow. Never skip gates. Never commit/push without explicit user approval.

## Step 1: Check + Group + Propose Commit

Run:
```bash
git status
git diff
git diff --staged
git log --oneline -5
git branch --show-current
```

Group changes by purpose. Show user:

```
## Current Branch
`<branch>`

## Staged
- <file> — <purpose>

## Unstaged
- <file> — <purpose>

## Untracked
- <file>

## Proposed Commit Groups (ordered by dependency)
1. **<type>(<scope>): <subject>** — <files>
   - <file> — <specific change>
   ...
2. ...

## Proposed Commit Message (per group)
<type>(<scope>): <subject>

- <bullet: behavior/intent, NOT file paths>
- <bullet: edge case or constraint worth noting>
```

**NEVER add AI attribution to commit messages.** No "Generated with [Devin]", no "Co-Authored-By: Devin" lines, no bot co-author trailers. Commits are the user's work — clean conventional-commit format only: subject + bullet body.

Conventional commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `revert`.

### Commit message quality rules

Write for a reviewer reading `git log`, not for a diff reader. The diff already shows what files changed — the message explains WHY and WHAT semantically.

- **Subject ≤72 chars**: `<type>(<scope>): <subject>` — imperative mood, lowercase after colon, no trailing period.
- **Body bullets describe behavior/intent, not file paths.** NEVER list file paths in body bullets — that's redundant with the diff stat. One bullet per logical change, phrased as what the code now does or why.
  - BAD:  `- src/modules/audit/audit.constants.ts: add WPM_SKILL_ENTRY + WPM_DEMEANOUR_ENTRY to AUDIT_ENTITIES`
  - GOOD: `- add WPM_SKILL_ENTRY + WPM_DEMEANOUR_ENTRY to AUDIT_ENTITIES + AUDIT_REGISTRY under WPM_REPORT module`
- **Per-file specificity belongs in the GROUPING section (Step 1), not the commit body.** The proposal shows files+changes; the commit message distills intent.
- **2-4 bullets max.** If you need more, the commit is doing too much — split it.
- **No redundant bullets.** Don't repeat the subject. Don't say "updates tests" if the subject says "fix X tests".
- **Incidental fixes get their own bullet, flagged.** `- drop stray trailing comma in X (incidental)` not buried.
- **Why over what.** When the why isn't obvious from the what, lead with why. "block empty-string customCategoryName while still allowing null" beats "add .min(1) to schema".
- **Professional, clear, understandable.** No filler ("this commit", "in this PR"), no hedging ("might", "should hopefully"), no essays. Reviewer reads `git log --oneline` first — make the subject earn the click.

### Precise grouping rules

Group by **layer boundary + module boundary**, not by file count. One commit per atomic, independently buildable unit.

- **DB layer first**: migrations, schema dumps, regenerated types, whitelist sync → one commit.
- **Shared abstractions next**: base classes, shared utils extracted in this change → one commit. Depends on types from prior commit.
- **One commit per module**: mind module, skills module, etc. Never mix two modules in one commit even if changes are identical — each module is an atomic rollback unit.
- **One commit per UI layer**: API types → form/input components → display/table components. Types first (contract), inputs second, outputs third.
- **Never mix layers**: don't bundle DB migration with API code, don't bundle API types with UI components.
- **Never mix concerns**: don't bundle a refactor with a feature, don't bundle a fix with unrelated cleanup.
- **Per-file specificity**: under each commit group, list each file with its specific change (one line), not just the file name. "category.repository.ts — extends CategoryAgeGroupMappingRepository, replaceAgeGroups in create/update" not just "category.repository.ts".
- **Dependency order**: commits must be ordered so each builds on the prior. If commit 2 depends on types from commit 1, commit 1 goes first.

If a single change spans 1-2 files in one layer → one commit. If it spans 5+ files across 2+ layers or 2+ modules → split.

Ask: **"OK to commit, or need changes?"**

- NO → make changes, re-run Step 1, re-ask.
- YES → stage files, commit, show `git log --oneline -1`, go to Step 2.

## Step 2: Ask PR to develop (default)

Show PR details:

```
## Proposed PR
Source: `<branch>`
Target: `develop` (default; `main` only for hotfix/release; fallback to `main` if `develop` missing)
Title: `<type>(<scope>): <subject>`
Description:
  ## What
  <brief>
  ## Why
  <motivation>
  ## How
  <key impl>
  ## Files Changed
  - <file> — <change>
  ## Testing
  - [ ] <tests run/added>
  ## Checklist
  - [x] style guidelines followed
  - [x] self-review done
  - [x] no console.log / secrets
```

Ask: **"Push and create PR to `develop`?"**

- NO → STOP. Say "commit saved locally. Tell me when ready to push."
- YES → `git push -u origin <branch>`, then create PR via GitHub MCP server (`create_pull_request` tool). Show PR URL. Done.

### PR body via `gh` CLI (Windows/PowerShell)

NEVER pass multi-line PR bodies inline with `gh pr create --body "..."` in PowerShell — backticks are PowerShell escape chars (`` `0 `` = null char, `` `n `` = newline) and silently corrupt/truncate the body.

Always use a body file instead:
1. Write body to a temp file (e.g. `pr-body.md`) with the file-write tool.
2. `gh pr create --body-file pr-body.md ...` (or `gh pr edit <num> --body-file pr-body.md`).
3. Delete the temp file after.

## Rules

1. Never commit without showing grouped summary + user approval.
2. Never push without per-instance approval.
3. Never create PR without showing title + description first.
4. Never commit directly to `main` or `develop` — always feature branches.
5. Never `git push --force` on shared branches. `--force-with-lease` only on own unshared feature branch.
6. Always conventional commit format: `<type>(<scope>): <subject>`.
7. Always group changes by purpose — no mixing unrelated changes.
8. Always default PR target to `develop` (hotfix → `main`).
9. User says "no" at any step → STOP immediately.
10. PowerShell: never inline multi-line `--body` strings — always `--body-file` with temp file.
11. NEVER add AI attribution to commit messages — no "Generated with [Devin]", no "Co-Authored-By: Devin" trailers. Clean conventional-commit format only.
12. Group by layer + module boundary, not file count. One commit per atomic buildable unit. Per-file specificity in the GROUPING proposal only — commit message body describes behavior/intent, never file paths.
13. Commit body: 2-4 bullets, behavior/intent not file paths, no redundant filler, why-over-what when why isn't obvious. Subject ≤72 chars imperative mood.

## Flow

```
user: "commit" / "PR"
  ↓
Step 1: status, diff, group, propose msg
  ask: "OK to commit?"
  NO  → change → re-run Step 1
  YES → stage + commit + show log
          ↓
Step 2: show PR details (target=develop)
  ask: "Push + create PR?"
  NO  → STOP
  YES → push + create PR via MCP + show URL
```
