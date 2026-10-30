# AI Agent Bootstrap & Cross-Machine Sync Playbook (`BOOTSTRAP.md`)

> **For the Human User:**
> After cloning this repository (`~/.agents`) onto a new machine, you can set it up in two ways:
> 1. **Terminal One-Liner:** Run `node ~/.agents/sync.mjs` (interactive) or `node ~/.agents/sync.mjs --all`
> 2. **Ask Any AI Agent:** Open Antigravity, Devin, Claude Code, or Codex and say:
>    *"Read `~/.agents/BOOTSTRAP.md` and set up my agent environment."*

---

## Instructions for the AI Coding Agent Reading This File

When the user asks you to read `BOOTSTRAP.md` or set up/sync their agent environment from this repository, execute the following **mandatory 4-step interactive protocol**:

### Step 1: Inspect the Machine's Current Tool Status
Run the non-destructive status check first:
```bash
node ~/.agents/sync.mjs --status
```
This inspects `agents.manifest.json` and reports which AI tools (`antigravity`, `devin`, `codex`, `claude`) are installed on this OS (`win32`, `darwin`, or `linux`) and whether their `AGENTS.md`/`GEMINI.md`/`CLAUDE.md` and `skills/` paths are already linked or have existing unlinked files.

### Step 2: Ask the User Which AI Agent(s) to Configure
- **If the user has NOT already named the target tool(s)** in their prompt, present the detected tools from Step 1 and ask:
  > *"Which AI agent(s) do you want me to back up and link to `~/.agents`? (`antigravity`, `devin`, `codex`, `claude`, or `all`)"*
- **If the user ALREADY specified the target tool(s)** (for example: *"copy/link this to devin"*), proceed directly to Step 3 for that tool without asking again.

### Step 3: Back Up Existing Config & Link Selected Tool(s)
Run `sync.mjs` with the user's selected tool name(s):
```bash
# Example for a single agent (e.g. Devin):
node ~/.agents/sync.mjs devin

# Example for multiple agents:
node ~/.agents/sync.mjs antigravity devin

# Example for all installed agents:
node ~/.agents/sync.mjs --all
```
What `sync.mjs` automatically does:
1. **Backs up existing non-linked files/folders** from the target tool into `~/.agents/_archive/<YYYY-MM-DD_HHmmss>_sync-backup/<tool>/` so zero prior work is ever lost.
2. **Creates OS links** (NTFS Hardlinks for `AGENTS.md`/`GEMINI.md`/`CLAUDE.md`; NTFS Directory Junctions on Windows or symlinks on macOS/Linux for `skills/`).
3. **Installs Git hooks** (`.git/hooks/post-merge` and `post-checkout`) so future `git pull` updates automatically refresh file hardlink inodes.

### Step 4: Verify & Report
Confirm from the `sync.mjs` output table that all selected tools show `LINKED (OK)` and report the backup path (if any files were archived) to the user.

---

## How to Handle Future Tool Path Changes

If an AI tool changes where it stores global instructions or skills in a future version:
1. Open [`agents.manifest.json`](./agents.manifest.json).
2. Move the old path string into `"legacyTargets": [...]` and update `"target"` with the new path.
3. Run `node ~/.agents/sync.mjs <tool>` — the script automatically removes the old legacy link, backs up any files at the new location, and links the new path.
