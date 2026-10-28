# Unified AI Agent SSOT Hub (`~/.agents`)

Single Source of Truth (SSOT) for global instructions, progressive-disclosure skills, and subagent profiles across **Antigravity**, **Devin**, **Codex**, and **Claude Code**.

## Quick Start on Any New Machine

### Option A: One-Line Terminal Command
```bash
git clone <your-private-repo-url> ~/.agents
node ~/.agents/sync.mjs          # Interactive: asks which AI tool(s) to backup & link
# OR
node ~/.agents/sync.mjs devin    # Backup & link only Devin
node ~/.agents/sync.mjs --all    # Backup & link all installed AI tools
node ~/.agents/sync.mjs --status # Check link health across all tools
```

### Option B: Ask Any AI Agent (Zero CLI Memorization)
Open Antigravity, Devin, Claude Code, or Codex and prompt:
> *"Read `~/.agents/BOOTSTRAP.md` and set up my agent environment."*

The agent will inspect your machine, ask which tool(s) you want to link (e.g. `devin`), back up any existing config in that tool to `~/.agents/_archive/`, and link the tool to this hub.

---

## Architecture

```text
C:\Users\Kaviyarasu\.agents\
├── AGENTS.md                 # Canonical Global Instructions (hardlinked to all tools)
├── BOOTSTRAP.md              # AI-Agent interactive setup playbook for new machines
├── agents.manifest.json      # Future-proof OS path registry (win32 / darwin / linux)
├── sync.mjs                  # Zero-dependency CLI & interactive backup/link engine
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

| Tool | Global Instructions (Hardlink) | Skills (Junction / Symlink) | Subagents (Junction / Symlink) |
|---|---|---|---|
| **Antigravity** | `~/.gemini/GEMINI.md` → `~/.agents/AGENTS.md` | `~/.gemini/config/skills` → `~/.agents/skills` | Built-in `invoke_subagent` + `orchestrate` skill |
| **Devin** | `%APPDATA%\devin\AGENTS.md` → `~/.agents/AGENTS.md` | `%APPDATA%\devin\skills` → `~/.agents/skills` | `%APPDATA%\devin\agents` → `~/.agents/agents` |
| **Codex** | `~/.codex/AGENTS.md` → `~/.agents/AGENTS.md` | `~/.codex/skills/<skill>` → `~/.agents/skills/<skill>` | Uses `AGENTS.md` + skills |
| **Claude Code** | `~/.claude/CLAUDE.md` → `~/.agents/AGENTS.md` | `~/.claude/skills` → `~/.agents/skills` | `~/.claude/agents` → `~/.agents/agents` |

## What If a Tool Changes Its Path in the Future?

Edit [`agents.manifest.json`](./agents.manifest.json): move the old path into `"legacyTargets"` and put the new path in `"target"`, then run `node ~/.agents/sync.mjs --all`.
