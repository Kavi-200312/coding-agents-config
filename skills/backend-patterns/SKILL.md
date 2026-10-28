---
name: backend-patterns
description: Node.js/Express/TypeScript backend architecture  -  Controller-Service-Repository layering, 5-step service pipelines, DI composition root, transactions, and caching.
---

# Backend Architecture Patterns

Check project-specific rules (`.agent/rules/code-standards.md`, `.agent/rules/architecture.md`) first when present.

## Core Rules
1. **Strict Layering (`Controller  ->  Service  ->  Repository  ->  DB`):**
   - **Controllers:** Arrow-property HTTP handlers; parse `req`, call service, return `sendSuccess`. Zero business logic.
   - **Services:** Business rules, cross-module coordination (via injected services/adapters), and short transactions.
   - **Repositories:** Parameterized Kysely/SQL queries only. Accept optional `trx?: Transaction<DB>`.
2. **Multi-Step Pipeline Orchestration:**
   Structure complex service methods as a 5-step table of contents delegating to focused helpers:
   - `Step 1:` Detect changed records / lock target rows (`FOR UPDATE` in ascending ID order)
   - `Step 2:` Batch-validate domain & cross-module references (single-pass ID extraction)
   - `Step 3:` Prepare typed update payloads & group by aggregate (pure, side-effect-free helper)
   - `Step 4:` Persist bulk updates & refresh snapshots inside transaction
   - `Step 5:` Emit audit logs and side effects *after* transaction commits
3. **DI Composition Root:** Construct repositories, services, and controllers once in the composition root / module factory. Never `new` services inside route files.

## Deep Reference (Load On Demand)
- Full code templates for Repository/Service layers, Redis caching, rate limiting, background queues, and retry patterns: `references/detailed-guide.md`
