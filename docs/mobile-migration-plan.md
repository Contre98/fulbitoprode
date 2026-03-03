# Mobile Rewrite Migration Plan

## Objective
Deliver a native-first iOS/Android app (Expo React Native) from the existing Fulbito web product while preserving backend portability through shared contracts, incremental domain extraction, and auditable phase-based execution so future backend/database migration can happen without rewriting mobile feature flows.

## Current Branch + Commit Anchors
- Current working branch: `mobile/react-native-rewrite`
- Checkpoint commit: `be6238c` (`chore: checkpoint current web app changes`)
- Monorepo prep commit: `95ee00a` (`chore: monorepo prep (apps/web + workspaces + turbo scaffold)`)
- Merge commit into base branch: `a59db2d` (`merge: monorepo prep into UI-Tests`)
- Mobile bootstrap commit: `5e9e4fa` (`feat: bootstrap expo mobile app with shared contracts`)

## Phase Status

| Phase | Status | Owner | Exit Criteria |
|---|---|---|---|
| Phase 0: Monorepo Prep | Done | `@contre` | Web moved to `apps/web`, workspace tooling active, CI adjusted for `pnpm`. |
| Phase 1: Expo Bootstrap | Done | `@contre` | Expo app runs with nav/auth shell and mobile workspace wiring. |
| Phase 2: First Shared Extraction | Done | `@contre` | Initial shared domain/contracts created and consumed by web+mobile. |
| Phase 3+: Mobile MVP Features | In Progress | `@contre` | Core screens/flows implemented with mock-first repositories and validation logs per milestone. |

## Phase Checklists

### Phase 0
- [x] Move existing web app from root to `apps/web` with history-preserving moves.
- [x] Add `pnpm-workspace.yaml` and `turbo.json` at repo root.
- [x] Add root scripts for `dev`, `build`, `lint`, `typecheck`, and `test` orchestration.
- [x] Update CI workflow to install and run through `pnpm` workspace commands.
- [x] Keep Phase 0 limited to restructure/tooling (no mobile feature implementation).

### Phase 1
- [x] Bootstrap Expo managed app in `apps/mobile`.
- [x] Add navigation skeleton (auth gate + bottom tabs).
- [x] Add React Query provider and app-level state wiring.
- [x] Add initial mock auth flow for native-first local development.
- [x] Add Metro monorepo config for workspace package resolution.

### Phase 2
- [x] Create first shared domain slice in `packages/domain` (`User`, `Membership`, session payload).
- [x] Create first shared contracts in `packages/api-contracts` (auth + repository interfaces).
- [x] Refactor web auth/session imports to shared domain types.
- [x] Remove mixed lockfile risk (`apps/web/package-lock.json`) and standardize on `pnpm`.
- [x] Validate web/mobile typechecks and web build after extraction.

### Phase 3+
- [x] Implement real `Pronósticos` feature flow (fixture load + prediction save + optimistic UI).
- [x] Implement `Posiciones` screen using contract-backed leaderboard repository.
- [ ] Implement `Fixture` screen with date/status grouping and loading/error states.
- [x] Expand shared domain extraction for scoring and prediction utilities.
- [ ] Add HTTP repository adapters in mobile behind existing interfaces (keep mock fallback).
- [x] Add reusable loading/error/empty state components in `apps/mobile/src/components` and apply to core tabs.
- [ ] Add mobile smoke run log for iOS simulator.
- [ ] Add mobile smoke run log for Android emulator.

## Decisions Log

