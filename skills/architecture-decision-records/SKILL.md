---
name: architecture-decision-records
description: Write and maintain Architecture Decision Records (ADRs) when making significant structural, schema, security, or pattern choices.
---

# Architecture Decision Records (ADRs)

Record architectural decisions so future sessions understand *why* a design was chosen and what alternatives were rejected.

## When to Create or Update an ADR
- Introducing or changing a cross-cutting pattern (DI composition root, soft-delete, snapshot strategy, auth/CSRF, ORM plugin).
- Choosing between 2+ viable schema or service architectures with non-obvious trade-offs.
- Superseding an older ADR (mark old ADR as `Superseded by ADR-NNN`).

## Compact ADR Structure
1. **Title & Metadata:** `ADR-NNN: Short Decision Title`, Status (`Proposed | Accepted | Superseded`), Date, Context/Modules affected.
2. **Context & Problem:** Concrete technical constraint or failure mode that forced the decision (2 - 4 sentences).
3. **Decision:** Exact pattern, rule, and enforcement mechanism adopted.
4. **Alternatives Rejected:** Bullet list of options considered and why each was rejected.
5. **Consequences:** Positive outcomes, trade-offs accepted, and migration/maintenance rules.

## Deep Reference (Load On Demand)
- Full ADR templates, lifecycle workflows, and examples: `references/detailed-guide.md`
