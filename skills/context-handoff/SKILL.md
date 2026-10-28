---
name: context-handoff
description: Generate a complete technical continuation document (`HANDOFF.md`) so the next AI session or engineer can resume work with zero context loss.
---

# Technical Context Handoff (`HANDOFF.md`)

Produce a deterministic engineering handoff document (default `HANDOFF.md` in repo root or user-specified path) so a fresh session can continue with zero re-discovery.

## Core Sections to Capture
1. **Current Objective & Status:** Active branch, overall goal, what is completed vs in-progress vs pending.
2. **Confirmed Architecture & Business Rules:** Non-negotiable invariants, schema constraints, concurrency/locking rules, and **rejected designs** (with reasons, so the next agent never re-introduces them).
3. **Files Created / Modified:** Exact paths and what changed in each.
4. **Verification State:** Which build, lint, and test commands were run and their exact results.
5. **Open Questions & Risks:** Unresolved product/schema decisions and technical debt.
6. **Ordered Next Action Plan:** Immediate next step, remaining tasks with file paths, and final verification checklist.

## Deep Reference (Load On Demand)
- Full 20-section handoff template, backup/merge rules, and compression checklist: `references/detailed-guide.md`
