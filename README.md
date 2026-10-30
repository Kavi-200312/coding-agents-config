# Unified AI Agent SSOT Hub (`~/.agents`)

Single Source of Truth (SSOT) for global engineering standards and progressive-disclosure skills across **Antigravity**, **Devin**, **Codex**, and **Claude Code**.

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

## Architecture (Skills-First)

All separate subagent profiles have been retired in favor of high-signal, progressive-disclosure **skills** and unified global instructions in [`AGENTS.md`](./AGENTS.md).

```text
~/.agents/
├── AGENTS.md                 # Canonical Global Engineering Standards (hardlinked to all tools)
├── BOOTSTRAP.md              # AI-Agent interactive setup playbook for new machines
├── agents.manifest.json      # Future-proof OS path registry (win32 / darwin / linux)
├── sync.mjs                  # Zero-dependency CLI & interactive backup/link engine
├── README.md                 # Hub architecture & synchronization guide
├── .gitignore                # Excludes local backup archives (_archive/)
├── .skill-lock.json          # Lockfile tracking upstream skill sources and hashes
└── skills/                   # 27 Progressive-Disclosure Skills (SKILL.md + references/)
    ├── api-design/
    ├── api-tester/
    ├── architecture-decision-records/
    ├── backend-patterns/
    ├── caveman/
    ├── context-handoff/
    ├── continuous-learning-v2/
    ├── daily-update/
    ├── database-patterns/
    ├── error-handling/
    ├── executing-plans/
    ├── frontend-patterns/
    ├── git-workflow/
    ├── grill-me/
    ├── grilling/
    ├── input-validation/
    ├── instruction-audit/
    ├── logging-observability/
    ├── ponytail/
    ├── requesting-code-review/
    ├── security-review/
    ├── skill-creator/
    ├── systematic-debugging/
    ├── test-driven-development/
    ├── tickets/
    ├── verification-before-completion/
    └── writing-plans/
```

## Cross-Agent Link Topology (Zero Drift)

| Tool | Global Instructions (Hardlink) | Skills (Junction / Symlink) |
|---|---|---|
| **Antigravity** | `~/.gemini/GEMINI.md` → `~/.agents/AGENTS.md` | `~/.gemini/config/skills` → `~/.agents/skills` |
| **Devin** | `%APPDATA%\devin\AGENTS.md` → `~/.agents/AGENTS.md` | `%APPDATA%\devin\skills` → `~/.agents/skills` |
| **Codex** | `~/.codex/AGENTS.md` → `~/.agents/AGENTS.md` | `~/.codex/skills/<skill>` → `~/.agents/skills/<skill>` |
| **Claude Code** | `~/.claude/CLAUDE.md` → `~/.agents/AGENTS.md` | `~/.claude/skills` → `~/.agents/skills` |

## What If a Tool Changes Its Path in the Future?

Edit [`agents.manifest.json`](./agents.manifest.json): move the old path into `"legacyTargets"` and put the new path in `"target"`, then run `node ~/.agents/sync.mjs --all`.
