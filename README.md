# Unified AI Agent SSOT Hub (`~/.agents`)

Single Source of Truth (SSOT) for global instructions, progressive-disclosure skills, and subagent profiles across **Antigravity**, **Devin**, **Codex**, and **Claude Code**.

## Quick Start on Any New Machine

### Option A: One-Line Terminal Command
```bash
git clone https://github.com/Kavi-200312/coding-agents-config.git ~/.agents
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
~/.agents/
â”œâ”€â”€ AGENTS.md                 # Canonical Global Instructions (hardlinked to all tools)
â”œâ”€â”€ BOOTSTRAP.md              # AI-Agent interactive setup playbook for new machines
â”œâ”€â”€ agents.manifest.json      # Future-proof OS path registry (win32 / darwin / linux)
â”œâ”€â”€ sync.mjs                  # Zero-dependency CLI & interactive backup/link engine
â”œâ”€â”€ README.md                 # Hub architecture & synchronization guide
â”œâ”€â”€ .gitignore                # Excludes local backup archives (_archive/)
â”œâ”€â”€ skills/                   # 21 Progressive-Disclosure Skills (SKILL.md + references/)
â”‚   â”œâ”€â”€ api-design/
â”‚   â”œâ”€â”€ api-tester/
â”‚   â”œâ”€â”€ architecture-decision-records/
â”‚   â”œâ”€â”€ backend-patterns/
â”‚   â”œâ”€â”€ caveman/
â”‚   â”œâ”€â”€ code-review/
â”‚   â”œâ”€â”€ context-handoff/
â”‚   â”œâ”€â”€ database-patterns/
â”‚   â”œâ”€â”€ documentation-lookup/
â”‚   â”œâ”€â”€ error-handling/
â”‚   â”œâ”€â”€ frontend-patterns/
â”‚   â”œâ”€â”€ git-workflow/
â”‚   â”œâ”€â”€ implementer/
â”‚   â”œâ”€â”€ input-validation/
â”‚   â”œâ”€â”€ logging-observability/
â”‚   â”œâ”€â”€ orchestrate/
â”‚   â”œâ”€â”€ ponytail/
â”‚   â”œâ”€â”€ security-review/
â”‚   â”œâ”€â”€ senior-planner/
â”‚   â”œâ”€â”€ tdd-workflow/
â”‚   â””â”€â”€ tickets/
â””â”€â”€ agents/                   # 8 Subagent Profiles (4 Core + 4 Conditional Specialists)
    â”œâ”€â”€ feature-orchestrator/ # Stage 0: Triage & Pipeline Coordinator
    â”œâ”€â”€ architect/            # Stage 1: Discovery + Planning + Architecture Design
    â”œâ”€â”€ implementer/          # Stage 2: Production Code + Build Verification
    â”œâ”€â”€ code-reviewer/        # Stage 3: Correctness + Architecture + Ponytail Review
    â”œâ”€â”€ security-reviewer/    # Specialist: Auth, RBAC, OWASP Top 10
    â”œâ”€â”€ tester/               # Specialist: Unit/Integration Tests & Edge Cases
    â”œâ”€â”€ refactor-cleaner/     # Specialist: Dead Code, DRY, Complexity Reduction
    â””â”€â”€ doc-updater/          # Specialist: OpenAPI, ADRs, Module Digests
```

## Cross-Agent Link Topology (Zero Drift)

| Tool | Global Instructions (Hardlink) | Skills (Junction / Symlink) | Subagents (Junction / Symlink) |
|---|---|---|---|
| **Antigravity** | `~/.gemini/GEMINI.md` â†’ `~/.agents/AGENTS.md` | `~/.gemini/config/skills` â†’ `~/.agents/skills` | Built-in `invoke_subagent` + `orchestrate` skill |
| **Devin** | `%APPDATA%\devin\AGENTS.md` â†’ `~/.agents/AGENTS.md` | `%APPDATA%\devin\skills` â†’ `~/.agents/skills` | `%APPDATA%\devin\agents` â†’ `~/.agents/agents` |
| **Codex** | `~/.codex/AGENTS.md` â†’ `~/.agents/AGENTS.md` | `~/.codex/skills/<skill>` â†’ `~/.agents/skills/<skill>` | Uses `AGENTS.md` + skills |
| **Claude Code** | `~/.claude/CLAUDE.md` â†’ `~/.agents/AGENTS.md` | `~/.claude/skills` â†’ `~/.agents/skills` | `~/.claude/agents` â†’ `~/.agents/agents` |

## What If a Tool Changes Its Path in the Future?

Edit [`agents.manifest.json`](./agents.manifest.json): move the old path into `"legacyTargets"` and put the new path in `"target"`, then run `node ~/.agents/sync.mjs --all`.
