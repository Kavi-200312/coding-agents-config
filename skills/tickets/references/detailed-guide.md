# Ticket Workflow

Senior backend engineer. Writes Zoho Sprint tickets. Professional documentation, concise but complete. Managers + QA understand impact without reading code.

## Zoho Sprint Formatting Rules (always apply)

- Professional documentation suitable for Zoho Sprints.
- Concise but complete. No marketing language.
- Do NOT repeat the same information across sections. State each fact once, in the section where it fits best.
- Merge related implementation points into grouped bullets instead of dozens of tiny one-line bullets. One bullet = one coherent unit of work.
- Preserve all technical details that matter (file paths, class names, method names, error classes, HTTP statuses, table/column names, permission strings).
- Use Markdown.
- Include Story Points with a one-line justification by default. Do NOT include Branch, Commit, or PR unless the user explicitly requests them.
- Do NOT add information that wasn't provided or traced from code/diffs.
- If a section has nothing relevant, OMIT the heading entirely. No empty sections, no "N/A", no "None".
- No icons, no emojis, no checkmarks/crosses as decoration. Plain text + Markdown tables only.
- One ticket per file. Never combine.
- Start with `# Ticket: <Title>` H1. Include a `**Story Points:** N — justification` line under the title by default, followed by `**Priority:** Low|Medium|High — one-line reason`. Scale matches Zoho (None/Low/Medium/High); never assign above High. Heuristic: High = data-integrity/correctness-critical or blocking work (migrations, transactional engines, idempotency contracts, security boundaries, recovery paths); Medium = supporting APIs, workers, shared utilities, exports; Low = ops/observability/test-harness polish. Do NOT include Branch/Commit/PR unless user explicitly requests.

## Modes

**Mode A — Git-based** (default). Triggers: "ticket", "ticket update", "document work", "summarize changes". From commits + uncommitted. Flow: gather git data → propose split → wait → write files.

**Mode B — Module-analysis split**. Triggers: "analyze [module] for tickets", "split [module] into tickets". From existing implementation. Flow: read all files → identify work → propose split → wait → write files.

### Mode B strict rules
- Analyze ONLY specified submodule. Ignore siblings even if same parent.
- NEVER invent functionality. Tickets trace to existing code + design docs + migrations only.
- One ticket = one feature/technical task. No scope creep.
- No overlap between tickets. Disjoint scopes.
- Include hidden work: schema, validation, permissions, migrations, API contracts, transactions, indexing, RBAC assignment, audit wiring, error messages, OpenAPI registration, tests.
- Consider: business workflow, API, DB, validation, errors, RBAC, versioning, audit, performance, edge cases, extensibility.
- Ambiguous → **Open Questions**. Never assume.
- 3+ distinct layers (DB + API + RBAC + audit) → split further unless inseparable.
- Each ticket independently deliverable. One PR = one rollback unit. State dependencies explicitly.

---

## Phase 1 — Gather

### Mode A
```bash
git log -n 20 --stat
git status
git diff HEAD
git diff main...HEAD --stat
```
Read changed files for **what + why**. Trace business intent, not line counts.

### Mode B
1. `ls` submodule → map tree.
2. Read every file: routes, controller, service, repo, schema, types, openapi, paths, shared/, services/, handlers/.
3. Read migrations.
4. Read RBAC: permissions + permission-sets + resources config.
5. Read audit: constants + registry.
6. Read shared messages + constants.
7. Read design docs (plan.md, README, `.agent/context/modules/[module].summary.md`).
8. Grep TODO/FIXME/ponytail/HACK.
9. Grep test files — note if none.
10. Check FK constraints in `database/raw_schema.sql`.

**Never read sibling submodules.** Only shared files the target uses.

---

## Phase 2 — Propose Split

### Mode A metrics
- Files: 1-3 small, 5+ large
- Endpoints: 0-2 small, 3+ large
- DB changes: Y/N
- Responsibilities: 1 small, 2+ large
- Breaking: Y/N

```
IF (files ≥ 5 AND responsibilities ≥ 2 AND (DB OR endpoints ≥ 3 OR breaking))
THEN SPLIT
ELSE ONE TICKET
```

### Mode B classification
- **Feature** — new endpoint, business flow, status lifecycle
- **Hidden tech** — RBAC assignment, audit wiring, error messages, OpenAPI, migration, index, constraint
- **Gap** — missing test/audit/validation/RBAC, dead constant
- **Improvement** — N+1, sequential→parallel, payload, pagination

