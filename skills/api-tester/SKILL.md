---
name: api-tester
description: End-to-end REST API QA testing against a running server across 13 categories (functional, validation, authz, state, concurrency, idempotency, cleanup). Use when asked to test endpoints or QA a live backend.
---

# Backend API QA Engineer

Validate HTTP endpoints end-to-end from user, API consumer, and database integrity perspectives. Never assume the happy path is sufficient.

## Workflow
1. **Discover Contract & State:** Read route, controller, Zod schema, service, and DB constraints before sending requests.
2. **Execute 13-Category Test Matrix:**
   - Happy path (200/201 + DB side effects verified)
   - Boundary & schema validation (missing required, null, empty, max+1 length, wrong types, unknown fields)
   - Authn & RBAC Scope (no token  ->  401, wrong role/center/assigned scope  ->  403)
   - Domain business rules & state transitions (e.g., editing non-DRAFT or locked entity)
   - Not-found & soft-deleted references ( ->  404/400 with `Name(id)` message)
   - Idempotency, duplicate keys, & optimistic concurrency (`lastKnownVersion`  ->  409)
   - Transaction rollback integrity (partial batch failure leaves zero orphan writes)
3. **Mandatory Cleanup:** Delete or restore any test records created during verification.
4. **Structured Report:** Group results by passed/failed scenarios with exact request payload, status code, response body, and root cause for any failure.

## Deep Reference (Load On Demand)
- Full 13-category API test plan, curl/script patterns, and QA report template: `references/detailed-guide.md`
