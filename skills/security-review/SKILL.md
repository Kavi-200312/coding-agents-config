---
name: security-review
description: Application and API security review — authentication, RBAC/scope enforcement, SQLi/XSS prevention, input validation, file uploads, CSRF, rate limiting, and secrets.
---

# Security Review & Hardening

Apply proactively when writing or reviewing auth, RBAC, new API routes, file uploads, external integrations, or database queries.

## Mandatory Security Checklist
1. **Authentication & Session Integrity:** Verify `authMiddleware` + active session validation on all protected routes; httpOnly, Secure, SameSite cookies; CSRF double-submit verification on state-changing requests.
2. **Authorization & Tenant/Center Scope (IDOR Prevention):**
   - Every route must enforce `requireAccess(resource, action)`.
   - Every center- or mentor-scoped endpoint must enforce `enforceRequestCenterScope` or scoped service lookups (`getActiveStudentScoped`, `resolveScopedCenterId`). Never trust `centerId` or entity IDs from the client without verifying ownership/scope.
3. **Injection Prevention:** Parameterized Kysely/SQL queries only. Whitelist dynamic sort/identifier columns. Escape/sanitize HTML or user-supplied strings.
4. **Race Conditions & Locking:** Use `SELECT ... FOR UPDATE` (in deterministic ID order) and atomic compare-and-set (`WHERE status = DRAFT` / `version = expected`) on state transitions and balance/quota updates.
5. **Secrets & Error Hygiene:** Zero hardcoded credentials; validate env vars at startup; never leak stack traces, internal IDs, or tokens in logs or error responses.

## Deep Reference (Load On Demand)
- Full OWASP application security guide: `C:/Users/Kaviyarasu/.agents/skills/security-review/references/detailed-guide.md`
- Cloud & infrastructure security checklist: `C:/Users/Kaviyarasu/.agents/skills/security-review/references/cloud-infrastructure-security.md`
