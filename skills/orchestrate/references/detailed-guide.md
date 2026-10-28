# Orchestrate Skill — Lean Event-Driven Pipeline

Spawns a small set of specialized agents with **strict non-overlapping responsibilities**. Core 4 always run sequentially. Specialists invoked in parallel only when their domain is touched.

## Design Principles

1. **Few agents, strict boundaries.** No responsibility overlap. Each agent does one thing.
2. **Event-driven specialist invocation.** SQL/Security/Performance/Refactorer/Tester/Docs run only when their domain is affected — never on every task.
3. **Parallelism where safe.** Specialists that touch independent concerns run in parallel via multiple `run_subagent` background calls.
4. **Always background.** Never block main thread. Poll progress, report to user.
5. **Build only by Implementer.** Only Implementer runs `npm run build` / lint — once, after edits complete, no loop. Other agents read code, never compile.
6. **Trust provided context.** Agents do NOT re-read files already summarized in their task prompt. Start work within 2 min.
7. **Hard timeout.** 10 min for < 5 files, 25 min otherwise. Kill + salvage + finish inline if exceeded.
8. **Structured handoff.** Every agent returns `{ status, artifacts, issues, next }` so downstream agent reads only summary, not full transcript.

## When to Activate

- User says "orchestrate", "run the pipeline", "ship a feature", "build feature", "implement feature"
- User invokes `/orchestrate <description>`
- Multi-file task needing plan → implement → review

## When NOT to Activate

- Single-file quick fix → work inline
- < 5 files AND < 100 LOC changed → work inline
- Refactor preserving behavior + 1-2 new methods → work inline
- Read-only questions → answer directly
- Bug fix isolated to one function → work inline

## Agent Roster — 8 Agents Max

### Layer 1 — Core 4 (Always Run, Sequential)

| Agent | Profile | Responsibility | Never Does |
|-------|---------|----------------|------------|
| Architect | `architect` | System design: DB schema, API contract, validation, transaction boundaries, permissions, caching, indexes, extensibility | Write production code |
| Planner | `planner` | Break architecture into ordered tasks with complexity, risks, dependencies, parallel-opportunities | Design architecture |
| Implementer | `implementer` | Write code only. Reads architecture + AGENTS.md + style guide. Runs `npm run build` + lint **once** after all edits | Decide architecture, redesign schema, invent APIs |
| Reviewer | `code-reviewer` + `architecture-reviewer` (parallel) | Deep review: architecture (SRP/coupling/cohesion/duplication), code (readability/complexity/naming), performance (N+1/indexes), security, maintainability (dead code/premature abstraction/hidden bugs). Produces Critical/High/Medium/Low/Suggestions severity report | Rewrite everything — flag issues, do not fix |

### Layer 2 — Domain Specialists (Event-Driven, Parallel When Invoked)

| Agent | Profile | Trigger Condition |
|-------|---------|-------------------|
| SQL Expert | `architect` (SQL focus) | Migration, repository, or query changes |
| Security Expert | `security-reviewer` | Auth, authorization, file handling, public API, input validation, secrets |
| Performance Expert | `architect` (perf focus) | Expensive queries, background jobs, caching, profiling |
| Refactorer | `refactor-cleaner` | Only if Reviewer flags structural issues |
| Tester | `tester` | After implementation, when behavior changes |
| Documentation | `doc-updater` | After implementation, when public API changes |

### Layer 3 — Quality Gates (Reviewer Sub-checks, Not Separate Agents)

Database / API / Validation / Error Handling / Logging / Permission / Transaction reviews — all performed by the Reviewer agent as part of its checklist. Do NOT spawn separate agents for these.

## Pipeline

```
Feature Request
       │
       ▼
  Architect ──(design artifact)──┐
       │                         │
       ▼                         │
  Planner ──(task list)──────────┤
       │                         │
       ▼                         │
  Implementer ──(code + build)───┤
       │                         │
       ▼                         │
  Reviewer (arch + code, parallel)│
       │                         │
       ├─ structural issues? ────┼──→ Refactorer ──┐
       │                         │                  │
       ▼                         │                  ▼
  Specialist Fan-out (parallel): │            (re-review if refactored)
  • SQL (if DB touched)          │
  • Security (if auth/validation)│
  • Performance (if hot path)    │
       │                         │
       └────────────┬────────────┘
                    ▼
               Tester
                    │
                    ▼
            Documentation
                    │
                    ▼
                 DONE
```

## Inter-Agent Communication Protocol

Each agent receives a **handoff envelope** from upstream:

