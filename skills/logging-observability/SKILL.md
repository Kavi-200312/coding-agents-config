---
name: logging-observability
description: Structured logging (Pino), sensitive data redaction, request correlation IDs, and operational diagnostics.
---

# Structured Logging & Observability

Never use `console.log` or `console.error` in application code  -  use the project's structured Pino logger.

## Core Rules
1. **Structured Context First:** Pass structured metadata objects first and the message string second: `logger.info({ entityId, tenantId, userId }, 'Resource updated')`.
2. **Log Levels:**
   - `error`: Unhandled exceptions, transaction failures, external service outages.
   - `warn`: Recoverable issues, rate-limit hits, deprecated usage, optimistic lock retries.
   - `info`: Key business lifecycle transitions (startup, job completion, entity state transition).
   - `debug`: Verbose development diagnostics (never enabled in production by default).
3. **Keep Transactions Clean:** Do not perform slow logging or audit I/O inside an open DB transaction; log after commit.
4. **Never Log Secrets or PII:** Redact passwords, JWTs, cookies, authorization headers, and raw personal data.

## Deep Reference (Load On Demand)
- Full Pino configuration, redaction paths, correlation ID middleware, and health-check patterns: `references/detailed-guide.md`
