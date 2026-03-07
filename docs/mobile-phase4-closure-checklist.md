# Phase 4 Closure Checklist (Draft)

## Objective
Define explicit, auditable closure gates for mobile rewrite hardening before Phase 4 sign-off.

## Automated Guards
- [ ] CI runs green with:
  - [ ] `MobileE2ESmoke.auth-entry.test.tsx`
  - [ ] `MobileE2ESmoke.tab-flow.test.tsx`
  - [ ] `RepositoryAdapters.contract.test.ts`
  - [ ] `RepositoryAdapters.groupsPredictions.contract.test.ts`
  - [ ] `RepositoryFallbackTransitions.test.ts`
  - [ ] `FallbackDiagnostics.history.test.ts`
  - [ ] `AuthContext.fallbackHistory.integration.test.tsx`
- [ ] `pnpm run typecheck:web` green on latest branch head.
- [ ] `pnpm --filter @fulbito/mobile typecheck` green on latest branch head.
- [ ] `pnpm run build:web` green (pre-existing warnings allowed if unchanged and logged).

## Manual QA Gates
- [ ] Full iOS pass across 5 tabs in `Mock Fallback` mode.
- [ ] Full Android pass across 5 tabs in `Mock Fallback` mode.
- [ ] Full iOS pass across 5 tabs in `HTTP Session` mode.
- [ ] Full Android pass across 5 tabs in `HTTP Session` mode.
- [ ] All screenshot evidence stored under:
  - [ ] `ui reference/current iOS/`
  - [ ] `ui reference/current Android/`

## Functional Behavior Gates
- [ ] Auth gate:
  - [ ] login transition into `Inicio`.
- [ ] Pronósticos:
  - [ ] save flow in app smoke.
  - [ ] invalid input handling.
- [ ] Posiciones:
  - [ ] `POSICIONES` <-> `STATS` toggle.
- [ ] Fixture:
  - [ ] status/date grouping behavior.
- [ ] Grupos:
  - [ ] create success + rejection path.
  - [ ] join validation + rejection + retry-success path.

## Contracts and Fallback Gates
- [ ] HTTP adapter contract parity validated against mock shape.
- [ ] Malformed payload behavior validated.
- [ ] Repository-composition fallback continuity validated.
- [ ] Fallback diagnostics history hydration/clear coverage validated.

## Documentation Gates
- [ ] `docs/mobile-migration-plan.md` updated in latest mobile-scope commit.
- [ ] `docs/mobile-phase3-closure-summary.md` contains latest screenshot references and guard mapping.
- [ ] Phase 4 closure recommendation entry added after all gates pass.