```
ENVELOPE:
  task: <original feature description>
  prior_artifacts:
    architect: { design decisions, schema, API contract } | null
    planner: { ordered task list, risks, parallel_ops } | null
    implementer: { files_changed, build_status, lint_status } | null
    reviewer: { critical, high, medium, low, suggestions } | null
  constraints: <from AGENTS.md — loaded once by orchestrator, passed to all>
  context_files: <max 5 file paths agent may read — already-validated by orchestrator>
  trust_directive: "Do NOT re-read files in prior_artifacts. Start work within 2 min."
```

**No agent reads another agent's full transcript.** Only the structured envelope. Prevents token bloat + re-exploration loops.

## How to Use

### Step 1 — Triage (orchestrator main thread)

Before spawning anything:
1. Read `AGENTS.md` if present — extract commands, conventions, constraints.
2. List files likely affected (grep/glob).
3. Classify task size:
   - **Trivial** (< 5 files, < 100 LOC, no new abstractions) → **work inline, do not orchestrate**. Tell user "this is inline work, /orchestrate overkill."
   - **Standard** (5-15 files, new endpoint/module) → full pipeline below.
   - **Large** (> 15 files, cross-module) → full pipeline + all specialists.

### Step 2 — Spawn Core 4 sequentially, all background

```js
// 1. Architect (background)
const architect = run_subagent({
  profile: 'architect',
  title: 'Design: <feature>',
  task: buildEnvelope({ task, prior_artifacts: {}, context_files, constraints }),
  is_background: true
});
// wait via read_subagent(block=true, timeout=600) — poll every 60s, report progress to user
```

After architect completes → spawn Planner with architect's artifact in envelope. Then Implementer. Then Reviewer.

**Never block main thread silently.** Poll every 60s. If no file edits in 3 min of an editing agent → kill, salvage, finish inline.

### Step 3 — Specialist fan-out (parallel, after Reviewer)

After Reviewer returns, determine which specialists to invoke:

| Condition | Specialist |
|----------|------------|
| Migration created OR repository file edited | SQL Expert |
| Auth middleware touched OR new public endpoint OR input validation added | Security Expert |
| New query in hot path OR background job OR caching change | Performance Expert |
| Reviewer flagged `critical`/`high` structural issues | Refactorer (then re-review) |
| Any behavior change | Tester |
| Public API added/changed OR OpenAPI registered | Documentation |

Spawn all applicable specialists in **parallel** (multiple `run_subagent` background calls in one message). Wait via `read_subagent` polling.

### Step 4 — Final verification (orchestrator main thread, NOT an agent)

- Run `npm test` (or repo-specific test command) — once.
- Run `npm run build` + `npm run lint` — once (Implementer should have already done this; this is confirmation only, not a loop).
- If failures → spawn **Implementer** again with focused fix task (not whole pipeline).

### Step 5 — Report to user

```
Status: COMPLETE | BLOCKED | NEEDS_REVISION
Artifacts:
  - files changed (with LOC delta)
  - tests: <X passed / Y total>
  - build: clean | <errors>
  - lint: clean | <warnings>
Issues: <open questions>
Recommendations: <next steps>
```

## Anti-Patterns (Do NOT Do)

- ❌ Spawn 6+ agents for 2-file refactor
- ❌ Let agents re-read files already in their envelope
- ❌ Run build/lint inside non-Implementer agents
- ❌ Block main thread with `is_background: false` on long pipelines
- ❌ Spawn separate agents for DB review / API review / validation review — Reviewer covers these
- ❌ Run specialists on every task unconditionally — event-driven only
- ❌ Pass full upstream transcript to downstream agent — envelope only
- ❌ Loop build-fix-build-fix inside Implementer — one build, report errors, orchestrator decides next step

## Spawn Prompt Template

```
Task: <feature description>

ENVELOPE:
  prior_artifacts:
    <json from upstream agents, or {} for first agent>
  context_files (read ONLY these, max 5):
    - <path1>
    - <path2>
  constraints (from AGENTS.md):
    <commands, conventions, layering rules — pasted once, not re-fetched>

TRUST DIRECTIVE: Do NOT re-read files in prior_artifacts. Do NOT re-explore.
Start your work within 2 minutes. Return structured handoff:
{ status, artifacts, issues, next }
```

## Timeout Rules

| Task size | Hard timeout | Silent-kill threshold |
|-----------|-------------|----------------------|
| < 5 files | 10 min | 3 min no edits |
| 5-15 files | 20 min | 5 min no edits |
| > 15 files | 35 min | 8 min no edits |

On timeout: kill subagent, read partial output, finish inline. Report to user what was salvaged.
