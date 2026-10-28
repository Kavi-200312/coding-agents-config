# User-Facing Error Messages Guide

# Error Messages — Generic Principles

Apply on every throw, every guard clause, every validation failure.

## Rules

### 1. Never `throw new Error(...)` — use project's custom error classes

Find the project's error hierarchy: `src/shared/errors/`, `src/errors/`, `lib/errors/`. Common classes: `BadRequestError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `InternalServerError`. If none exists, ask before using stdlib — right fix may be introducing the hierarchy.

```typescript
// NEVER (project has custom errors)
throw new Error('Section not found');
// ALWAYS
throw new NotFoundError(ERR_NOT_FOUND_SECTION(sectionId));
```

Python: custom exception classes, never `raise Exception(...)`. Go: typed sentinel/wrapped errors, never `errors.New` in business logic.

### 2. Messages for end users, not developers

End user = non-technical. They don't know: table names, raw enum codes, foreign keys, optimistic locking, transactions, DB driver codes (`ER_DUP_ENTRY`). They do know: domain nouns in plain language, statuses in plain English, their own data (titles, codes, names, emails).

### 3. Label over id — pass title/name when row is loaded

Id stays in parens as fallback for support/debugging.

```typescript
// BAD
throw new BadRequestError(`Section(${id}) has no categories`);
throw new BadRequestError(`${ERR_X} (section id ${s.id})`);
// GOOD
throw new BadRequestError(ERR_SECTION_MIN_CATEGORIES(s.title, s.id));
// → 'Section "Overview"(5) has no categories. Add at least one category before publishing.'
```

**Format:**
- Labeled: `Noun "label"(id)` — quote immediately followed by parens, no space
- Id-only: `Noun id` — bare id, no parens, no "id" prefix

```typescript
// GOOD
`Section "Overview"(5) has no categories.`        // labeled
`Section 5 was not found.`                         // id-only (no row loaded)
```

**Exception:** Label is itself long payload (200-char question, paragraph description) → id-only. Embedding paragraphs in errors is unreadable.

### 4. Centralize in a constants file

Module has one file: `*.messages.ts` / `*.errors.ts` / `messages.py` / `errors.rs`. Export constants (strings or functions). Never inline literals in services. Duplicated strings across services = bug.

```typescript
// messages.ts
export const ERR_NOT_FOUND_SECTION = (id: number): string => `Section ${id} was not found`;
// service
import { ERR_NOT_FOUND_SECTION } from './messages';
throw new NotFoundError(ERR_NOT_FOUND_SECTION(id));
```

Why: translators, product review, bulk rewording hit one file. Services stay logic-only.

### 5. Structure — up to 3 parts

1. **What's wrong** — entity by label, id in parens
2. **Why** (if not obvious) — one short clause
3. **What to do** — the fix, next step

```
Section "Overview"(5) has no categories. Add at least one category before publishing.
└── what ────────────────┘ └── why ─┘ └────────── what to do ──────────────┘
```

Not-found = what only. Conflict = what + what to do. Validation = what + why.

### 6. Wording

| Do | Don't |
|----|-------|
| Domain noun plain language | Table name |
| `draft`, `published`, `archived` | `DRAFT`, `PUBLISHED` (raw enum) |
| `was not found` | `does not exist`, `not found in DB`, `404` |
| `Add at least one X before publishing.` | `ERR_SECTION_MIN_CATEGORIES` |
| `updated by another user. Please refresh.` | `optimistic lock failed, version mismatch` |
| `A form with code "X" already exists.` | `duplicate key value violates unique constraint` |
| `does not belong to this section` | `foreign key mismatch on section_id` |

Tone: direct, helpful, no blame, no exclamation marks, no jargon, no stack traces, no DB driver codes.

### 7. Optimistic-lock conflicts

Tell user to refresh. Never expose `version`, `etag`, `If-Match`, `revision`.

```typescript
throw new VersionConflictError(
  'This form was updated by another user. Please refresh and try again.',
  version.version, // latestVersion — for client retry, NOT display
);
```

### 8. 500s stay technical

500 messages go to logs/APM/Seq/Sentry, not user. Keep technical and specific. Global middleware swaps for generic `'Internal server error'` in HTTP response. Never leak 500 detail to client.

```typescript
throw new InternalServerError(`Order ${orderId} not found after payment callback`);
```

### 9. No duplication

Same message in two services → promote to shared file. Grep before adding:

```bash
rg "ERR_SOMETHING" src/
```