| Date | Decision | Rationale | Impacted Paths |
|---|---|---|---|
| 2026-03-03 | Use `docs/mobile-migration-plan.md` as canonical living plan. | Keep implementation status auditable and centralized across PRs. | `docs/mobile-migration-plan.md` |
| 2026-03-03 | Enforce plan updates in PR checklist for mobile-scope changes. | Prevent drift between implementation and migration plan. | `.github/pull_request_template.md` |
| 2026-03-03 | Use Expo managed workflow with monorepo Metro config. | Fast native delivery while preserving workspace shared packages. | `apps/mobile/*`, `package.json`, `pnpm-workspace.yaml` |
| 2026-03-03 | Keep backend migration out of current phase, use contracts-first adapters. | Decouple mobile feature delivery from backend/platform migration timeline. | `packages/api-contracts/*`, `apps/mobile/src/repositories/*` |
| 2026-03-03 | Centralize prediction draft normalization in `@fulbito/domain` and consume it from mobile UI. | Avoid screen-level parsing drift and keep future web/mobile validation behavior aligned. | `packages/domain/src/index.ts`, `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-03 | Reuse dedicated mobile async state components across core tabs. | Keep loading/error/empty UX consistent and avoid ad-hoc per-screen placeholders. | `apps/mobile/src/components/*State.tsx`, `apps/mobile/src/screens/*Screen.tsx` |
| 2026-03-03 | Move scoring rules (`SCORE_RULES`, `calculatePredictionPoints`) to `@fulbito/domain` and consume from web APIs/tests. | Ensure scoring behavior is shared and reusable by mobile without duplicating logic in app-specific layers. | `packages/domain/src/index.ts`, `apps/web/src/app/api/*`, `apps/web/src/test/scoring.test.ts` |

## Validation Log

| Date | Command / Scenario | Result | Notes |
|---|---|---|---|
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After React types alignment and monorepo extraction updates. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Expo bootstrap and repository wiring validated. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Existing Next warnings (`<img>` usage, one hook dependency warning), no build blocker. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After implementing contracts-backed mobile `Pronósticos` flow + shared prediction input helpers. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | New `PronosticosScreen` query/mutation flow and domain helper usage validated. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), no new blocker from shared domain changes. |
| 2026-03-03 | `pnpm --filter @fulbito/web test:run -- src/test/prediction-input.test.ts` | Pass | New shared-domain prediction input helper tests plus existing suite passed. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After introducing reusable mobile async state components and applying them to core tabs. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `LoadingState`, `ErrorState`, `EmptyState` components compile clean with screen integrations. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by mobile component updates. |
| 2026-03-03 | `pnpm run typecheck:web` | Fail then pass | Initial fail after scoring extraction due `Prediction` type mismatch (`fixtureId` required). Fixed by introducing shared scoreline type and reran successfully. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile unaffected by scoring extraction; contracts remained stable. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), no new build blocker from domain scoring extraction. |
| 2026-03-03 | `pnpm --filter @fulbito/web test:run -- src/test/scoring.test.ts src/test/prediction-input.test.ts` | Pass | Shared-domain scoring and prediction-input utilities validated via web Vitest suite. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After implementing contract-backed `Posiciones` mobile screen. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `PosicionesScreen` query/state rendering validated. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile `Posiciones` changes. |
| 2026-03-03 | iOS smoke | Not run yet | Pending simulator run logging in Phase 3+. |
| 2026-03-03 | Android smoke | Not run yet | Pending emulator run logging in Phase 3+. |

## Risks & Mitigations

| Risk | Severity | Mitigation | Owner |
|---|---|---|---|
| Plan file not updated in future mobile commits. | High | Add mandatory PR checklist item + commit-time review rule. | `@contre` |
| Contract drift between mock and future HTTP adapters. | High | Keep adapters behind shared interfaces + add parity checks per feature. | `@contre` |
| Metro resolution regressions in monorepo after dependency changes. | Medium | Keep `metro.config.js` workspace watch/resolver config version-controlled and revalidate on dependency updates. | `@contre` |
| Web regressions from future shared extraction refactors. | Medium | Require `typecheck:web` + `build:web` log entry for each extraction commit. | `@contre` |

## Next Actions (Top 5)
1. Implement `Fixture` mobile screen with grouped dates/status using repository interfaces.
2. Add HTTP repository adapters in mobile behind existing interfaces while preserving mock fallback.
3. Execute and log first iOS + Android smoke runs in the Validation Log.
4. Add shared domain utilities for fixture grouping/date labeling and consume them in mobile + web where duplicated.
5. Add lightweight mobile screen tests once React Native test tooling is introduced in workspace.
