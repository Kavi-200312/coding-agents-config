---
name: api-design
description: Design and review REST APIs — resource naming, status codes, pagination, filtering, response envelopes, OpenAPI contracts, and rate limiting.
---

# REST API Design 

Inspect the project's existing router, response helper, validation middleware, and OpenAPI conventions first (e.g., `.agent/rules/api-design.md` if present).

## Core Rules
1. **Resource Nouns & Hierarchy:** Plural kebab-case nouns (`/api/v1/student-groups`, `/weekly-plans/:id/items/:domain`). Never use verbs in URLs except bounded state transitions (`POST /:id/submit`, `POST /:id/unlock`).
2. **HTTP Semantics & Status Codes:**
   - `200 OK` (GET, PATCH, PUT, DELETE with body), `201 Created` (POST), `204 No Content` (empty DELETE).
   - `400 Bad Request` (malformed syntax), `401 Unauthorized` (unauthenticated), `403 Forbidden` (RBAC/scope denied), `404 Not Found`, `409 Conflict` (duplicate/optimistic version mismatch), `422 Unprocessable Entity` (semantic validation), `429 Too Many Requests`.
3. **Consistent Envelope:** Use the project's single response helper (e.g., `sendSuccess(res, data, { message, meta, status })`). Never nest `{ data: { result: ... } }`.
4. **Bounded Lists:** Every collection endpoint MUST paginate (`page`, `limit` capped at ≤100) and whitelist sortable/filterable columns.
5. **Route Middleware Chain:** `authMiddleware → requireAccess(resource, action) → scopeMiddleware → validate(zodSchema) → asyncHandler(controller.action)`.
6. **OpenAPI First:** Register request/response Zod schemas in OpenAPI spec files alongside route changes.

## Deep Reference (Load On Demand)
- Full REST pagination (offset vs cursor), filtering, rate-limiting headers, versioning, and idempotency templates: `C:/Users/Kaviyarasu/.agents/skills/api-design/references/detailed-guide.md`