### 10. Bulk validation — domain-extend FieldError, never pollute global

Bulk endpoints need per-row context (entity id, array index) in each error so the frontend maps errors back to rows. Global `FieldError` stays domain-agnostic `{field, message, code?}`. Define a domain extension per bulk endpoint:

```typescript
// module.types.ts
import { FieldError } from '@shared/http/api-response';
export interface BulkAssessFieldError extends FieldError {
  topicId?: number;
  index?: number;
}
```

Never add `topicId`, `refId`, `entityId` to global `FieldError`. `refId` is vague (references what?) and still a domain leak. One extension per bulk endpoint = type-safe, self-documenting, no shared pollution.

Runtime: error middleware passes extra keys through (filters by `field`+`message` existence, doesn't strip extras), so `topicId`/`index` survive into JSON.

## Checklist (every throw)

- [ ] Custom error class (not `Error`)
- [ ] Message from shared constants (not inline literal)
- [ ] Label passed when row loaded
- [ ] No table names, raw enums, jargon, DB driver codes
- [ ] User knows what to do next
- [ ] 500s technical; 4xx user-friendly
- [ ] No duplicated string (grep confirmed)
- [ ] Bulk: domain-extend FieldError (never add entity ids to global)

## Anti-patterns

```typescript
throw new Error('something went wrong');              // ❌ raw Error
throw new BadRequestError(`Section ${id} has no X`);  // ❌ inline literal
throw new BadRequestError(ERR_X);                     // ❌ missing args
throw new BadRequestError(`${ERR_X} (id ${s.id})`);   // ❌ id-only when title available
throw new BadRequestError('wpm_form_versions.status must be DRAFT'); // ❌ jargon
throw new ConflictError('ER_DUP_ENTRY: duplicate key'); // ❌ DB driver code
throw new BadRequestError('Validation failed');       // ❌ no actionable step
// Same string in two files                            // ❌ duplication
```

## Project extension

Projects may have a project-local skill of the same name (`.devin/skills/error-messages/`) adding: exact class names/paths, messages file convention, domain nouns, status enums, real examples. Load both; project specifics override.


---

# Error Handling, Retries & Circuit Breakers

# Error Handling Patterns

Consistent, robust error handling patterns for production applications.

## When to Activate

- Designing error types or exception hierarchies for a new module or service
- Adding retry logic or circuit breakers for unreliable external dependencies
- Reviewing API endpoints for missing error handling
- Implementing user-facing error messages and feedback
- Debugging cascading failures or silent error swallowing

## Core Principles

1. **Fail fast and loudly** — surface errors at the boundary where they occur; don't bury them
2. **Typed errors over string messages** — errors are first-class values with structure
3. **User messages  !=  developer messages** — show friendly text to users, log full context server-side
4. **Never swallow errors silently** — every `catch` block must either handle, re-throw, or log
5. **Errors are part of your API contract** — document every error code a client may receive

## TypeScript / JavaScript

### Typed Error Classes

```typescript
// Define an error hierarchy for your domain
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = this.constructor.name
    // Maintain correct prototype chain in transpiled ES5 JavaScript.
    // Required for `instanceof` checks (e.g., `error instanceof NotFoundError`)
    // to work correctly when extending the built-in Error class.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    // AGENTS.md format: Name(id) was not found.
    super(`${resource}(${id}) was not found.`, 'NOT_FOUND', 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: { field: string; message: string }[]) {
    super(message, 'VALIDATION_ERROR', 422, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(reason = 'Authentication required') {
    super(reason, 'UNAUTHORIZED', 401)
  }
}

export class RateLimitError extends AppError {
  constructor(public readonly retryAfterMs: number) {
    super('Rate limit exceeded', 'RATE_LIMITED', 429)
  }
}
```

### Result Pattern (no-throw style)

For operations where failure is expected and common (parsing, external calls):

```typescript
type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

// Usage
async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const user = await db.users.findUnique({ where: { id } })
    if (!user) return err(new NotFoundError('User', id))
    return ok(user)
  } catch (e) {
    return err(new AppError('Database error', 'DB_ERROR'))
  }
}

const result = await fetchUser('abc-123')
if (!result.ok) {
  // TypeScript knows result.error here
  logger.error('Failed to fetch user', { error: result.error })
  return
}
// TypeScript knows result.value here
logger.info('User fetched', { email: result.value.email })
```

### API Error Handler (Next.js / Express)

```typescript
import { NextRequest, NextResponse } from 'next/server'

function handleApiError(error: unknown): NextResponse {
  // Known application error
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode },
    )
  }

  // Zod validation error
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      },
      { status: 422 },
    )
  }

  // Unexpected error — log details, return generic message
  logger.error('Unexpected error', { error })
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 },
  )
}

export async function POST(req: NextRequest) {
  try {
    // ... handler logic
  } catch (error) {
    return handleApiError(error)
  }
}
```

### React Error Boundary

```typescript
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
    logger.error('Unhandled React error', { error, info })
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// Usage
<ErrorBoundary fallback={<p>Something went wrong. Please refresh.</p>}>
  <MyComponent />
</ErrorBoundary>
```

## Python

### Custom Exception Hierarchy

```python
class AppError(Exception):
    """Base application error."""
    def __init__(self, message: str, code: str, status_code: int = 500):
        super().__init__(message)
        self.code = code
        self.status_code = status_code

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        # AGENTS.md format: Name(id) was not found.
        super().__init__(f"{resource}({id}) was not found.", "NOT_FOUND", 404)

class ValidationError(AppError):
    def __init__(self, message: str, details: list[dict] | None = None):
        super().__init__(message, "VALIDATION_ERROR", 422)
        self.details = details or []
```

### FastAPI Global Exception Handler

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": str(exc)}},
    )

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log full details, return generic message
    logger.exception("Unexpected error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )
```

## Go

### Sentinel Errors and Error Wrapping

```go
package domain

import "errors"

// Sentinel errors for type-checking
var (
    ErrNotFound    = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrConflict     = errors.New("conflict")
)

// Wrap errors with context — never lose the original
func (r *UserRepository) FindByID(ctx context.Context, id string) (*User, error) {
    user, err := r.db.QueryRow(ctx, "SELECT * FROM users WHERE id = $1", id)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, fmt.Errorf("user %s: %w", id, ErrNotFound)
    }
    if err != nil {
        return nil, fmt.Errorf("querying user %s: %w", id, err)
    }
    return user, nil
}

