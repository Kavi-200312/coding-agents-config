# Input Validation Patterns

Validate all inputs at the boundary. AGENTS.md rule: "Validate all inputs at boundary (Zod/Joi). Parameterized queries only."

## When to Activate

- Building API endpoints that accept request bodies or query params
- Designing validation schemas (Zod, Joi, Pydantic, Go validator)
- Sanitizing user input before storage or processing
- Narrowing `unknown` to typed values safely
- Reviewing code for missing input validation
- Handling file uploads with size/type restrictions

## Core Principles

1. **Validate at the boundary** — every API endpoint, CLI input, or external data source
2. **Fail fast with clear errors** — tell the user exactly which field is wrong and why
3. **Whitelist, never blacklist** — define what's allowed, not what's blocked
4. **Validate then trust** — after validation, downstream code can assume valid data
5. **Never use `any`** — validate `unknown` into typed values

## TypeScript (Zod)

### Schema Definition

```typescript
import { z } from 'zod'

// Define schemas as named constants — reuse across endpoints
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'moderator', 'user']).default('user'),
  age: z.number().int().min(0).max(150).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// Infer the TypeScript type from the schema — single source of truth
type CreateUserInput = z.infer<typeof CreateUserSchema>
```

### Validate at the Boundary

```typescript
import { AppError } from '@/lib/errors'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json()

  // safeParse returns a result — never throws
  const result = CreateUserSchema.safeParse(body)

  if (!result.success) {
    // Return field-level error details
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      { status: 422 },
    )
  }

  // After validation, result.data is fully typed — no `any` needed
  const user = await createUser(result.data)

  return NextResponse.json(
    { data: user },
    { status: 201, headers: { Location: `/api/v1/users/${user.id}` } },
  )
}
```

### Query Parameter Validation

```typescript
const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'banned']).optional(),
  search: z.string().min(1).max(200).optional(),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams)

  const result = ListUsersQuerySchema.safeParse(params)
  if (!result.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', details: result.error.issues } },
      { status: 422 },
    )
  }

  // result.data.page is a number, result.data.perPage is bounded
  const users = await listUsers(result.data)
  return NextResponse.json({ data: users })
}
```

### Path Parameter Validation

```typescript
const UserIdSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const result = UserIdSchema.safeParse(params)
  if (!result.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID format' } },
      { status: 422 },
    )
  }

  const user = await getUser(result.data.id)
  if (!user) {
    throw new NotFoundError('User', result.data.id)
  }

  return NextResponse.json({ data: user })
}
```

## Reusable Schema Patterns

### Email with Normalization

```typescript
const EmailSchema = z.string().email().transform(s => s.toLowerCase().trim())
```

### Password Strength

```typescript
const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
```

### Date Range

```typescript
const DateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  { message: 'endDate must be after startDate', path: ['endDate'] },
)
```

### Optional with Default

```typescript
const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
```

### Discriminated Union

```typescript
// Different shapes based on a discriminator field
const WebhookEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user.created'), data: z.object({ userId: z.string() }) }),
  z.object({ type: z.literal('order.placed'), data: z.object({ orderId: z.string(), total: z.number() }) }),
  z.object({ type: z.literal('payment.failed'), data: z.object({ orderId: z.string(), reason: z.string() }) }),
])

// TypeScript narrows the type based on event.type
function handleWebhook(raw: unknown) {
  const event = WebhookEventSchema.parse(raw)

  switch (event.type) {
    case 'user.created':
      // event.data.userId is typed here
      break
    case 'order.placed':
      // event.data.orderId and event.data.total are typed here
      break
  }
}
```

## Type Narrowing from `unknown`

```typescript
// FAIL: Using any — bypasses validation
function processInput(data: any) {
  return data.user.email // no type safety
}

// PASS: Validate unknown into a typed value
function processInput(data: unknown): string {
  const result = z.object({ user: z.object({ email: z.string().email() }) }).safeParse(data)

  if (!result.success) {
    throw new AppError('Invalid input structure', 'VALIDATION_ERROR', 422)
  }

  // result.data is fully typed — no any, no casts
  return result.data.user.email
}
```

## Python (Pydantic)

```python
from pydantic import BaseModel, EmailStr, Field, field_validator
from fastapi import FastAPI, HTTPException

app = FastAPI()

class CreateUserInput(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    role: str = Field(default="user", pattern="^(admin|moderator|user)$")
    age: int | None = Field(default=None, ge=0, le=150)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip()

@app.post("/api/v1/users", status_code=201)
async def create_user(input: CreateUserInput):
    # input is already validated and typed — no manual checks needed
    user = await user_service.create(input)
    return {"data": user}
```

## Go (validator)

```go
type CreateUserInput struct {
    Email string `json:"email" validate:"required,email"`
    Name  string `json:"name" validate:"required,min=1,max=100"`
    Role  string `json:"role" validate:"omitempty,oneof=admin moderator user"`
    Age   int    `json:"age" validate:"omitempty,min=0,max=150"`
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var input CreateUserInput
    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        writeError(w, http.StatusBadRequest, "invalid_json", "Invalid request body")
        return
    }

    if err := validate.Struct(input); err != nil {
        writeError(w, http.StatusUnprocessableEntity, "validation_error", err.Error())
        return
    }

    // input is validated — proceed safely
    user, err := h.service.Create(r.Context(), input)
    // ...
}
```

## File Upload Validation

```typescript
import { AppError } from '@/lib/errors'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const

function validateFileUpload(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError('File too large (max 5MB)', 'FILE_TOO_LARGE', 413)
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    throw new AppError('Invalid file type', 'INVALID_FILE_TYPE', 422)
  }

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
    throw new AppError('Invalid file extension', 'INVALID_FILE_EXTENSION', 422)
  }
}
```

## Sanitization

### HTML Sanitization (XSS Prevention)

```typescript
import DOMPurify from 'isomorphic-dompurify'

// Strip all HTML except a safe subset
function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  })
}

// For plain text fields (no HTML allowed at all)
function sanitizePlainText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}
```

### SQL Identifier Sanitization

```typescript
// Column/table names can't be parameterized — validate against a whitelist
const ALLOWED_SORT_COLUMNS = new Set(['created_at', 'name', 'volume', 'status'])

function validateSortColumn(column: string): string {
  if (!ALLOWED_SORT_COLUMNS.has(column)) {
    throw new AppError(`Invalid sort column: ${column}`, 'INVALID_SORT_COLUMN', 422)
  }
  return column
}

// Values ARE parameterized — never whitelist values, use placeholders
// PASS:  WHERE email = $1   with [userEmail]
// FAIL:  WHERE email = '${userEmail}'
```

## Validation Checklist

Before shipping an endpoint that accepts input:

- [ ] Request body validated with a schema (Zod, Pydantic, validator)
- [ ] Query parameters validated and coerced to correct types
- [ ] Path parameters validated (UUID format, numeric, etc.)
- [ ] File uploads restricted (size, MIME type, extension)
- [ ] Error responses include field-level details
- [ ] No `any` — input is `unknown` until validated
- [ ] Schemas are reusable (defined once, imported where needed)
- [ ] String inputs trimmed and length-bounded
- [ ] Enum fields use whitelist validation (not free text)
- [ ] HTML content sanitized before storage or rendering
- [ ] SQL identifiers validated against a whitelist (values parameterized)