Group by atomic deliverable. One ticket = one PR = one rollback unit.

### Proposal format — present then STOP

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TICKET SPLIT PROPOSAL — [Module]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzed [N] files. Found [M] work pieces.

  Ticket 1 — [type]: [one-liner]  [SP]
    - Files: [list]
    - Scope: [specific]

  Ticket 2 — [type]: [one-liner]  [SP]
    ...

## Open Questions
- [ambiguity 1] — needs decision
- [ambiguity 2]

Reply:
  "split"     → write all
  "single"    → one combined (Mode A only)
  "1,3"       → subset
  "merge 2,3" → combine
  "drop 4"    → omit
  "answer Q1: X, Q2: Y" → resolve then write
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Wait for reply. Never assume approval.**

---

## Phase 3 — Write Files

After approval → write each ticket as `.md` under `tickets/`. No inline chat drafts — go straight to files.

**Sequential, detail-first:** write ONE ticket at a time — analyze that ticket's code/diffs, then write its file, then move to the next. Never batch-draft all tickets in one pass. Each ticket must be self-sufficiently detailed (specific files, methods, semantics, edge cases) before the next ticket is started.

### Naming
```
tickets/<NN>-<kebab-case-title>.md
tickets/01-wpm-form-rbac-assignment.md   # Mode B: prefix module
tickets/02-publish-idempotency.md        # Mode A: serial from commit order
```

**Serial number prefix (NN):** Two-digit zero-padded sequence starting at `01`. Increments per ticket in the split. Preserves file ordering in `tickets/` directory listing. Always include — no bare filenames.

### Rules
- One ticket per file. Never combine.
- Create `tickets/` if missing.
- Filename uses two-digit serial prefix (`01-`, `02-`, ...) — preserves order, no bare filenames.
- Start with `# Ticket: <Title>` H1. Include `**Story Points:** N — justification` and `**Priority:** Low|Medium|High — one-line reason` lines under the title by default. Do NOT include Branch/Commit/PR unless user explicitly requests.
- Use only sections with content. Delete empty. No "N/A", no "None".
- After writing, list with `<ref_file>` tags.
- Mode B Status = "Planned" (proposed, not done) — mention in Summary if relevant, no metadata block.
- No icons, no emojis, no checkmark/cross decorations.

---

## Phase 4 — Content Structure

Use only sections with content. Delete empty. Include `**Story Points:** N — justification` and `**Priority:** Low|Medium|High — one-line reason` lines under the H1 by default. Do NOT include Branch/Commit/PR unless user explicitly requests.

### Template

```markdown
# Ticket: <Title>

**Story Points:** N — justification
**Priority:** Low|Medium|High — reason

## Summary

Business problem → solution → expected outcome. 3-4 sentences, manager-readable, no jargon.

## Requirements

* What must be true when done — one requirement per bullet, 3-6 bullets.

## Implementation

### <Component / Module Name>

* One bullet = one coherent unit of work. Include file paths, class/method names, constants, table/column names.
* Mention API, service, repository, DB, queue, validation, or processing changes.

### <Component / Module Name>

* Related implementation details, integration points, dependencies.

## Technical Decisions

* Decision: why this approach; challenge → solution. Only non-obvious decisions.

## Validation / Error Handling

* Validation rules and expected failure behavior. Scenario → behavior (HTTP status) in one line.
* Important edge cases that must be handled.

## Testing

* Verify the primary successful flow.
* Verify validation and failure scenarios.
* Verify affected existing functionality.
* State what is NOT covered when tests are partial.
```

### Optional extra sections (only when relevant)

- **API Changes** — table: Change | Method + Path | Description | Auth.
- **Database Changes** — migrations, tables, transformations, deploy order, rollback.
- **Security** — risks, mitigations.
- **Operational** — deploy order, rollback, monitoring.
- **Breaking Changes** — what breaks, client action.
- **Pending Work** — deferred items, blockers.
- **Open Questions** (Mode B only) — numbered ambiguities with options.

---

## Phase 6 — Quality Check

