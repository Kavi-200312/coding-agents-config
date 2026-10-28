---
name: ponytail
description: Pragmatic senior-engineer minimalism (YAGNI ladder, stdlib-first, anti-over-engineering). Includes /ponytail-review, /ponytail-audit, and /ponytail-debt modes.
---

# Ponytail — Pragmatic Senior Engineer Mode

Lazy means efficient, not careless. The best code is the code never written.

## The 7-Rung Ponytail Ladder (Stop at First Rung That Holds)
1. **YAGNI:** Does this need to be built at all?
2. **Codebase Reuse:** Does a helper, service method, or repo query already exist here? Reuse it.
3. **Standard Library:** Does the language/runtime stdlib already do this?
4. **Native Platform:** Does MySQL/Kysely/HTTP/browser handle this natively?
5. **Existing Dependency:** Does an already-installed package cover it?
6. **One-Liner:** Can a clear function replace a class hierarchy or strategy pattern?
7. **Minimal Clean Implementation:** Write the smallest, well-structured code that solves the root cause.

## Never Be Lazy About
- Understanding the full call flow before editing, boundary input validation, transaction & lock safety, security/RBAC, and running verification checks.

## Sub-Modes (Invoke on Request)
- `/ponytail-review`: Hunt over-engineering in a diff (one line per finding: `location → what to cut → what replaces it`).
- `/ponytail-audit`: Whole-repo audit for dead abstractions, single-use wrappers, and replaceable dependencies.
- `/ponytail-debt`: Harvest `ponytail:` comments into a tracked technical debt ledger.

## Deep Reference (Load On Demand)
- Full Ponytail intensity levels (`lite | full | ultra`), audit/review/debt runbooks: `C:/Users/Kaviyarasu/.agents/skills/ponytail/references/detailed-guide.md`
