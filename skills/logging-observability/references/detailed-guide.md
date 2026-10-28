# Logging & Observability Patterns

Structured logging and observability patterns for production applications. Enforces the AGENTS.md rule: no `console.log` — use a logger.

## When to Activate

- Replacing `console.log` / `console.error` with structured logging
- Setting up a logging library (pino, winston, structlog, zap)
- Adding correlation IDs or request tracing
- Configuring log levels for different environments
- Redacting sensitive data from logs
- Building observability (metrics, traces, structured events)
- Debugging production issues with logs

## Core Principles

1. **No `console.log` in production code** — use a structured logger
2. **Structured logs, not string interpolation** — log JSON objects, not formatted strings
3. **Log levels mean something** — DEBUG, INFO, WARN, ERROR, FATAL have distinct purposes
4. **Never log secrets** — passwords, tokens, API keys, PII must be redacted
5. **Every request gets a correlation ID** — trace a single request across services

## Structured Logger

### TypeScript (pino — recommended for Node.js)

```typescript
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['password', 'token', 'apiKey', 'authorization', '*.password', '*.token'],
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: { 'user-agent': req.headers['user-agent'] },
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
})

// Usage — pass structured context, not interpolated strings
logger.info({ userId: user.id, action: 'login' }, 'User authenticated')
logger.error({ error, requestId, userId }, 'Failed to process payment')
```

### Python (structlog)

```python
import structlog

logger = structlog.get_logger()

# Usage — keyword arguments become structured fields
logger.info("user_authenticated", user_id=user.id, action="login")
logger.error("payment_failed", error=str(error), request_id=request_id, user_id=user.id)
```

### Go (slog)

```go
import "log/slog"

slog.Info("user authenticated", "user_id", user.ID, "action", "login")
slog.Error("payment failed", "error", err, "request_id", requestID, "user_id", user.ID)
```

## Log Levels

| Level | When to Use | Example |
|-------|------------|---------|
| DEBUG | Detailed diagnostic info (dev only) | "Cache miss for user:abc" |
| INFO | Routine operations, business events | "User abc logged in", "Order 123 created" |
| WARN | Unexpected but recoverable situations | "Rate limit at 80% capacity", "Fallback to substring search" |
| ERROR | Operation failed but app continues | "Failed to send email", "Database query timed out" |
| FATAL | App cannot continue, will exit | "Database connection lost", "Config file missing" |

```typescript
// PASS: Correct level usage
logger.debug({ sql }, 'Executing query')           // dev diagnostics
logger.info({ userId, orderId }, 'Order created')  // business event
logger.warn({ usage: 0.8 }, 'Rate limit approaching threshold')
logger.error({ error, orderId }, 'Payment processing failed')
// logger.fatal(...) — app is shutting down

// FAIL: Wrong levels
logger.error('User logged in')     // INFO event, not ERROR
logger.info('Database is down!')   // This is ERROR or FATAL
console.log('debug value:', x)     // Use logger.debug
```

## Correlation IDs

### Request-Scoped Correlation

```typescript
import { randomUUID } from 'crypto'
import { logger } from '@/lib/logger'
import type { NextRequest } from 'next/server'

export function withCorrelationId(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    const requestId = req.headers.get('x-request-id') ?? randomUUID()

    // Bind the correlation ID to the logger for this request
    const requestLogger = logger.child({ requestId })

    // Store on the request for downstream use
    (req as any).logger = requestLogger
    (req as any).requestId = requestId

    const response = await handler(req)

    // Echo back so clients can trace
    response.headers.set('x-request-id', requestId)
    return response
  }
}

// Usage in a route
export const GET = withCorrelationId(async (req) => {
  const log = (req as any).logger as pino.Logger

  log.info({ action: 'fetch_users' }, 'Fetching users')
  const users = await fetchUsers()
  log.info({ count: users.length }, 'Users fetched')

  return Response.json({ data: users })
})
```

### AsyncLocalStorage (Node.js — for non-request contexts)

```typescript
import { AsyncLocalStorage } from 'async_hooks'

interface RequestContext {
  requestId: string
  userId?: string
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

// Access the correlation ID anywhere in the call chain
function getContextLogger(): pino.Logger {
  const ctx = requestContext.getStore()
  return ctx ? logger.child({ requestId: ctx.requestId, userId: ctx.userId }) : logger
}
```

## Sensitive Data Redaction

### Redact Paths

```typescript
import pino from 'pino'

const logger = pino({
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'api_key',
      'authorization',
      'secret',
      '*.password',
      '*.token',
      '*.apiKey',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
})

// This will automatically redact sensitive fields:
// logger.info({ user: { email: 'a@b.com', password: 'secret123' } }, 'User data')
// Output: { user: { email: 'a@b.com', password: '[REDACTED]' } }
```

### Manual Redaction for Complex Cases

```typescript
function redactSensitiveFields(data: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = ['password', 'token', 'apiKey', 'secret', 'cvv', 'ssn']

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s))) {
        return [key, '[REDACTED]']
      }
      if (typeof value === 'object' && value !== null) {
        return [key, redactSensitiveFields(value as Record<string, unknown>)]
      }
      return [key, value]
    }),
  )
}

// Usage
logger.info({ body: redactSensitiveFields(reqBody) }, 'Processing request')
```

## What to Log

### Always Log

- Business events (user created, order placed, payment processed)
- Errors with full context (what operation, which entity, what input)
- External API calls (service, endpoint, duration, status)
- Authentication events (login success/failure, token refresh)
- Slow operations (query took > 1s, API call > 2s)

### Never Log

- Passwords, tokens, API keys, session IDs
- Full credit card numbers (log last 4 only)
- PII in plain text (emails, phone numbers — hash or redact)
- Full request bodies with sensitive fields
- Stack traces to users (log server-side only)

```typescript
// PASS: Safe logging
logger.info({ userId: user.id, last4: card.last4 }, 'Payment processed')

// FAIL: Leaks sensitive data
logger.info({ cardNumber: card.fullNumber, cvv: card.cvv }, 'Payment processed')
console.log('User password:', password)
```

## Observability Beyond Logs

### Metrics (counters, gauges, histograms)

```typescript
// Track business metrics alongside logs
const metrics = {
  ordersCreated: new Counter('orders_created_total'),
  activeUsers: new Gauge('active_users'),
  requestDuration: new Histogram('http_request_duration_seconds'),
}

// Increment on business events
metrics.ordersCreated.inc({ status: 'success' })
metrics.requestDuration.observe({ method: 'GET', path: '/api/users' }, durationMs / 1000)
```

### Health Checks

```typescript
export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkExternalApi(),
  ])

  const allHealthy = checks.every(c => c.healthy)

  return Response.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks: Object.fromEntries(checks.map(c => [c.name, c.healthy])),
    },
    { status: allHealthy ? 200 : 503 },
  )
}
```

## Logging Checklist

Before shipping code with logging:

- [ ] No `console.log` or `console.error` — use a structured logger
- [ ] Log levels correct (INFO for events, WARN for recoverable, ERROR for failures)
- [ ] Sensitive fields redacted (passwords, tokens, PII)
- [ ] Correlation ID attached to every request
- [ ] Business events logged with entity IDs
- [ ] Errors logged with full context before rethrowing
- [ ] External API calls logged with duration and status
- [ ] Log format is structured JSON (parseable by log aggregators)
