# Ponytail Reference Guide

Pragmatic senior engineering standards derived from Dietrich Gebert's Ponytail methodology: eliminate AI-slop, over-engineering, and speculative complexity.

---

## The 7-Rung Ponytail Ladder

Before writing any new function, class, or abstraction, test each rung in order and STOP at the first one that solves the problem:

1. **YAGNI (You Aren't Gonna Need It):**
   - Question the requirement. Is this requested, or is it speculative "future-proofing"?
   - If speculative, delete it from the design.

2. **Codebase Reuse:**
   - Does a helper, utility, repository method, or validator already exist in the codebase?
   - Grep before authoring. Extend an existing helper rather than creating a duplicate.

3. **Standard Library:**
   - Does native Node.js / TypeScript / ECMAScript already provide this?
   - Examples: `node:crypto.randomUUID()`, `Array.prototype.find()`, `URLSearchParams`, native `fetch`.

4. **Native Platform / Engine:**
   - Does the database engine or framework handle this natively?
   - Examples: SQL `ON DELETE CASCADE`, unique indexes, database-level defaults, framework-level error middleware.

5. **Existing Dependencies:**
   - Check `package.json` before installing new packages. If Lodash, Luxon, or Zod is already installed, use it instead of introducing another dependency.

6. **Single Function / One-Liner:**
   - Replace complex design patterns (Strategy, Factory, Visitor) with a pure function or lookup table if there is only 1-2 consumers.
   - 20 lines of clear procedural code beats 5 files of abstract class hierarchies.

7. **Minimal Clean Implementation:**
   - If code must be written, write the minimal, well-typed diff that directly fixes the root cause.
   - Do not touch unrelated formatting or refactor adjacent methods unless required.

---

## Ponytail Code Review Checklist

When reviewing code or plans:
- [ ] Are there abstract classes with only a single implementation? (Inline them)
- [ ] Are there speculative configuration options or generic parameters with no callers? (Cut them)
- [ ] Are there multi-file wrappers around standard library calls? (Flatten them)
- [ ] Are there pass-through methods that simply forward arguments to another function? (Remove the middleman)
- [ ] Are there comments marked `ponytail:` explaining deliberate, clean shortcuts? (Keep them)
