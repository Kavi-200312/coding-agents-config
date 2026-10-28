# Unified AI Agent SSOT Hub (`~/.agents`)

Single Source of Truth (SSOT) for global instructions, progressive-disclosure skills, and subagent profiles across **Antigravity**, **Devin**, **Codex**, and **Claude Code**.

## Architecture

```
C:\Users\Kaviyarasu\.agents\
├── AGENTS.md                 # Canonical Global Instructions (hardlinked to all tools)
├── README.md                 # Hub architecture & synchronization guide
├── .gitignore                # Excludes local backup archives (_archive/)
├── skills/                   # 21 Progressive-Disclosure Skills (SKILL.md + references/)
│   ├── api-design/
│   ├── api-tester/
│   ├── architecture-decision-records/
│   ├── backend-patterns/
│   ├── caveman/
│   ├── code-review/
│   ├── context-handoff/
│   ├── database-patterns/
│   ├── documentation-lookup/
│   ├── error-handling/
│   ├── frontend-patterns/
│   ├── git-workflow/
│   ├── implementer/
│   ├── input-validation/
│   ├── logging-observability/
│   ├── orchestrate/
│   ├── ponytail/
│   ├── security-review/
│   ├── senior-planner/
│   ├── tdd-workflow/
│   └── tickets/
└── agents/                   # 8 Subagent Profiles (4 Core + 4 Conditional Specialists)
    ├── feature-orchestrator/ # Stage 0: Triage & Pipeline Coordinator
    ├── architect/            # Stage 1: Discovery + Planning + Architecture Design
    ├── implementer/          # Stage 2: Production Code + Build Verification
    ├── code-reviewer/        # Stage 3: Correctness + Architecture + Ponytail Review
    ├── security-reviewer/    # Specialist: Auth, RBAC, OWASP Top 10
    ├── tester/               # Specialist: Unit/Integration Tests & Edge Cases
    ├── refactor-cleaner/     # Specialist: Dead Code, DRY, Complexity Reduction
    └── doc-updater/          # Specialist: OpenAPI, ADRs, Module Digests
```

## Cross-Agent Link Topology (Zero Drift)

| Tool | Global Instructions (Hardlink) | Skills (Windows Junction) | Subagents (Windows Junction) |
|---|---|---|---|
| **Antigravity** | `~/.gemini/GEMINI.md` → `~/.agents/AGENTS.md` | `~/.gemini/config/skills` → `~/.agents/skills` | Built-in `invoke_subagent` + `orchestrate` skill |
| **Devin** | `%APPDATA%\devin\AGENTS.md` → `~/.agents/AGENTS.md` | `%APPDATA%\devin\skills` → `~/.agents/skills` | `%APPDATA%\devin\agents` → `~/.agents/agents` |
| **Codex** | `~/.codex/AGENTS.md` → `~/.agents/AGENTS.md` | `~/.codex/skills/<skill>` → `~/.agents/skills/<skill>` | Uses `AGENTS.md` + skills |
| **Claude Code** | `~/.claude/CLAUDE.md` → `~/.agents/AGENTS.md` | `~/.claude/skills` → `~/.agents/skills` | `~/.claude/agents` → `~/.agents/agents` |

## Progressive Disclosure Rule

- `SKILL.md` is a compact operational card (**40–65 lines / ~1.5–2.8 KB**) containing YAML frontmatter, core rules, and a routing pointer to `references/`.
- Deep examples, templates, and language-specific checklists live in `skills/<name>/references/*.md` and are loaded **only on demand**.
