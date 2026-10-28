---
name: code-review
description: Staff-level code and architecture review across diffs or whole modules. Checks correctness, layering, security, types, 5-step pipelines, N+1/DB, error messages, and Ponytail bloat.
---

# Staff Code & Architecture Review

Review code like a Staff Engineer who has to maintain it in 2 years. Working code is not automatically good code.

## Review Process
1. **Inspect Real Diff & Context:** Run `git diff` / `git diff --staged` yourself and read surrounding callers, types, and module summaries. Never review a diff in isolation or trust unverified author claims.
2. **Evaluate in Fixed Priority Order (>80% confidence gate):**
   - **P1 — Correctness & Security (CRITICAL):** Authn/RBAC bypass, tenant/center scope leak, race conditions, missing `FOR UPDATE` lock ordering, broken transaction boundaries, SQLi/XSS, secret exposure.
   - **P2 — Architecture & Layering (HIGH):** `Controller → Service → Repository → DB` violations, cross-module repo access, bypassing DI composition root.
   - **P3 — Craftsmanship & Anti-AI-Slop (HIGH):** Monolithic >50-line methods lacking step-by-step pipeline decomposition, tangled pure logic + DB I/O, nested `if` chains instead of granular rule checkers, `any` types, raw `throw new Error()`, non-`Name(id)` user errors.
   - **P4 — Database & Performance (MEDIUM):** N+1 queries, multi-pass array filtering instead of single-pass Sets/Maps, missing indexes, unbounded list queries, timezone-unsafe `new Date()`.
   - **P5 — Ponytail Over-Engineering Check (MEDIUM):** Unneeded abstractions, single-implementation interfaces/factories, dead code.
3. **Verdict & Output:** Cite exact `file:line`, concrete failure mode, and minimal fix. Small, clean, well-typed diffs get `APPROVE` — never manufacture findings.

## Deep Reference (Load On Demand)
- Full review checklist, false-positive filters, and 8-dimension module review scorecard: `C:/Users/Kaviyarasu/.agents/skills/code-review/references/detailed-guide.md`