// At the handler level, unwrap to determine response
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
    user, err := h.service.GetUser(r.Context(), chi.URLParam(r, "id"))
    if err != nil {
        switch {
        case errors.Is(err, domain.ErrNotFound):
            writeError(w, http.StatusNotFound, "not_found", err.Error())
        case errors.Is(err, domain.ErrUnauthorized):
            writeError(w, http.StatusForbidden, "forbidden", "Access denied")
        default:
            slog.Error("unexpected error", "err", err)
            writeError(w, http.StatusInternalServerError, "internal_error", "An unexpected error occurred")
        }
        return
    }
    writeJSON(w, http.StatusOK, user)
}
```

## Retry with Exponential Backoff

```typescript
interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  retryIf?: (error: unknown) => boolean
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    retryIf = () => true,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts || !retryIf(error)) throw error

      const jitter = Math.random() * baseDelayMs
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1) + jitter, maxDelayMs)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Usage: retry transient network errors, not 4xx
const data = await withRetry(() => fetch('/api/data').then(r => r.json()), {
  maxAttempts: 3,
  retryIf: (error) => !(error instanceof AppError && error.statusCode < 500),
})
```

## User-Facing Error Messages

Map error codes to human-readable messages. Keep technical details out of user-visible text.
Per AGENTS.md, not-found messages use the `Name(id)` format — e.g. "Mentor Kavi(55) was not found."

```typescript
const USER_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The requested item could not be found.',
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission to do that.",
  VALIDATION_ERROR: 'Please check your input and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again later.',
}

export function getUserMessage(code: string): string {
  return USER_ERROR_MESSAGES[code] ?? USER_ERROR_MESSAGES.INTERNAL_ERROR
}

// For not-found errors with a known resource name and id, prefer the specific format:
// `Mentor Kavi(55) was not found.`  over  `The requested item could not be found.`
// The NotFoundError class already encodes this — surface error.message directly for NOT_FOUND.
```

## Error Handling Checklist

Before merging any code that touches error handling:

- [ ] Every `catch` block handles, re-throws, or logs — no silent swallowing
- [ ] API errors follow the standard envelope `{ error: { code, message } }`
- [ ] User-facing messages contain no stack traces or internal details
- [ ] Full error context is logged server-side
- [ ] Custom error classes extend a base `AppError` with a `code` field
- [ ] Async functions surface errors to callers — no fire-and-forget without fallback
- [ ] Retry logic only retries retriable errors (not 4xx client errors)
- [ ] React components are wrapped in `ErrorBoundary` for rendering errors
