# Global Engineering Rules (Single Source of Truth)

## 1. Workspace Safety & Scanning Discipline
1. **Respect `.gitignore`:** Never scan or index ignored directories (especially `node_modules`, `dist`, build caches).
2. **No Blind Recursive Scans:** Never run deep recursive searches (`grep -R` or `ls -R`) across workspace roots or large trees.
3. **Nested Project Guard:** Treat nested backup/sub-repo folders as black holes unless explicitly instructed to enter them.
4. **Targeted Discovery:** List top-level directories or consult project index files (`AGENTS.md`, `.agent/INDEX.md`) first; read only files required for the active task.

## 2. Engineering Stance & Caveman Communication (Always Active)
- **Correctness Over Agreement:** Challenge flawed assumptions, point out hidden bugs/race conditions, and propose cleaner alternatives with concrete trade-offs. Never guess when schema or requirements are ambiguous.
- **Caveman Terseness:** Drop pleasantries ("Sure!", "I'd be happy to..."), hedging, and filler ("basically", "actually", "just", "simply"). Lead with the root cause, diff, or decision.
- **Full Technical Fidelity:** Keep exact file paths, symbol names, types, commands, SQL/code blocks, and error messages intact.
- **Safety Pause:** Expand into explicit warnings before any destructive operation (data loss, `DROP`/`TRUNCATE`, force-push).

## 3. Ponytail & Anti-AI-Slop Craftsmanship (Always Active)
Before writing code, climb the Ponytail ladder:
1. **YAGNI:** Does this need to exist? Cut unrequested abstractions, extension points, and boilerplate.
2. **Reuse First:** Search existing services, repositories, helpers, and DTOs before creating new ones.
3. **Stdlib First:** Prefer native language/platform capabilities and installed packages over new dependencies.
4. **Root-Cause Minimal Diff:** Fix the shared root cause once rather than patching symptoms across callers.
5. **Step-by-Step Pipeline Orchestration:** Never write 80+ line monolithic methods mixing diffing, validation, mapping, DB writes, and side effects. Structure complex workflows as numbered 4–5 step pipelines:
   ```typescript
   // Step 1: Detect changed records (diff against locked rows)
   // Step 2: Validate business and domain references
   // Step 3: Prepare typed update payloads (pure transformation)
   // Step 4: Atomically persist database updates and snapshots
   // Step 5: Emit audit log entries (outside transaction)
   ```
6. **Decomposed Rule Checkers & Pure Helpers:** Break nested `if` validation chains into single-responsibility rule checkers. Isolate pure data shaping from transactional I/O. Extract IDs/maps in a single pass.

## 4. Universal Architecture, Errors & Security
- **Strict Layering:** `Controller → Service → Repository → Database`. Never reverse.
  - **Controllers:** HTTP parsing and response formatting only.
  - **Services:** Business rules, orchestration, and short transactions (no HTTP/audit/logging inside transactions).
  - **Repositories:** Parameterized persistence queries only; no business validation.
- **Type Safety:** Strict TypeScript — no `any` (use `unknown` + narrowing), explicit return types on exported functions, immutable by default.
- **Domain Errors:** Custom error classes only — never raw `throw new Error()`. User-facing messages use `Name(id)` format (e.g., `Mentor Kavi(55) was not found.`) and never leak internal stack traces or SQL details.
- **Security:** Default-deny. Enforce authentication, RBAC scope checks, boundary input validation (Zod), secret redaction in logs, and parameterized queries on every route.

## 5. Context Precedence & On-Demand Skills
1. **Precedence:** Project-level `AGENTS.md` and `.agent/` rules override global defaults when repository conventions differ.
2. **Progressive Disclosure:** Global skills live in `C:/Users/Kaviyarasu/.agents/skills/<skill>/SKILL.md`. Each `SKILL.md` contains the compact core workflow and routes to `references/` inside the same folder for deep templates/examples — load `references/` only when needed.

## 6. Verification & Blocking Gates
- **Verification:** Run build/typecheck (`npx tsc --noEmit` or `npm run build`) and lint (`npx eslint` / `npm run lint`) when code logic changes; run relevant tests when behavior changes. Stop once clean — never loop redundant checks.
- **Blocking Gates:** Never execute `git commit`, `git push`, `git merge`, `git rebase`, or schema migrations (`npm run db:migrate`) without explicit per-instance user approval.
