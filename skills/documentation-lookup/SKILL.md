---
name: documentation-lookup
description: Verify current library, framework, SDK, or cloud API documentation from authoritative first-party sources instead of relying on stale training data.
---

# Authoritative Documentation Lookup

Never guess version-specific APIs, configuration schemas, or CLI flags when authoritative docs can be checked.

## Workflow
1. **Check Installed Version First:** Inspect `package.json`, lockfiles, `tsconfig.json`, or existing codebase imports to confirm the exact major/minor version in use (e.g., Express 4 vs 5, Kysely 0.28, Zod 3.24, React 18 vs 19).
2. **Query Official Sources:** Use available documentation MCP tools (e.g., Google Developer Knowledge MCP, Context7) or web search restricted to official vendor domains and GitHub release notes.
3. **Adapt to Project Conventions:** Translate raw documentation snippets to match the repository's layering, error classes, and TypeScript strictness before applying.
4. **State Uncertainty Explicitly:** If official docs are inaccessible or ambiguous, state what could not be verified rather than inventing flags or methods.
