---
name: instruction-audit
description: Scans global ~/.agents and project-level instruction files (.agent/, AGENTS.md, rules) to detect stale references, duplicate/conflicting rules, and token bloat. Run on demand or during sprint cleanups.
---

# Instruction Audit & Anti-Bloat Skill

Keep agent instruction files lean, high-signal, and aligned with the single source of truth (SSOT).

## Core Responsibilities

1. **Token Budget Enforcement:**
   - Global `~/.agents/AGENTS.md` must stay under **100 lines**.
   - Project root `AGENTS.md` must stay under **150 lines**.
   - Flag any `SKILL.md` body exceeding **500 lines** (move details into `references/`).

2. **Deduplication Check:**
   - Scan for rules declared in both global `~/.agents/AGENTS.md` and repository-level `AGENTS.md`.
   - Global rules must contain ONLY cross-repo universal truths (e.g. Caveman, YAGNI, layering, UTC dates).
   - Project rules must contain ONLY repo-specific deltas (e.g. specific table conventions, migration commands, local module summaries).

3. **Stale Reference Verification:**
   - Grep for file paths, symbol names, and migration commands mentioned in instruction files against the actual repository tree.
   - Flag any references to deleted files, deprecated modules, or nonexistent tools.

4. **Output Format:**
   Produce an actionable diff proposal:
   ```markdown
   ## Instruction Audit Findings
   - [ ] Stale: `src/path/to/old-file.ts` mentioned in AGENTS.md does not exist. (Delete)
   - [ ] Redundant: Layering rule duplicated in project AGENTS.md. (Remove from project file)
   - [ ] Bloat: Skill `X` body has 620 lines. (Move 200 lines to references/deep-dive.md)
   ```
   **Never edit instruction files directly without user review and confirmation.**
