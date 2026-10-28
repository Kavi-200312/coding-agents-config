---
name: git-workflow
description: Interactive Git commit, branch, and PR workflow with mandatory user approval gates. Use on commit, push, branch, or PR requests.
---

# Interactive Git & PR Workflow

Never run `git commit`, `git push`, `git merge`, `git rebase`, or create a PR without explicit per-instance user approval.

## Workflow
1. **Inspect (Read-Only):** Run `git status --short --branch`, `git diff`, `git diff --staged`, and `git log --oneline -5`.
2. **Group & Propose Before Mutating:**
   - Group modified/untracked files into logical, atomic commits ordered by dependency (DB/migrations  ->  shared  ->  module backend  ->  frontend  ->  tests/docs).
   - Present the file list, target branch, and proposed Conventional Commit message (`<type>(<scope>): <imperative summary>` + concise intent bullets).
   - **Never add AI attribution** (no `Co-Authored-By`, no `Generated with ...` trailers).
3. **Wait for Approval Gate:** Execute `git add` + `git commit` ONLY after the user explicitly approves the proposal.
4. **Push & PR Gate:** Ask before pushing or opening a PR (default base branch: `develop` unless specified otherwise).

## Deep Reference (Load On Demand)
- Full multi-group commit presentation templates and GitHub MCP PR creation steps: `references/detailed-guide.md`
