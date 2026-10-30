---
name: security-review
description: Application and API security review  -  authentication, RBAC/scope enforcement, SQLi/XSS prevention, input validation, file uploads, CSRF, rate limiting, and secrets.
---

# Security Review & Hardening

Apply proactively when writing or reviewing auth, RBAC, new API routes, file uploads, external integrations, or database queries.

## Mandatory Security Checklist
1. **Authentication & Session Integrity:** Verify authentication middleware + active session validation on all protected routes; httpOnly, Secure, SameSite cookies; CSRF double-submit verification on state-changing requests.
2. **Authorization & Tenant/Resource Scope (IDOR Prevention):**
   - Every route must enforce RBAC/permission middleware (e.g., `requireAccess(resource, action)`).
   - Every tenant-, organization-, or user-scoped endpoint must enforce scope verification (e.g., verifying `tenantId`, `orgId`, or owner scope on services/repositories). Never trust client-supplied scope or entity IDs without verifying ownership against the authenticated session.
3. **Injection Prevention:** Parameterized SQL/query-builder queries only. Whitelist dynamic sort/identifier columns. Escape/sanitize HTML or user-supplied strings.
4. **Race Conditions & Locking:** Use `SELECT ... FOR UPDATE` (in deterministic ID order) and atomic compare-and-set (`WHERE status = DRAFT` / `version = expected`) on state transitions and balance/quota updates.
5. **Secrets & Error Hygiene:** Zero hardcoded credentials; validate env vars at startup; never leak stack traces, internal IDs, or tokens in logs or error responses.

## Deep Reference (Load On Demand)
- Full OWASP application security guide: `references/detailed-guide.md`
- Cloud & infrastructure security checklist: `references/cloud-infrastructure-security.md`
