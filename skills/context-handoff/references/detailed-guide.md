# Context Handoff

Produce single `HANDOFF.md` — technical continuation doc for next AI agent. Next AI has no chat access. Doc must contain everything required to continue work without re-asking.

NOT a normal conversation summary. Function as engineering handoff: state, decisions, requirements, implementation, unresolved issues, next actions.

## Output

- Default: `HANDOFF.md` in cwd (repo root)
- Configurable: accept path arg. `/context-handoff path/to/file.md` or "create handoff at X" → write there
- If file exists: warn user before overwrite
- Return ONLY completed HANDOFF.md content. No short summary before. No omitting older context. No generic filler ("project is important", "team should ensure quality")
- Technical, precise, structured, comprehensive, concise, explicit about uncertainty, directly actionable

## Process

1. Analyze ENTIRE conversation — earlier messages, code discussions, requirements, corrections, decisions, rejected approaches, implementation, latest status
2. Trace evolution: original req → problems discovered → requirements added → decisions → corrections → current state
3. Latest decision wins. Where useful, note what it replaced
4. Write doc following 20 sections below
5. Run final quality check (section 20) before returning. If any "no" → improve

## Doc Structure — 20 Sections

### 1. Purpose
1-2 lines. Handoff doc for next AI, no chat access. Continuation, not human stakeholder doc.

### 2. Use Entire Conversation
Don't summarize only latest messages. Trace evolution:
- Original requirement
- Problems discovered
- Requirements added later
- Business rules
- Technical/architecture/DB/API decisions
- Validation rules
- Concurrency/versioning decisions
- Audit requirements
- UI/API workflow discussions
- Performance considerations
- Security considerations
- Code-quality requirements
- Corrections to previous AI suggestions
- Approaches explicitly rejected
- Current implementation status
- Remaining work
- Open questions

If something changed: document LATEST decision + what it replaced.

### 3. Separate Facts From Assumptions
Clearly distinguish. Never convert AI suggestion into confirmed requirement. Never invent missing details.

| Bucket | Meaning |
|--------|---------|
| **Confirmed** | Explicitly decided/implemented/stated by user |
| **Proposed** | AI suggested, user did NOT confirm |
| **Rejected** | User explicitly rejected or told AI not to use |
| **Unknown / Needs Verification** | Cannot determine confidently from conversation |

### 4. Preserve Exact Technical Details
When available, preserve exact:

| Type | Examples |
|------|----------|
| Module/feature names | `daily-reports`, `weekly-plans` |
| Table/column names | `curriculum_daily_reports`, `mind_version` |
| Enum/status values | `DRAFT`, `PUBLISHED` |
| Endpoints/methods | `POST /api/v1/daily-reports/:id/mind` |
| Request/response structures | field names, types |
| Error types | `VersionConflictError`, `NotFoundError` |
| Validation rules | Zod schemas, constraints |
| Migration names | `0021_add_wpm_tables.ts` |
| Branch/commit/PR | `feature/wpm-skill`, `abc1234`, PR #42 |
| File paths | `src/modules/wpm/report/entries/skill/` |
| Function/service/repo names | `SkillEntriesService.populateSnapshots` |
| Version fields | `mind_version`, `skill_version` |
| Status values | `ACTIVE`, `LOCKED` |
| Cron schedules | `18:30 UTC daily` |
| Redis/BullMQ | queue names, concurrency, attempts |
| Config names | `SYSTEM_USER_ID`, `APP_PRIMARY_TZ` |
| Business rules | "snapshot all display fields at write-time" |
| Constants | magic values, thresholds |
| SQL/query behavior | `SELECT ... FOR UPDATE`, `COALESCE(custom, master.name)` |

Bad: "There is a versioning system."
Good: "`curriculum_daily_reports` contains section-specific version fields such as `mind_version`, `skill_version`, `body_version`, `intellect_version`, `demeanour_version`, used for optimistic locking."

Only include exact details when supported by conversation.