- Summary 3-4 sentences, business-focused, no file names/jargon
- Implementation lists specific files — no "fixed issue"/"made changes"; related points merged into grouped bullets
- Each edge case specific + HTTP status (table format)
- Testing honest — what's NOT tested (Done) / what must be (Planned)
- Breaking changes explicit + client action
- Empty sections deleted — no "N/A"/"None"/empty headings
- No icons, no emojis, no checkmark/cross decorations
- Story Points with justification + Priority (Low|Medium|High, max High) included by default; Branch/Commit/PR only if user explicitly requested
- No information repeated across sections — each fact stated once
- Manager reads Summary + Breaking + Testing → understands impact
- 1-3 pages max
- Mode B: no invented functionality — traces to code/doc
- Mode B: Open Questions for every ambiguity
- Mode B: no overlap — disjoint scopes

## Section Selection

| Task | Sections |
|---|---|
| Bug Fix | Summary, Requirements, Implementation, Validation / Error Handling, Testing |
| New Endpoint | Summary, Requirements, Implementation (+API Changes), Technical Decisions, Validation / Error Handling, Testing |
| DB Migration | Summary, Requirements, Implementation (+Database Changes), Testing, Operational |
| Security | Summary, Requirements, Implementation, Validation / Error Handling, Testing, Security |
| Large Refactor | Summary, Requirements, Implementation, Validation / Error Handling, Testing, Operational |
| Cron/Background | Summary, Requirements, Implementation (+Database Changes), Technical Decisions, Validation / Error Handling, Testing, Operational |
| Mode B Feature | Summary, Requirements, Implementation, Technical Decisions, Validation / Error Handling, Testing, Open Questions |
| Mode B Hidden Tech / Gap | Summary, Requirements, Implementation, Validation / Error Handling, Testing, Open Questions |

## Writing Standards

Good: "Added `tenant_id` column NOT NULL + FK to `tenants(id)`"
Bad: "Fixed tenant issues"

Good: "Returns 409 if user has active session; logs to `security_audit`"
Bad: "Handles error cases"

Good: "`TenantValidator` in `src/validators/tenant-validator.ts` — STRICT/LENIENT/BYPASS"
Bad: "Implemented validation logic"

Good Mode B: "Ticket 3 — Gap: Audit on createForm + clone. createForm + FormCloneService.clone emit no audit while applyFormChanges, applySectionChanges, publish all do."
Bad Mode B: "Ticket 3 — Add audit logging everywhere it's missing" (vague, no tracing)

## Strict Rules

1. NEVER write files without approval (split → wait → write)
2. NEVER combine tickets in one file
3. NEVER vague language ("fixed issue", "updated code", "made changes", "handles errors")
4. ALWAYS propose split first — even if single ticket
5. ALWAYS wait at each approval gate
6. Empty sections deleted — no "N/A"/"None"/empty headings
7. Story Points with justification + Priority (Low|Medium|High, max High) included by default; Branch/Commit/PR only if user explicitly requests
8. No icons, no emojis, no checkmark/cross decorations
9. No information repeated across sections — each fact stated once
10. Merge related implementation points into grouped bullets, not dozens of tiny one-liners
11. Manager-friendly in Summary + Breaking — no jargon without context
12. Trace intent from diffs (A) or existing code (B) — read code for *why*
13. Mode B: NEVER invent functionality. Trace to code/migration/doc.
14. Mode B: ALWAYS list ambiguities under Open Questions. Never assume.
15. Mode B: NEVER analyze sibling submodules. Stay in scope.
16. Mode B: Each ticket independently deliverable. State dependencies.

---

## Phase 5 — Publish to Zoho Sprints

Triggers: "create in zoho", "push tickets to zoho", "sync tickets to sprint". Run ONLY after the user has reviewed the ticket files and explicitly says publish. Never auto-publish on ticket creation.

### Step 1 — Defaults (user-confirmed, do NOT re-ask unless ambiguous)

- **Sprint** — default: the currently **active** sprint (resolve via `GetSprints` with `type:"[2]"`). Use backlog only if user says so or no active sprint exists.
- **Assignee** — default: ALWAYS the requesting user (kaviyarasu c, userId `161810000000411041` in workspace `stinsoft`/`857305669`). Re-resolve via `GetWorkspaceUsers` only if that ID fails. Assign someone else ONLY when explicitly told.
- **Epic** — backend/API tickets → "Backend Web"; frontend/UI tickets → "Web UI". Other tickets → ask once.
- **Description** — NEVER send `description` on CreateItem. The user fills descriptions in Zoho manually. (The "Description format" section below is kept for reference only if the user ever asks for it.)
- **File scope** — all `tickets/*.md` or a subset; skip `00-*` summary files
- Priority source: the `**Priority:**` line in each ticket file

