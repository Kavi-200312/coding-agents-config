---
name: input-validation
description: Boundary input validation and sanitization using Zod schemas (params, query, body, file uploads, and cross-field refinements).
---

# Boundary Input Validation

Treat all external input (`req.params`, `req.query`, `req.body`, headers, webhooks, uploaded files) as untrusted until validated at the HTTP boundary.

## Core Rules
1. **Validate at the Route Boundary:** Every write route and parameterized read route must validate `params`, `query`, and `body` via Zod middleware before entering the controller/service.
2. **Strict Schema Design:**
   - Bound all strings (`.trim().min(1).max(N)`), arrays (`.min(1).max(N)`), and numbers (`.int().positive()`).
   - Use `z.enum(...)` or `z.nativeEnum(...)` backed by shared constants.
   - Use `.superRefine` or discriminated unions for cross-field rules (e.g., `sessionStatus === 'MISSED'` requires `missedReason`; `OTHER` requires `missedReasonCustom`).
3. **Derive TypeScript Types from Schemas:** Use `type Input = z.infer<typeof schema>` as the single source of truth for DTOs and OpenAPI registration.
4. **File Uploads:** Validate MIME type, file extension, magic bytes, and size limits before processing or storing.

## Deep Reference (Load On Demand)
- Detailed Zod patterns, sanitization helpers, and file-upload validation examples: `C:/Users/Kaviyarasu/.agents/skills/input-validation/references/detailed-guide.md`
