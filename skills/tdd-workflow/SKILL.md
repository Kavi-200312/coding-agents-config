---
name: tdd-workflow
description: Unit, integration, E2E (Playwright), and React component testing strategy (Jest/Vitest/RTL). Covers edge-case matrices, transaction/mock boundaries, and regression tests.
---

# Testing & TDD Workflow

Write deterministic tests that verify real behavior and edge cases rather than implementation details.

## Core Rules
1. **When to Run & Write Tests:**
   - Run targeted tests (`npm test -- <path>`) when modifying tested modules or fixing bugs.
   - Do not run full-repo coverage suites on every minor edit unless requested.
2. **Test Behavior & High-Risk Edge Cases:**
   - **Unit Tests:** Pure domain policies, mappers, date calculators, reference validators, and 5-step service pipeline helpers.
   - **Service/Integration Tests:** Lock rejection, version conflict (409), cross-field validation errors, transaction rollback on partial failure, snapshot population, and audit entry generation.
   - **React Component Tests:** Query by accessible role/label (`getByRole`, `getByLabelText`), use `userEvent`, mock network via MSW (not internal hooks), and assert visible DOM outcomes.
3. **Mock Boundaries Cleanly:** Mock external I/O, repositories, or adapters at the boundary; never mock the unit under test or assert private method calls.

## Deep Reference (Load On Demand)
- Backend TDD, Jest/Vitest & Playwright E2E guide: `C:/Users/Kaviyarasu/.agents/skills/tdd-workflow/references/backend-testing.md`
- React Testing Library, MSW, and axe accessibility testing guide: `C:/Users/Kaviyarasu/.agents/skills/tdd-workflow/references/react-testing.md`
