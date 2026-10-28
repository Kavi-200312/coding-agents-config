---
name: tickets
description: Generate manager- and QA-ready Zoho Sprint tickets in Markdown. Supports Git mode (from commits/diffs) and Module mode (splitting a module into deliverable tickets).
---

# Zoho Sprint Ticket Generator

Create crisp, manager- and QA-readable Zoho Sprint tickets grounded in actual code and git diffs.

## Modes
1. **Git Mode (Default on "ticket", "ticket update", "summarize changes"):**
   - Run `git status`, `git log --oneline -5`, and `git diff` to trace actual behavior, API, schema, and validation changes.
2. **Module Mode (When asked to split or document a module):**
   - Inspect the target module's routes, controller, service, repository, schema, types, permissions, and migrations. Split into independent, rollback-safe deliverable tickets.

## Formatting Rules
- Concise, factual engineering prose — zero marketing fluff, zero repetition across sections.
- Group related changes into coherent feature bullets (preserve exact endpoints, status codes, table/column names, error classes, and RBAC permissions).
- Include **Story Points** with a 1-line justification by default. Omit Branch/Commit/PR lines unless explicitly requested.
- Include concrete **QA Verification Scenarios** (happy path, validation failures, permission/scope checks, edge cases).

## Deep Reference (Load On Demand)
- Full Zoho Sprint ticket templates, split rules, and complete examples for Git Mode and Module Mode: `C:/Users/Kaviyarasu/.agents/skills/tickets/references/detailed-guide.md`
