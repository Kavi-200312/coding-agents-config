---
name: error-handling
description: Backend error architecture AND user-facing error message design. Enforces custom error classes, centralized ERR_* constants, and human-friendly Name(id) labels.
---

# Error Handling & User-Facing Error Messages

Apply whenever throwing, catching, formatting, or reviewing errors across services, controllers, and validators.

## Core Rules
1. **Custom Error Classes Only:** Never use raw `throw new Error(...)` in application code. Use domain error classes (`BadRequestError`, `NotFoundError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`).
2. **Label-Over-ID (`Name(id)` Format):** User-facing messages must include the human-readable entity label alongside the ID:
   - Good: `Mentor Kavi(55) was not found.` / `Activity Painting(12) does not belong to Skill category Motor Skills(3).`
   - Bad: `Mentor with id=55 not found` or raw DB/enum codes.
3. **3-Part Diagnostic Message Structure:** When an action fails a business rule, state: (1) what failed with `Name(id)`, (2) why (the current state/constraint), and (3) how the user can resolve it.
4. **Centralized `ERR_*` Constants:** Define reusable message builders (`export const ERR_X_NOT_FOUND = (label: string, id: number) => ...`) in module schema/constants files rather than scattering inline strings.
5. **Boundary Translation:** Let global error middleware map `BaseError`, `ZodError`, and DB constraint codes (`ER_DUP_ENTRY` → 409 `ConflictError`) into the standard error response envelope without leaking SQL or stack traces.

## Deep Reference (Load On Demand)
- Full user-facing error message guide & examples, plus TypeScript/Python/Go retry & circuit-breaker patterns: `C:/Users/Kaviyarasu/.agents/skills/error-handling/references/detailed-guide.md`
