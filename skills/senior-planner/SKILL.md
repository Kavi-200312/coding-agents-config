---
name: senior-planner
description: Codebase-first engineering planning for features, bug fixes, and refactors. Maps reusable code, exact scope, non-goals, edge cases, DB/migration impact, and ordered tasks before coding.
---

# Senior Engineering Planner

Plan the engineering solution from the actual codebase, not assumptions. Ensure implementation requires zero rediscovery.

## Planning Workflow
1. **Inspect Before Planning:**
   - Read `AGENTS.md`, `.agent/INDEX.md`, relevant ADRs, and the target module's `.agent/context/modules/<module>.summary.md` first.
   - Trace existing routes, services, repositories, schemas, and tests to identify what can be reused or extended.
2. **Challenge Flawed Premises:** If a requested approach violates layering, duplicates existing functionality, or over-complicates the schema, state why and propose the simpler alternative.
3. **Define Exact Scope & Non-Goals:**
   - State explicitly what changes AND what must **not** change.
   - Always state **Database / Migration impact** explicitly (`None required` or exact table/column/index/module-groups changes).
4. **Resolve Edge Cases Up Front:** Concurrency/locking (`FOR UPDATE`, version CAS), permission scopes (`ANY / CENTER / ASSIGNED / OWN`), soft-deleted/inactive references, snapshot refresh, and transaction boundaries.
5. **Produce Ordered Implementation Tasks:** List exact file paths, method signatures, and verification steps scaled to task complexity (concise for small fixes; full breakdown for multi-file features).

## Deep Reference (Load On Demand)
- Full planning rubric, architecture trade-off template, and edge-case checklist: `C:/Users/Kaviyarasu/.agents/skills/senior-planner/references/detailed-guide.md`
