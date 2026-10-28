# Database Patterns

Production-grade database patterns for query optimization, schema design, and connection management.

## When to Activate

- Writing or optimizing database queries (SQL, Prisma, Supabase, Drizzle)
- Designing database schemas or adding indexes
- Building migration scripts
- Troubleshooting slow queries or N+1 problems
- Configuring connection pooling
- Implementing transactions across multiple operations

## Core Principles

1. **No SELECT * on lists** — always specify columns to reduce payload and lock scope
2. **No N+1 queries** — batch fetch related data in a single query
3. **Index filter and join columns** — every WHERE and JOIN column needs an index
4. **Paginate list endpoints** — never return unbounded result sets
5. **Parameterized queries only** — never concatenate user input into SQL

## Query Optimization

### Select Only Needed Columns

```typescript
// PASS: Specify columns
const { data } = await supabase
  .from('users')
  .select('id, email, name, created_at')
  .limit(20)

// FAIL: SELECT * bloats payload and memory
const { data } = await supabase
  .from('users')
  .select('*')
```

### N+1 Query Prevention

```typescript
// FAIL: N+1 — one query per market to fetch creator
const markets = await getMarkets()
for (const market of markets) {
  market.creator = await getUser(market.creatorId) // N queries
}

// PASS: Batch fetch with a single query
const markets = await getMarkets()
const creatorIds = markets.map(m => m.creatorId)
const creators = await getUsersByIds(creatorIds) // 1 query
const creatorMap = new Map(creators.map(c => [c.id, c]))

for (const market of markets) {
  market.creator = creatorMap.get(market.creatorId)
}
```

### Parallel Independent Fetches

```typescript
// PASS: Independent queries run in parallel
const [users, stats, config] = await Promise.all([
  fetchUsers(),
  fetchStats(),
  fetchConfig(),
])

// FAIL: Sequential when there are no dependencies
const users = await fetchUsers()
const stats = await fetchStats()
const config = await fetchConfig()
```

## Pagination

### Cursor-Based (Scalable, Recommended)

```typescript
// Cursor pagination — consistent performance at any offset
async function getUsersPaginated(cursor?: string, limit = 20): Promise<PaginatedResult<User>> {
  const query = supabase
    .from('users')
    .select('id, email, name')
    .order('id', { ascending: true })
    .limit(limit + 1) // fetch one extra to check hasNext

  if (cursor) {
    query.gt('id', cursor)
  }

  const { data, error } = await query
  if (error) throw new AppError(error.message, 'DB_QUERY_ERROR')

  const hasNext = data.length > limit
  const items = hasNext ? data.slice(0, limit) : data
  const nextCursor = hasNext ? items[items.length - 1].id : null

  return { data: items, hasNext, nextCursor }
}
```

### Offset-Based (Simple, Small Datasets Only)

```typescript
// Offset pagination — only for small datasets (<10K rows)
// OFFSET 100000 is slow because the DB still scans all skipped rows
async function getUsersOffset(page = 1, perPage = 20): Promise<PaginatedResult<User>> {
  const offset = (page - 1) * perPage

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name')
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error) throw new AppError(error.message, 'DB_QUERY_ERROR')

  return { data, page, perPage }
}
```

## Indexing Strategy

### Index Every Filter and Join Column

```sql
-- Index columns used in WHERE clauses
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_status ON orders(status);

-- Composite index for multi-column filters (order matters: high cardinality first)
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC);

-- Index foreign keys used in JOINs
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Index for sorting
CREATE INDEX idx_markets_volume_desc ON markets(volume DESC);
```

### When to Index

| Column Usage | Index? |
|-------------|--------|
| WHERE filter | Yes |
| JOIN key | Yes |
| ORDER BY | Yes |
| GROUP BY | Yes |
| Foreign key | Yes |
| Low-cardinality (boolean, status with 2 values) | Usually no |
| Frequently updated, rarely queried | No |

### Check Query Plans

```sql
-- PostgreSQL: see if your query uses indexes
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';

-- If you see "Seq Scan" (sequential scan) on a large table, add an index
-- If you see "Index Scan" or "Index Only Scan", the index is working
```

## Transactions

### Multi-Operation Transactions

```typescript
import { AppError } from '@/lib/errors'

async function transferCredits(fromId: string, toId: string, amount: number): Promise<void> {
  // Use a transaction when multiple writes must succeed or fail together
  const { error } = await supabase.rpc('transfer_credits', {
    from_user: fromId,
    to_user: toId,
    transfer_amount: amount,
  })

  if (error) throw new AppError('Transfer failed', 'TX_FAILED')

  // Alternative with Prisma:
  // await prisma.$transaction(async (tx) => {
  //   await tx.user.update({ where: { id: fromId }, data: { credits: { decrement: amount } } })
  //   await tx.user.update({ where: { id: toId }, data: { credits: { increment: amount } } })
  // })
}
```

### Transaction Rules

- Keep transactions short — long transactions hold locks and block others
- Never call external APIs inside a transaction (network latency holds locks)
- Read operations that don't need consistency can run outside the transaction
- Use the lowest isolation level that meets your correctness requirements

## Connection Pooling

### Configuration

```typescript
// Serverless (Supabase/Neon): use connection pooler, not direct connection
// Pooler URL: postgresql://user:pass@pooler.host:6543/db
// Direct URL: postgresql://user:pass@db.host:5432/db (use for migrations only)

// Long-running server (Express/Fastify):
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // max connections in pool
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 2000, // fail fast if can't connect
})
```

### Pool Sizing Rule of Thumb

```
pool_size = (core_count * 2) + effective_spike_concurrency

For a 4-core server with 10 concurrent requests:
pool_size = (4 * 2) + 10 = 18

Never exceed the database's max_connections limit.
For serverless: use a pooler (PgBouncer, Supabase pooler, Neon pooler).
```

## Migrations

### Migration Rules

- Migrations are forward-only — never edit a applied migration
- Every migration must be reversible (include a down/rollback)
- Test migrations on a copy of production data before deploying
- Never lock a large table during a migration on a live system
- Add indexes concurrently (non-blocking) on production tables

```sql
-- PostgreSQL: non-blocking index creation
CREATE INDEX CONCURRENTLY idx_orders_email ON orders(email);

-- Reversible migration (up/down)
-- up:
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;

-- down:
ALTER TABLE users DROP COLUMN last_login_at;
```

## Repository Pattern

```typescript
import { AppError, NotFoundError } from '@/lib/errors'

interface UserRepository {
  findById(id: string): Promise<User | null>
  findAllPaginated(cursor?: string, limit?: number): Promise<PaginatedResult<User>>
  create(data: CreateUserDto): Promise<User>
  update(id: string, data: UpdateUserDto): Promise<User>
  delete(id: string): Promise<void>
}

class SupabaseUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new AppError(error.message, 'DB_QUERY_ERROR')
    }

    return data
  }

  async create(data: CreateUserDto): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .insert(data)
      .select('id, email, name, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Email already registered', 'DUPLICATE_EMAIL', 409)
      }
      throw new AppError(error.message, 'DB_INSERT_ERROR')
    }

    return user
  }
}
```

## Database Checklist

Before shipping database code:

- [ ] No `SELECT *` on list queries — specify columns
- [ ] No N+1 queries — batch fetch related data
- [ ] All filter/join columns indexed
- [ ] List endpoints paginated (cursor preferred)
- [ ] All queries parameterized — no string concatenation
- [ ] Transactions used for multi-write operations
- [ ] Migrations are reversible and tested
- [ ] Connection pooling configured for the deployment model
- [ ] Query plans checked for slow queries (EXPLAIN ANALYZE)