### 5. Capture Reasoning Behind Decisions
For every major architectural decision, document:
- Problem
- Options considered
- Selected approach
- Why selected
- Alternatives rejected
- Consequences/trade-offs

Especially capture:
- Controller → Service → Repository separation
- Transactions
- Optimistic locking
- Version conflicts
- Snapshot handling
- Audit logging
- Database schema
- API boundaries
- Form builder architecture
- WPM section architecture
- Repeatable entries
- Multi-topic entries
- Date/time handling
- Caching
- Queue/background jobs
- Performance
- Validation
- RBAC
- Error handling

Next AI must understand WHY architecture exists, not merely what it looks like.

### 6. Rejected / Do Not Reintroduce
Extremely important. List approaches discussed and rejected.

For each:
- Proposed approach
- Why rejected
- What to use instead

Next AI must not repeatedly suggest solutions already rejected.

### 7. Current Implementation Status
Detailed status table:

| Area | Status | Details | Remaining Work |
|------|--------|---------|----------------|
| ... | Done / Partial / Pending / Blocked | ... | ... |

Include all relevant modules/features. Don't mark Done for proposed-only.

### 8. Current Working State
Document:
- Current feature/module being worked on
- Current branch
- Latest known commit/PR
- Files changed if known
- Migrations involved
- APIs implemented
- APIs still required
- Tests implemented
- Tests missing
- Known bugs
- Known technical debt
- Current blockers
- Immediate next task

If latest conversation indicates specific task in progress → make that unmistakable.

### 9. Business Requirements vs Technical Implementation
Separate sections. Don't mix.

**Business Requirements** — what system must do from user/business perspective.
**Technical Implementation** — how current system implements those requirements.

Allows next AI to determine whether existing implementation actually satisfies business requirement.

### 10. API Contracts
For every API discussed:

- **Endpoint**: `METHOD /path`
- **Purpose**: what it does
- **Auth / RBAC**: who can access
- **Request**: params/body/query
- **Response**: important fields
- **Validation**: all known rules
- **Transaction behavior**: what must happen atomically
- **Concurrency**: version/locking behavior
- **Errors**: expected conflict/validation/not-found
- **Side effects**: audit events, snapshots, attendance updates, queues

Don't invent request/response fields never established.

### 11. Database Design
For every relevant table:
- Table name
- Purpose
- Important columns
- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Enum/status values
- Version fields
- Snapshot fields
- Relationships
- Migration status

If schema details incomplete, explicitly say:
`Needs verification from current schema/code.`

Don't fabricate schema.

### 12. Concurrency / Versioning Behavior
Own section. Explain:
- What is versioned
- Why versioned
- Which version belongs to which section/entity
- How updates validate versions
- What happens on conflict
- What data may be lost
- What UI currently does
- What improved conflict-resolution behavior was discussed
- Any proposed diff/merge strategy
- What implemented vs merely discussed

Especially preserve discussion around avoiding forced page refreshes and losing unsaved user work.

### 13. Date / Time Rules
Document established timezone policy:
- UTC timestamp policy
- Date-only policy
- MySQL `DATETIME` behavior
- Application timezone
- DB session timezone
- Parsing rules
- Formatting rules
- Scheduler/business-rule timezone
- Relevant utilities/types
- ESLint rules if discussed

Don't simplify into "we use UTC."

### 14. Coding & Architecture Standards
Document standards going forward:
- Controller → Service → Repository → DB
- Controllers: HTTP only — no business logic, no DB
- Services: business rules + transactions — no HTTP
- Repositories: persistence only — no validation
- SOLID
- Small functions
- No `any` — use `unknown` + narrow
- Explicit types where required
- Clean separation
- Maintainability, scalability, performance, security
- Validation, error handling, testability

Include project-specific rules from conversation.

