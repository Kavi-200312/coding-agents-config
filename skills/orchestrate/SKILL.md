---
name: orchestrate
description: Coordinate complex multi-file backend features across 4 lean stages (Triage → Architect → Implementer → Reviewer + conditional specialists). Use on "/orchestrate" or large cross-module tasks.
---

# Lean 4-Stage Feature Orchestration

Coordinate complex features (>5 files or cross-module changes) with strict stage boundaries and compact handoff envelopes.

## When NOT to Orchestrate (Work Inline Instead)
- Single-file tasks, bug fixes, or refactors touching <5 files and <100 LOC → **work inline** using project rules. Do not spawn subagents for small tasks.

## 4-Stage Pipeline (When Activated)
1. **Stage 1 — Triage (Inline):** Read `AGENTS.md`, `.agent/INDEX.md`, and the target module's `.agent/context/modules/<module>.summary.md`. Identify affected files and classify scope.
2. **Stage 2 — Architect (`architect`):** Performs codebase discovery, reusability mapping, system design, and ordered task breakdown in a single specification artifact (with Ponytail YAGNI guard).
3. **Stage 3 — Implementer (`implementer`):** Implements the approved tasks using the 5-step pipeline pattern, reuses existing helpers, and runs build + lint **once** at completion.
4. **Stage 4 — Reviewer (`code-reviewer` + conditional specialists):** Reviews the actual `git diff` for correctness, layering, security, DB/N+1, and Ponytail bloat. Invoke `security-reviewer`, `tester`, or `doc-updater` only when their domain is touched.

## Platform Subagent Execution
- **Antigravity:** Use `invoke_subagent` (`Model: 'inherit'`). Never poll in a loop — Antigravity wakes reactively when subagents complete.
- **Devin CLI:** Use `run_subagent` with structured `ENVELOPE` handoffs (max 5 context files; never pass full transcripts).

## Deep Reference (Load On Demand)
- Full handoff envelope schema, specialist trigger matrix, and fix-loop protocol: `C:/Users/Kaviyarasu/.agents/skills/orchestrate/references/detailed-guide.md`
