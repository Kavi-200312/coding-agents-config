---
name: frontend-patterns
description: React 18/19 and Next.js architecture, hooks discipline, state management, Vercel performance optimization (no waterfalls, bundle size, re-renders), and WCAG accessibility.
---

# Frontend & React Engineering Patterns

Use when building, refactoring, or reviewing React/Next.js components, hooks, forms, and client/server data flows.

## Core Rules
1. **Component & State Boundaries:** Keep components single-purpose. Derive computed values during render instead of syncing state with `useEffect`. Colocate state to the lowest common ancestor; use URL params for filter/sort/pagination state and React Query/SWR for server cache.
2. **Eliminate Network Waterfalls (Priority #1 Perf):** Parallelize independent fetches (`Promise.all` / `useSuspenseQueries`). Never chain sequential client fetches when data can be fetched in parallel or on the server.
3. **Bundle & Render Discipline:** Use direct imports instead of barrel files on heavy icon/chart libraries; lazy-load heavy modals/drawers (`next/dynamic` or `React.lazy`). Stabilize object/callback references only when passed to memoized children or effect dependencies.
4. **Semantic HTML & Accessibility (WCAG AA):** Use native `<button>`, `<label htmlFor>`, `<dialog>`, and landmark elements before reaching for ARIA. Ensure full keyboard navigation (`Tab`, `Enter`, `Escape`, focus trapping in modals/drawers) and associate form errors via `aria-describedby` + `aria-invalid`.

## Deep Reference (Load On Demand)
- React 18/19 & Next.js patterns: `C:/Users/Kaviyarasu/.agents/skills/frontend-patterns/references/react-and-architecture.md`
- Vercel 70+ React performance rules: `C:/Users/Kaviyarasu/.agents/skills/frontend-patterns/references/react-performance.md`
- WCAG & ARIA accessibility checklist: `C:/Users/Kaviyarasu/.agents/skills/frontend-patterns/references/accessibility.md`