### Step 2 — One-time ID resolution (batch once, cache in-session)

Call once each, in order; reuse the results for every ticket — never re-fetch per ticket:
1. `ZohoSprints_getAllWorkspaces` → `teamId` (match workspace name)
2. `ZohoSprints_GetProjects` → `projectId` + `backlogId` (match project name/number)
3. `ZohoSprints_GetSprints` → sprintId — `type` param is MANDATORY and must be a JSON-array string (e.g. `"[1, 2]"`); `[2]` = active, `[1]` = upcoming. Skip when target is backlog — use `backlogId`
4. `ZohoSprints_GetEpics` → `epicid` for the chosen epic
5. `ZohoSprints_GetWorkspaceUsers` → assignee userId
6. `ZohoSprints_getItemTypes` + `ZohoSprints_GetProjectPriorities` → ID maps (type→id, priority→id)

### Step 3 — Create (exactly one call per ticket)

`ZohoSprints_CreateItem`: `sprintId` = backlogId or chosen sprint, `name` = H1 minus `# Ticket:` (plain ASCII — avoid em-dash), `point` = Story Points **as a Fibonacci-scale index, NOT the raw value** (see below), `projpriorityid` = mapped Priority, `users` = assignee ID **as a JSON-array string** (`"[161810000000411041]"` — bare ID returns `7600 Given JSON is invalid`), `epicid` = epic. NO `description` param (user fills manually). Per-ticket failure → report and continue the batch; do not abort the run.

**`point` is a scale index, not the SP value.** Zoho maps `point` → `estimationPoints` via index into the Fibonacci scale `[0,1,2,3,5,8,13,21]`. Sending the raw value 5 produces `estimationPoints: 8` (index 5 → 8). Convert SP → index before sending: `1→1, 2→2, 3→3, 5→4, 8→5, 13→6, 21→7`. Same rule applies to `ZohoSprints_UpdateItem`. Verify with `GetItemDetails` after create — `estimationPoints` is what the UI shows, `points` holds the raw index sent.

### Step 4 — Report

List created item numbers ↔ ticket file mapping.

### MCP access

- If the `ZohoMCP` server is configured and loaded → use `mcp_call_tool` / `mcp_list_tools`.
- Otherwise call JSON-RPC directly: read `access_token` from `%APPDATA%\devin\mcp\oauth\*.json` (match `server_name`), POST `{"jsonrpc":"2.0","method":"tools/call","params":{"name","arguments"}}` to the server URL with `Authorization: Bearer <token>` and `Accept: application/json, text/event-stream`. On 401 → tell user to run `devin mcp login ZohoMCP`.
- Completed sprints reject item creation — if the target sprint is completed, ask the user to reopen it or pick backlog.

### Description format — HTML only

Zoho Sprints description is a WYSIWYG field: **markdown renders as raw text — send HTML.** Convert each ticket's Markdown to this template:

- Lead `<p>` = Summary paragraph (no heading).
- `<h3>` section heads — only sections that exist in the file; omit empty.
- `<ul><li>` bullets with `<b>lead-in</b>` and `<code>` for file paths, symbols, constants. Merge into coherent bullets; no run-on paragraphs inside a single `<li>`.
- `<table><tr><th>` / `<td>` for Edge Cases, API Changes, and Testing tables.
- Entities `&rarr;`, `&mdash;` are fine. No icons, no emojis.
- Story Points and Priority go to the `point`/`projpriorityid` fields — not into the description. No Branch/Commit/PR.

**Size cap:** `description` travels as a URL query param — keep it under ~7KB. Condense large tickets aggressively (merge bullets, drop prose, keep ALL file paths, constants, API rows, and contract semantics). If still over, send the condensed description on create and the remainder via `ZohoSprints_AddItemComment` chunks.

### Efficiency rules

- One `tools/list` per session max; cache tool names.
- ID maps resolved once per session — reuse for all tickets.
- One `CreateItem` call per ticket; no per-ticket lookup calls.
- Skip `00-*` summary and any non-ticket files.
- Do not create tickets the user didn't approve for publish.
