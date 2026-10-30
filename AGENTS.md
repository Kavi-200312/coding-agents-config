# Global Engineering Standards (Single Source of Truth)

## 1. Engineering Stance & Caveman Communication
- **Correctness Over Agreement:** Challenge flawed assumptions, point out hidden bugs/race conditions, and propose cleaner alternatives with concrete trade-offs. Never guess when schema or requirements are ambiguous.
- **Caveman Terseness:** Drop pleasantries ("Sure!", "I'd be happy to..."), hedging, and filler. Lead directly with the root cause, diff, or decision.
- **Technical Fidelity:** Keep exact file paths, symbol names, types, commands, SQL/code blocks, and error messages intact.
- **Explicit Safety Pause:** Expand into clear warnings before any destructive operation (data loss, `DROP`/`TRUNCATE`, force-push).

## 2. Checkpointed Phase Execution (Zero Context Loss)
- **Plan First:** On non-trivial features or refactors (>2 files), produce a bite-sized plan with checkable items (`writing-plans`).
- **Batch Execution (1-2 Tasks Only):** Never implement an entire multi-task plan in one unverified turn. Follow `executing-plans`: implement 1-2 tasks, verify them, and check off the completed items.
- **Fidelity Check:** Before declaring work complete, compare the original plan requirements against the actual `git diff` to confirm zero omitted requirements or forgotten edge cases.

## 3. Anti-Slop Code Quality (10+ Senior Standards)
- **Reuse First (Search Before Authoring):** Never generate new helper functions, queries, or DTOs without grepping the module and shared directories first. Extend or import existing code.
- **No God Methods (<60 LOC Orchestration Cap):** Monolithic functions mixing diffing, validation, persistence, and side effects are banned. Cap complex orchestration functions at ~60 LOC (do not artificially fragment cohesive, single-concern functions purely to satisfy line limits). State-mutating multi-entity database workflows must follow a numbered 5-step pipeline (single reads/queries remain single-step):
  ```typescript
  // Step 1: Detect changed records (diff against locked rows)
  // Step 2: Validate business and domain references
  // Step 3: Prepare typed update payloads (pure transformation)
  // Step 4: Atomically persist database updates (short transaction)
  // Step 5: Emit audit/event logs (outside transaction)
  ```
- **Centralized Constants:** Never inline repeated string literals, status codes, magic numbers, or error strings. Place them in dedicated `*.constants.ts` or enums.
- **High-Signal Comments:** Ban obvious comments (`// assign x`). Comment only the *why*: concurrency constraints, transaction boundaries, business invariants, or race condition mitigations.
- **Ponytail YAGNI Ladder:** Stop at the first rung that holds: YAGNI -> Reuse Existing -> Stdlib -> Single Function -> Clean Minimal Diff.

## 4. Universal Architecture & Security
- **Strict Layering:** `Controller/Interface -> Service/Domain -> Repository/Data Access -> Database`. Never reverse.
  - **Controllers:** Boundary input parsing and HTTP response formatting only.
  - **Services:** Business logic and orchestration only. Keep transactions short; no network calls or external logging inside transactions.
  - **Repositories:** Parameterized persistence queries only; no business validation.
- **Type Safety:** Strict TypeScript — avoid `any` (use `unknown` with type narrowing), explicit return types on public boundaries, immutable by default.
- **Domain Errors:** Dedicated custom error classes only. User-facing messages use `Name(id)` format and never leak SQL or stack traces.
- **Date/Time Precision:** Always use UTC for database writes and timestamp calculations (`DateUtils.nowUtc()`). Never rely on server timezone.

## 5. Verification & Completion Gate
- **Evidence Before Assertions:** Never claim a task is complete, fixed, or passing without executing the verification command (`npm run build`, `npm test`, or typecheck) and inspecting the output (`verification-before-completion`).
- **Diff Self-Review:** Inspect `git diff` before committing (`requesting-code-review`) to verify zero slop, no unused imports, and no broken abstractions.

## 6. Skills: Progressive Disclosure & Workflow Fidelity
- **Read `SKILL.md` completely first:** When a skill is invoked, read its full `SKILL.md` before taking action. Never act on the description or header alone; execute the documented workflow.
- **Progressive reference loading:** Load linked deep references (`references/`, checklists, detailed guides) *on demand* when the active task touches that specific topic. Do not unconditionally dump all references into context on simple tasks.
- **Workflow rules are mandatory:** If `SKILL.md` (or a relevant referenced workflow file) defines approval gates, file formats, verification steps, or safety pauses, follow them strictly.
- **Apply to every skill** — project, global, and plugin — whenever its domain matches the task.
