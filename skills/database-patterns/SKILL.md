---
name: database-patterns
description: SQL/MySQL/Postgres and Kysely database patterns — schema design, migrations, composite indexing, row locking, transactions, soft delete, and N+1 elimination.
---

# Database & Query Optimization Patterns

Check project-specific DB rules (`.agent/rules/database.md`, `.agent/rules/repository-conventions.md`, `database/raw_schema.sql`, `database/module-groups.json`) first when present.

## Core Rules
1. **Repository Ownership:** All queries live in `*.repository.ts`. Declare table constants as `private readonly` fields and alias joined tables with 2–4 char aliases (`student as s`).
2. **Batching & Zero N+1:** Never run queries inside loops. Batch-fetch child rows with `WHERE parent_id IN (...)` and group in memory via `Map<parentId, Child[]>`. Bulk-update rows using single-statement `CASE id WHEN ...` helpers.
3. **Short, Deadlock-Safe Transactions:** Wrap multi-step writes in `db.transaction().execute(async (trx) => ...)`. Lock parent/item rows `FOR UPDATE` in ascending `id` order. Never perform HTTP calls, logging, or fire-and-forget audit writes inside a transaction.
4. **Date/Time & Soft-Delete Safety:** Never pass `new Date()` for DB writes (use `sql`now()`` / `DateUtils.nowUtc()`). Respect `deleted_at` / `is_deleted` via `withActiveOnly`.
5. **Migrations:** One concern per migration with reversible `down`. Register every new table in `database/module-groups.json`. Require user approval before running `npm run db:migrate`.

## Deep Reference (Load On Demand)
- Detailed indexing strategies, query plans, connection pooling, and migration patterns: `C:/Users/Kaviyarasu/.agents/skills/database-patterns/references/detailed-guide.md`
