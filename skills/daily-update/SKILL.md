---
name: daily-update
description: Generate a short, manager-readable daily task update sheet from git activity (commits/uncommitted changes) or raw notes. Use on "daily update", "task update", "standup", "update sheet", "what did I do today".
---

# Daily Task Update Generator

Turn a day's work into a clean, numbered, copy-paste-ready update for the daily task sheet. Output is user-friendly and precise — managers read outcomes, not implementation details.

## Modes — detect from the prompt

**Mode 1 — Git-based (default).** Triggers: "daily update", "task update", "summarize today", or any request naming commits/branches/ranges.

**Mode 2 — Raw notes.** Triggers: user pastes rough notes ("fixed upload bug, progress bar, review meeting").

## Mode 1 — Gather

- **No args given** → today's work:
  ```bash
  git log --since=midnight --author="$(git config user.email)" --no-merges --stat
  git status --short && git diff --stat
  ```
  (If `user.email` matches nothing, retry with `user.name`.)
- **Args given** (commits, `HEAD~N`, `branch..HEAD`, `vs develop`) → use exactly that scope.
- **Multi-repo** → when the prompt names multiple repos/dirs (e.g. "api + ui"), run the same gather per repo and merge into ONE update.
- Read the actual diffs for what + why — group by **feature area, not by commit**. Merge a backend commit + its matching UI commit into one item.

## Mode 2 — Raw notes

- Rewrite the user's notes into the template below.
- If the prompt includes file paths or says "check", verify claims against the code; flag anything unverifiable with `[unverified]` rather than dropping it.
- **Never drop a work item** — compress wording, not scope.

## Output Template

```
1. <Area> – <Short title>
- <outcome bullet — what changed for the user/product>
- <bullet> (max 3 per item)

2. <Area> – <Short title>
- <single line when the item is small>
```

### Formatting rules

- Wrap the whole update in ONE code block in chat — clean copy-paste into the sheet.
- Numbered groups by feature/module/area (`CSV Upload`, `Intellect Upload`, `Weekly Plan`).
- `–` (en dash) between area and title in the heading.
- Bullets = outcomes ("no longer fails", "shows live progress"), not mechanics ("updated repository method").
- No file names, class/method names, commit hashes, branch names, or jargon.
- **Small work collapses:** one-line tasks get a single numbered line, no heading + bullets. A day of only minor work is a flat list of one-liners.
- **Shorter is better:** ≤ ~12 words per bullet. Cut filler, never cut a work item.
- 5+ distinct items is fine; 8+ → consider merging near-duplicate items only if they belong to the same feature area.

### Example — full day (long form)

```
1. CSV Upload – Live Progress
- Uploads now show stage-wise progress (Read → Validate → Save) with live row counters.
- Backend + UI done; works in normal and validate-only modes.

2. Intellect Upload – Deleted Topic Fix
- Re-uploading a deleted topic no longer fails with a false conflict error.

3. Test Suite – Freeze Fix
- Tests froze the laptop from memory overload — now runs in ~20s.
```

### Example — light day (collapsed one-liners)

```
1. Fixed the duplicate validation alert in Intellect assessment.
2. Updated Mentor list filters and empty states.
3. Reviewed and tested Weekly Plan carry-over APIs.
```

## Strict rules

1. Manager-readable only — a non-dev must understand every line.
2. Outcomes over mechanics — say what it does now, not what code changed.
3. Never invent work — Mode 1 traces commits/diffs; Mode 2 uses only the user's notes (+ verified code when asked).
4. No empty sections, no "miscellaneous" catch-all unless the user asks.
5. Always output in a single code block.

## Sheet Integration

When the user asks to write the update into the tracking spreadsheet (SharePoint Excel), read `references/sharepoint-excel.md` FIRST — it holds the integration status, auth setup, script usage, and blockers. Status: PENDING admin consent; manual paste is the current flow.