### 15. AI Behavior Requirements
Document how next AI should work:
- Don't blindly agree with proposals
- Challenge incorrect assumptions
- Check business logic before implementation
- Prefer simple architecture over unnecessary abstraction
- No generic abstractions without concrete need
- Review existing code before proposing rewrites
- Preserve established project conventions
- No duplication of existing functionality
- Verify schema/code before making claims
- Distinguish confirmed facts from assumptions
- Don't reintroduce rejected architecture
- Explain trade-offs for major changes
- Consider correctness, performance, security, scalability, maintainability

Include project-specific rules found in conversation.

### 16. Open Questions / Decisions Required
For each:
- Question
- Why it matters
- Current known information
- Possible options
- Current recommendation, if one exists
- Who/what needs to confirm

Don't silently choose answer where conversation never made decision.

### 17. Known Risks / Technical Debt
Include:
- Existing bugs
- Race conditions
- Data-loss risks
- Performance risks
- Migration risks
- Backward compatibility concerns
- API contract risks
- UI synchronization problems
- Security concerns
- Audit/compliance concerns
- Scalability concerns
- Areas requiring refactoring

Prioritize: Critical / High / Medium / Low

### 18. Next AI Action Plan
Order remaining work. For each task:
1. Task
2. Why needed
3. Files/modules likely involved
4. Dependencies
5. Expected result
6. Verification/test required

Split into:

**Immediate Next Step** — first thing next AI should do.
**Remaining Implementation** — everything after.
**Final Verification** — what must be checked before feature complete.

### 19. Critical Context — Read Before Doing Anything
10-20 most important facts next AI absolutely must know before modifying code:
- Current architecture
- Current feature
- Important business rule
- Important schema constraint
- Concurrency strategy
- Rejected architecture
- Current branch/status
- Known blocker
- Immediate next task

Concise but high-value.

### 20. Final Handoff Quality Check
Before producing doc, internally verify:

- [ ] Inspected entire conversation?
- [ ] Captured latest state, not only historical?
- [ ] Distinguished implemented vs proposed?
- [ ] Captured rejected decisions?
- [ ] Preserved exact technical names?
- [ ] Captured business rules?
- [ ] Captured API/database details?
- [ ] Captured concurrency behavior?
- [ ] Captured unresolved issues?
- [ ] Identified actual next task?
- [ ] Could another senior engineer continue from this doc without reading old chat?
- [ ] Would next AI accidentally reintroduce rejected design because I failed to document it?
- [ ] Avoided inventing information?

If any "no" → improve doc before returning.

## Compression Rules

Apply to doc prose (NOT to code/paths/technical terms):

### Remove
- Articles: a, an, the
- Filler: just, really, basically, actually, simply, essentially, generally
- Pleasantries: "sure", "certainly", "of course", "happy to", "I'd recommend"
- Hedging: "it might be worth", "you could consider", "it would be good to"
- Redundant: "in order to" → "to", "make sure to" → "ensure", "the reason is because" → "because"
- Connective fluff: "however", "furthermore", "additionally", "in addition"

### Preserve EXACTLY (never modify)
- Code blocks (fenced and indented)
- Inline code (`backtick content`)
- URLs and links
- File paths
- Commands
- Technical terms (library/API/protocol/algorithm names)
- Proper nouns (projects, people, companies)
- Dates, version numbers, numeric values
- Environment variables

### Preserve Structure
- All markdown headings (exact text)
- Bullet hierarchy (nesting level)
- Numbered lists (keep numbering)
- Tables (compress cell text, keep structure)
- Frontmatter/YAML

### Compress
- Short synonyms: "big" not "extensive", "fix" not "implement a solution for"
- Fragments OK: "Run tests before commit" not "You should always run tests before committing"
- Drop "you should", "make sure to", "remember to" — state action directly
- Merge redundant bullets
- Keep one example where multiple show same pattern

## Boundaries

- Skill is generic. Don't bake in project-specific details — those come from conversation at runtime
- Don't invent details conversation never established
- Don't convert AI suggestions into confirmed requirements
- If schema/code details incomplete → say `Needs verification from current schema/code.` Don't fabricate
- If conversation never made decision → leave as Open Question. Don't silently choose
