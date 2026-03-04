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
- [x] Implement `Fixture` screen with date/status grouping and loading/error states.
- [x] Expand shared domain extraction for scoring and prediction utilities.
- [x] Add HTTP repository adapters in mobile behind existing interfaces (keep mock fallback).
- [x] Add reusable loading/error/empty state components in `apps/mobile/src/components` and apply to core tabs.
- [x] Wire mobile period/group selection state across core tabs and connect query keys.
- [x] Add mobile smoke run log for iOS simulator.
- [x] Add mobile smoke run log for Android emulator.
- [x] Add dedicated `android:smoke` script with explicit Metro port (`8083`) for repeatable manual QA.
- [x] Add in-app dev action to clear persisted fallback diagnostics history.
- [x] Start per-screen visual diff execution for 1:1 web-to-mobile parity (Pronósticos first).
- [x] Add Pronósticos per-card lock/saving/error chips and top action controls for closer web parity.
- [x] Replace Pronósticos header text control pills with icon-style controls.
- [x] Apply screenshot-driven Pronósticos layout parity pass using `ui reference/Pronosticos-*.png`.
- [x] Apply Pronósticos pixel-pass adjustments (header no-wrap scale + text scaling guard + tab order/labels alignment).
- [x] Fix Pronósticos safe-area overlap and switch screen background to reference light-gray tone.
- [x] Apply screenshot-driven Posiciones parity pass (table + stats modes) using `ui reference/Posiciones*.png`.
- [x] Apply screenshot-driven Fixture parity pass using `ui reference/Fixture.png`.
- [x] Align bottom-tab icon artwork/states (active chip + custom glyph icons + label polish) with references.
- [x] Align mock fixture dataset and derived score display with screenshot teams/results for Pronósticos + Fixture parity QA.
- [x] Align per-screen "Selección actual" competition label composition with references (`Pronósticos`: liga+etapa, `Posiciones/Fixture`: etapa-first).
- [x] Replace emoji-based top-left brand badge with reusable non-emoji icon treatment across `Pronósticos`, `Posiciones`, and `Fixture`.
- [x] Add shared deterministic team crest component and apply it to Pronósticos/Fixture match rows.
- [x] Run final typography/spacing polish pass on `Posiciones` and `Fixture` against screenshot references.

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
| 2026-03-03 | Use explicit Expo root entry file (`apps/mobile/index.js`) instead of `expo/AppEntry` in monorepo. | Prevent pnpm workspace path resolution failures like `Unable to resolve ../../App` on Android bundling. | `apps/mobile/package.json`, `apps/mobile/index.js` |
| 2026-03-03 | Route mobile repositories through HTTP adapters with per-method mock fallback. | Enable incremental backend connectivity without blocking mobile flows when auth/network/backend is unavailable. | `apps/mobile/src/repositories/httpDataRepositories.ts`, `apps/mobile/src/repositories/index.ts`, `apps/mobile/src/screens/*Screen.tsx` |
| 2026-03-03 | Share fixture date key/label/grouping helpers in `@fulbito/domain` and consume from web + mobile. | Remove duplicate fixture date logic and keep grouping/sorting behavior aligned across clients. | `packages/domain/src/index.ts`, `apps/mobile/src/screens/FixtureScreen.tsx`, `apps/web/src/lib/liga-live-provider.ts` |
| 2026-03-03 | Add shared mobile `fecha` context + selector and consume it across core tabs. | Keep tab filtering state synchronized across `Pronósticos`, `Posiciones`, and `Fixture` queries. | `apps/mobile/src/state/PeriodContext.tsx`, `apps/mobile/src/components/FechaSelector.tsx`, `apps/mobile/src/screens/*Screen.tsx` |
| 2026-03-03 | Add shared mobile group selection context + selector and connect repository query keys. | Enable consistent membership-scoped data loading across tabs instead of hardcoded first membership usage. | `apps/mobile/src/state/GroupContext.tsx`, `apps/mobile/src/components/GroupSelector.tsx`, `apps/mobile/src/screens/*Screen.tsx` |
| 2026-03-03 | Bridge mobile auth/session to HTTP first, then fallback to mock and gate data adapters by session mode. | Let mobile use authenticated backend paths when session exists while preserving mock-first resilience for local/dev/offline scenarios. | `apps/mobile/src/repositories/httpAuthRepository.ts`, `apps/mobile/src/repositories/authBridgeState.ts`, `apps/mobile/src/repositories/index.ts`, `apps/mobile/src/state/AuthContext.tsx` |
| 2026-03-03 | Fetch mobile fecha options from `/api/fechas` based on selected membership, with local fallback defaults. | Replace hardcoded fecha list with backend-driven options while preserving usability when backend/auth is unavailable. | `apps/mobile/src/state/PeriodContext.tsx`, `apps/mobile/src/components/FechaSelector.tsx` |
| 2026-03-03 | Surface current mobile data mode (`HTTP Session` vs `Mock Fallback`) in screen chrome. | Improve QA/debugging visibility for adapter path selection while rolling out incremental backend auth/session support. | `apps/mobile/src/state/AuthContext.tsx`, `apps/mobile/src/components/DataModeBadge.tsx`, `apps/mobile/src/components/ScreenFrame.tsx` |
| 2026-03-03 | Capture endpoint-specific fallback failure reason and surface it in dev UI when in mock mode. | Make adapter fallback causes visible during QA/dev to reduce debugging time and clarify backend/session issues. | `apps/mobile/src/repositories/fallbackDiagnostics.ts`, `apps/mobile/src/repositories/index.ts`, `apps/mobile/src/state/AuthContext.tsx`, `apps/mobile/src/components/DataModeBadge.tsx` |
| 2026-03-03 | Add one-tap mock-mode action to re-attempt HTTP session mode from UI. | Reduce QA friction by allowing runtime backend reconnect checks without restarting the app or re-authenticating manually. | `apps/mobile/src/state/AuthContext.tsx`, `apps/mobile/src/components/DataModeBadge.tsx` |
| 2026-03-03 | Scaffold mobile test harness files with dependency-aware runner (no package installs). | Unblock test structure/procedure setup while network/dependency installation is unavailable. | `apps/mobile/jest.config.cjs`, `apps/mobile/jest.setup.js`, `apps/mobile/scripts/run-mobile-tests.mjs`, `apps/mobile/src/test/README.md`, `apps/mobile/package.json` |
| 2026-03-03 | Guard mobile Expo scripts to Node 20-22 and fail fast on unsupported runtimes. | Avoid recurring `ERR_SOCKET_BAD_PORT` failures under Node 24 and make iOS smoke prerequisites explicit at command start. | `apps/mobile/package.json`, `apps/mobile/scripts/check-node-version.mjs` |
| 2026-03-04 | Persist mobile group/fecha selections with AsyncStorage in context state. | Keep user filter choices across app restarts without bypassing repository contracts or hardcoding screen state. | `apps/mobile/src/state/GroupContext.tsx`, `apps/mobile/src/state/PeriodContext.tsx`, `apps/mobile/package.json` |
| 2026-03-04 | Activate mobile Jest harness with alias mapping and first selector/data-mode smoke tests. | Move from scaffolded harness to runnable tests that validate core shared tab state interactions. | `apps/mobile/jest.config.cjs`, `apps/mobile/jest.setup.js`, `apps/mobile/src/test/*.test.tsx`, `apps/mobile/package.json` |
| 2026-03-04 | Persist dev fallback diagnostics history (last N entries) and surface recent scopes in mock-mode badge. | Preserve transient fallback root-cause visibility across app restarts and speed up QA/debugging without backend dependency. | `apps/mobile/src/repositories/fallbackDiagnostics.ts`, `apps/mobile/src/state/AuthContext.tsx`, `apps/mobile/src/components/DataModeBadge.tsx`, `apps/mobile/src/test/DataModeBadge.test.tsx` |
| 2026-03-04 | Align mobile runtime package versions to Expo SDK 52 compatibility targets (`react-native`, `react-native-screens`, `@react-native-async-storage/async-storage`). | Reduce startup advisory noise and keep native runtime dependencies on the SDK-supported matrix with minimum architecture change risk. | `apps/mobile/package.json`, `pnpm-lock.yaml` |
| 2026-03-04 | Add context-level persistence tests for `GroupProvider` and `PeriodProvider`. | Validate boot-time restore and storage writes directly at state-provider level beyond UI selector smoke tests. | `apps/mobile/src/test/GroupContext.persistence.test.tsx`, `apps/mobile/src/test/PeriodContext.persistence.test.tsx` |
| 2026-03-04 | Add dedicated `ios:smoke` script with explicit Metro port (`8082`). | Standardize repeatable iOS manual QA invocation and avoid interactive port selection prompts when validating simulator launch. | `apps/mobile/package.json` |
| 2026-03-04 | Add dedicated `android:smoke` script with explicit Metro port (`8083`). | Standardize repeatable Android manual QA invocation and reduce ambiguity between native prebuild run commands and smoke commands. | `apps/mobile/package.json` |
| 2026-03-04 | Add dedicated mobile QA checklist document for cross-tab and restart persistence verification. | Make manual regression checks repeatable across iOS/Android while rollout continues with mock/HTTP dual-mode behavior. | `docs/mobile-qa-checklist.md` |
| 2026-03-04 | Start high-fidelity mobile UI parity pass with `Pronósticos` (tabs + enhanced card layout) using web mobile UX as visual reference. | Preserve original product UX intent while keeping contracts/data flow unchanged and limiting scope to presentational updates. | `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-04 | Refine Pronósticos parity with web-style custom top header and fecha left/right cycler behavior. | Close key UX deltas identified during manual review while retaining existing repository contracts and shared state flow. | `apps/mobile/src/components/ScreenFrame.tsx`, `apps/mobile/src/components/FechaSelector.tsx`, `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-04 | Continue high-fidelity UI parity on `Posiciones` with web-aligned header, mode controls, and leaderboard card styling. | Keep UX language consistent with web mobile design while preserving existing leaderboard contracts and query behavior. | `apps/mobile/src/screens/PosicionesScreen.tsx` |
| 2026-03-04 | Continue high-fidelity UI parity on `Fixture` with web-aligned header, filter chips, and match-card structure. | Complete core-tab visual parity (Pronósticos/Posiciones/Fixture) while preserving fixture repository contract and grouped-date behavior. | `apps/mobile/src/screens/FixtureScreen.tsx` |
| 2026-03-04 | Add mobile in-app dev action to clear persisted fallback diagnostics history from the mock-mode badge. | Keep QA/dev retry cycles clean without app reinstalls while preserving existing contracts-first adapter fallback flow. | `apps/mobile/src/repositories/fallbackDiagnostics.ts`, `apps/mobile/src/state/AuthContext.tsx`, `apps/mobile/src/components/DataModeBadge.tsx`, `apps/mobile/src/test/DataModeBadge.test.tsx` |
| 2026-03-04 | Begin structured 1:1 Pronósticos visual parity pass by aligning team-code emphasis, match score control treatment, date badge, and mode labels to web mobile UX. | Close the highest-impact visual gaps first while keeping existing repositories/contracts untouched and incremental commits reviewable. | `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-04 | Add Pronósticos per-card status chips (`bloqueado`, `guardando`, error) and header action controls in mobile. | Move parity beyond static styling into web-like feedback states and top-bar affordances while keeping contracts/adapters unchanged. | `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-04 | Use dependency-free shape glyphs for Pronósticos header action icons because npm registry DNS is intermittently unavailable. | Preserve parity momentum without blocking on package installation; swap to `@expo/vector-icons` once registry connectivity is stable. | `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-04 | Extend `ScreenFrame` with optional badge/content overrides and rebuild Pronósticos layout from screenshot references. | Allow high-fidelity per-screen parity when generic frame chrome diverges from original web mobile UI while preserving shared repository contracts/state flow. | `apps/mobile/src/components/ScreenFrame.tsx`, `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-04 | Add `ScreenFrame` container-style override and disable font scaling on key Pronósticos labels for pixel parity. | Prevent oversized text/wrapping under device accessibility scaling and match screenshot proportions more consistently across simulators. | `apps/mobile/src/components/ScreenFrame.tsx`, `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-04 | Reorder/rename bottom tabs to `Inicio · Posiciones · Pronósticos · Fixture · Grupos` for visual parity with references. | Align core navigation information architecture with original web-mobile UX before final per-screen polish. | `apps/mobile/src/navigation/AppNavigation.tsx` |
| 2026-03-04 | Apply safe-area inset-aware top header padding in Pronósticos and align page background color to reference screenshots. | Prevent notch/status-bar overlap and remove dark legacy background drift that broke visual parity checks on iPhone simulators. | `apps/mobile/src/screens/PronosticosScreen.tsx` |
| 2026-03-04 | Rebuild Posiciones screen with screenshot-driven custom layout for `POSICIONES` and `STATS` modes. | Close high-impact visual parity gaps beyond generic shared components while keeping leaderboard contracts/state flow intact. | `apps/mobile/src/screens/PosicionesScreen.tsx` |
| 2026-03-04 | Rebuild Fixture screen with screenshot-driven custom layout (header, selection/fecha controls, filter strip, grouped rows). | Align fixture presentation with reference visuals while keeping existing fixture/group/period repository contracts untouched. | `apps/mobile/src/screens/FixtureScreen.tsx` |
| 2026-03-04 | Replace default bottom-tab icons with custom parity-themed glyphs and active-chip styling. | Match reference navigation affordances and remove default tab icon appearance mismatch while preserving route structure. | `apps/mobile/src/navigation/AppNavigation.tsx` |
| 2026-03-04 | Update mobile mock fixture list to mirror screenshot clubs and encode final scores in fixture IDs for deterministic UI parity rendering. | Keep contracts unchanged while making local/mock QA visuals deterministic and reference-aligned across Pronósticos history + Fixture rows. | `apps/mobile/src/repositories/mockDataRepositories.ts`, `apps/mobile/src/screens/PronosticosScreen.tsx`, `apps/mobile/src/screens/FixtureScreen.tsx` |
| 2026-03-04 | Normalize per-screen competition label strategy for parity (`Pronósticos` keeps league+stage, `Posiciones`/`Fixture` prefer stage-first). | Reference screenshots intentionally show different label verbosity by screen; this keeps parity without touching repository contracts or data payloads. | `apps/mobile/src/screens/PronosticosScreen.tsx`, `apps/mobile/src/screens/PosicionesScreen.tsx`, `apps/mobile/src/screens/FixtureScreen.tsx` |
| 2026-03-04 | Introduce shared `BrandBadgeIcon` and replace emoji trophy mark in core-tab headers. | Remove emoji dependency while preserving brand/trophy meaning and consistent chrome parity across core tabs. | `apps/mobile/src/components/BrandBadgeIcon.tsx`, `apps/mobile/src/screens/PronosticosScreen.tsx`, `apps/mobile/src/screens/PosicionesScreen.tsx`, `apps/mobile/src/screens/FixtureScreen.tsx` |
| 2026-03-04 | Introduce shared `TeamCrest` component with per-team color mapping and deterministic fallback; replace inline initials badges in Pronósticos/Fixture rows. | Improve screenshot parity and keep team-mark rendering consistent across screens without introducing image/network dependencies. | `apps/mobile/src/components/TeamCrest.tsx`, `apps/mobile/src/screens/PronosticosScreen.tsx`, `apps/mobile/src/screens/FixtureScreen.tsx` |
| 2026-03-04 | Apply final typography/spacing density tuning to `Posiciones` and `Fixture` cards/tabs/rows. | Close remaining visual proportion deltas (row height, tab density, headline sizing) without changing repositories, contracts, or query behavior. | `apps/mobile/src/screens/PosicionesScreen.tsx`, `apps/mobile/src/screens/FixtureScreen.tsx` |

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
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After implementing grouped/status-aware `Fixture` mobile screen and mock adapter data expansion. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `FixtureScreen` grouping/rendering logic compiles with repository integration. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by mobile fixture updates. |
| 2026-03-03 | Android bundling scenario (`expo start` + `a`) | Fail then fixed | Initial failure: `Unable to resolve ../../App` from `expo/AppEntry` in pnpm path. Fixed by explicit `index.js` entrypoint. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After mobile entrypoint fix (`index.js`) for Expo bundler stability. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile types unaffected by entrypoint switch from `expo/AppEntry` to local `index.js`. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile entrypoint fix. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After HTTP adapter integration and repository composition wiring. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Fail then pass | Initial failure from generic fallback typing in repository composition. Resolved by explicit typed repository wrappers and reran successfully. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by mobile repository changes. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After extracting shared fixture date/group/sort helpers into `@fulbito/domain` and consuming them in web/mobile. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile `FixtureScreen` now uses shared domain fixture grouping helpers. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), no new blocker from shared fixture helper extraction. |
| 2026-03-03 | `pnpm --filter @fulbito/web test:run -- src/test/fixture-date-utils.test.ts` | Pass | New shared fixture date utility tests passed (plus existing suite). |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After wiring shared mobile `fecha` selection across tab queries. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `PeriodContext` + `FechaSelector` integration compiles across `Pronósticos`, `Posiciones`, and `Fixture`. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile period-state wiring. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After mobile group-selection state wiring across core tab queries. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `GroupContext` + `GroupSelector` integration compiles with `Home`, `Pronósticos`, `Posiciones`, and `Fixture`. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile group-state wiring. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After mobile HTTP auth/session bridging and repository session gating changes. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Fail then pass | Initial fail from nullable return in HTTP auth login/register paths; fixed by guaranteeing non-null `AuthSession` return and reran successfully. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile auth/session bridging. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After backend-driven mobile fecha option fetch integration in `PeriodContext`. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `PeriodContext` now consumes `GroupContext` and `/api/fechas` payload safely with fallback defaults. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile fechas integration. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After adding mobile data-mode indicator in shared screen frame. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `AuthContext` data-mode state and `DataModeBadge` rendering compile cleanly. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile debug indicator work. |
| 2026-03-03 | `pnpm --store-dir /Users/contre/Library/pnpm/store/v10 --filter @fulbito/mobile add expo-file-system@~18.0.12` | Fail | Dependency install blocked by offline DNS (`ENOTFOUND registry.npmjs.org`), so device persistence work remains pending until package install is possible. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After endpoint-level fallback diagnostics wiring in repositories/auth UI state. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `fallbackDiagnostics` integration and dev fallback reason badge compile cleanly. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by fallback diagnostics slice. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After adding one-tap HTTP retry action in mock mode badge. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `retryHttpMode` wiring compiles cleanly in `AuthContext` and `DataModeBadge`. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by retry action slice. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After mobile test-harness scaffold file additions and script update. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile test-harness scaffold adds no runtime/test dependency requirements to current typecheck flow. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile test scaffold. |
| 2026-03-03 | iOS smoke (`pnpm --filter @fulbito/mobile ios`) | Fail | `expo run:ios` failed creating native directory in this environment (`npm view expo-template-bare-minimum@sdk-52` non-zero), so simulator smoke remains pending. |
| 2026-03-03 | iOS smoke (`pnpm --filter @fulbito/mobile dev -- --ios` and `expo start --ios --port 8081`) | Fail | Expo CLI crashes before startup on this machine with `ERR_SOCKET_BAD_PORT` under Node `v24.9.0`; manual iOS smoke remains blocked by tooling/runtime issue. |
| 2026-03-03 | Android smoke | Pass (manual) | User confirmed Android app launched and worked after entrypoint fix (`index.js` replacing `expo/AppEntry`). |
| 2026-03-03 | iOS smoke retry (`pnpm --filter @fulbito/mobile dev -- --ios`, `pnpm --filter @fulbito/mobile exec expo start --ios --port 8081`) | Fail | Reproduced same `ERR_SOCKET_BAD_PORT` crash under Node `v24.9.0`; no alternate local Node 20/22 runtime installed on this machine. |
| 2026-03-03 | `pnpm --store-dir /Users/contre/Library/pnpm/store/v10 --filter @fulbito/mobile add @react-native-async-storage/async-storage@^2.2.0` | Fail | Install still blocked by offline DNS (`ENOTFOUND registry.npmjs.org`), so persistent mobile storage remains pending. |
| 2026-03-03 | `pnpm run typecheck:web` | Pass | After adding mobile Node runtime guard script and wiring it into mobile Expo scripts. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile typecheck remains clean after adding Node guard script. |
| 2026-03-03 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile Node guard tooling changes. |
| 2026-03-03 | `pnpm --filter @fulbito/mobile dev -- --ios` | Fail (expected) | New guard stops early with explicit guidance: Node `24.9.0` unsupported for current Expo SDK in this workspace; use Node `20/22` before iOS smoke. |
| 2026-03-04 | iOS smoke (`pnpm --filter @fulbito/mobile exec expo start --ios --port 8081`) | Fail | Metro now starts on Node `22.22.0`; current blocker is local Simulator state (`No iOS devices available in Simulator.app`). |
| 2026-03-04 | `pnpm --store-dir /Users/contre/Library/pnpm/store/v10 --filter @fulbito/mobile add @react-native-async-storage/async-storage@^2.2.0` | Pass | AsyncStorage installed successfully after registry/DNS recovery. |
| 2026-03-04 | `pnpm --store-dir /Users/contre/Library/pnpm/store/v10 --filter @fulbito/mobile add -D jest jest-expo @testing-library/react-native @testing-library/jest-native react-test-renderer` | Pass with peer warnings | Test stack installed; then aligned to Expo 52-compatible `jest@29.7`, `jest-expo@52.0.6`, `react-test-renderer@18.3.1`, and `@types/react@^19.0.2`. |
| 2026-03-04 | `pnpm --store-dir /Users/contre/Library/pnpm/store/v10 --filter @fulbito/mobile add -D @types/jest@^29.5.14` | Pass | Added TypeScript typings for Jest globals used by new mobile smoke tests. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test` | Pass | Mobile smoke tests for `GroupSelector`, `FechaSelector`, and `DataModeBadge` are active and passing (`3 suites, 4 tests`). |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | Verified after mobile persistence + test harness activation changes. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Context persistence and new tests compile with strict TypeScript settings. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by mobile updates. |
| 2026-03-04 | iOS smoke (`pnpm --filter @fulbito/mobile exec expo start --ios --port 8082`) | Pass | Metro started, Expo opened `exp://...:8082` on `iPhone 17 Pro Max`, and iOS bundle completed successfully. |
| 2026-03-04 | Android persistence smoke (manual) | Pass | User confirmed non-default `Fecha` selection remains persistent after full Android app restart (`Pronósticos` screen). |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test` | Pass | After diagnostics history persistence wiring, mobile smoke suites still pass (`3 suites, 4 tests`). |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | Verified no web regression after diagnostics history slice. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `fallbackHistory` auth-context contract and badge rendering compile cleanly. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by diagnostics history updates. |
| 2026-03-04 | `pnpm --store-dir /Users/contre/Library/pnpm/store/v10 --filter @fulbito/mobile add react-native@0.76.9 react-native-screens@~4.4.0 @react-native-async-storage/async-storage@1.23.1` | Pass | Mobile runtime dependencies aligned to Expo SDK 52 advisory targets. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile exec expo install --check` | Pass | Local Expo compatibility check reports dependencies up to date (offline validation mode). |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test` | Pass | Mobile smoke tests remain green after runtime dependency alignment. |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | Verified no web regression after mobile dependency alignment. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile TypeScript checks pass with updated runtime packages. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by dependency alignment. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test` | Pass | Extended mobile test suite passed with new context persistence tests (`5 suites, 7 tests`). |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | No web regressions after adding mobile context persistence tests. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile test files and provider contracts compile cleanly. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile test additions. |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | Verified after adding `ios:smoke` mobile script. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile script additions did not affect TS checks. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by script updates. |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | Verified after adding manual mobile QA checklist documentation. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | No mobile type regressions from checklist/documentation slice. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by docs updates. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test` | Pass | Mobile suite remains green after Pronósticos UI parity changes (`5 suites, 7 tests`). |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | No web regression after mobile Pronósticos presentation updates. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | Pronósticos tab/card parity styling and mode handling compile cleanly. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile UI parity slice. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test` | Pass | Tests remain green after fecha cycler + custom header refinements (`5 suites, 7 tests`). |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | No web regressions after mobile parity refinement slice. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `ScreenFrame` custom header slot and `FechaSelector` cycler compile cleanly across mobile screens. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile parity refinements. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test` | Pass | Mobile suites remain green after `Posiciones` parity styling updates (`5 suites, 7 tests`). |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | No web regressions after `Posiciones` mobile presentation updates. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `PosicionesScreen` parity UI additions compile cleanly. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by `Posiciones` parity slice. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test` | Pass | Mobile suites remain green after `Fixture` parity updates (`5 suites, 7 tests`). |
| 2026-03-04 | `pnpm run typecheck:web` | Pass | No web regressions after `Fixture` mobile presentation updates. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile typecheck` | Pass | `FixtureScreen` parity UI additions compile cleanly. |
| 2026-03-04 | `pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by `Fixture` parity slice. |
| 2026-03-04 | `pnpm --filter @fulbito/mobile test`, `pnpm run typecheck:web`, `pnpm --filter @fulbito/mobile typecheck` | Fail (env) | Shell invoked Homebrew `node@24.9.0` with missing dynamic library (`libsimdjson.27.dylib`), causing `SIGABRT` before command execution. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after forcing Node `v22.22.0` in shell PATH (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | Web typecheck clean after fallback-history clear action slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile typecheck clean after new badge action/context contract update. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by diagnostics clear action slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after Pronósticos visual parity refinements (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regressions after Pronósticos parity refinement slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `PronosticosScreen` parity layout/style updates compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by Pronósticos parity refinement slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites remain green after Pronósticos chip/action parity slice (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after Pronósticos per-card status feedback updates. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `PronosticosScreen` state additions (`pendingFixtureId`, `saveErrorByFixture`) compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by Pronósticos chip/action parity slice. |
| 2026-03-04 | `pnpm --store-dir /Users/contre/Library/pnpm/store/v10 --filter @fulbito/mobile add @expo/vector-icons@^14.0.4` | Fail (env) | Registry DNS outage (`ENOTFOUND registry.npmjs.org`) prevented package installation. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after replacing header text pills with dependency-free icon-style controls (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regressions after Pronósticos icon-control slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `PronosticosScreen` icon-style header controls compile cleanly without new dependencies. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by Pronósticos icon-control slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after screenshot-driven Pronósticos layout rewrite (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `ScreenFrame` optional props (`hideDataModeBadge`, `contentStyle`) and new Pronósticos layout compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after screenshot-driven Pronósticos parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by Pronósticos screenshot parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after Pronósticos pixel-pass and tab order alignment (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `ScreenFrame` `containerStyle` and Pronósticos scaling/layout refinements compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after mobile pixel-pass changes. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by Pronósticos pixel-pass slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites remain green after safe-area/background correction (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `useSafeAreaInsets` integration and dynamic header inset style compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after mobile safe-area/background fix. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by safe-area/background fix. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after Posiciones screenshot-driven rewrite (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | New Posiciones mode/layout composition compiles cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after Posiciones parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by Posiciones parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after Fixture screenshot-driven rewrite (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | Fixture custom layout and filter/group rendering compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after Fixture parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by Fixture parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after bottom-tab icon/style parity slice (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | Updated custom tab icon renderer and tab style config compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after mobile tab-bar parity changes. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by tab-bar parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Mobile suites green after mock fixture dataset + score parsing parity adjustments (`5 suites, 7 tests`). |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | Pronósticos/Fixture score derivation and mock data updates compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after mobile mock data parity alignment changes. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mock data parity alignment slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after per-screen competition label parity adjustments. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `Pronosticos/Posiciones/Fixture` label helpers compile cleanly under strict TypeScript. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` (parallel run) | Fail (transient) | First parallel execution failed during Next page-data collection for `/api/fixture`; reran in isolation successfully with no code changes. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` (isolation retry) | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), confirming no web regression from this mobile slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after shared mobile brand-badge icon extraction. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `BrandBadgeIcon` integration compiles cleanly across `Pronósticos`, `Posiciones`, and `Fixture` screens. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile brand-badge icon slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after `TeamCrest` extraction and mobile row icon updates. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `TeamCrest` integration compiles cleanly in both Pronósticos and Fixture screens. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile crest parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after final Posiciones/Fixture typography-spacing polish. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | Posiciones/Fixture density and typography tweaks compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile visual polish slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after adding `android:smoke` script and QA checklist command update. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile script map with new `android:smoke` command compiles cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by smoke-command tooling slice. |

## Risks & Mitigations

| Risk | Severity | Mitigation | Owner |
|---|---|---|---|
| Plan file not updated in future mobile commits. | High | Add mandatory PR checklist item + commit-time review rule. | `@contre` |
| Contract drift between mock and future HTTP adapters. | High | Keep adapters behind shared interfaces + add parity checks per feature. | `@contre` |
| Metro resolution regressions in monorepo after dependency changes. | Medium | Keep `metro.config.js` workspace watch/resolver config version-controlled and revalidate on dependency updates. | `@contre` |
| Web regressions from future shared extraction refactors. | Medium | Require `typecheck:web` + `build:web` log entry for each extraction commit. | `@contre` |

## Next Actions (Top 5)
1. Run final full-manual parity QA across `Pronósticos`/`Posiciones`/`Fixture` and record sign-off notes in `docs/mobile-qa-checklist.md`.
2. Apply the same non-emoji brand-badge treatment to remaining tabs (`Inicio`, `Grupos`) once those parity passes are active.
3. Evaluate replacing local deterministic crests with bundled asset crests for top-flight teams if final visual QA still requires closer logo fidelity.
4. Start parity pass for `Grupos` screen using `ui reference/Grupos.png` as baseline.
5. Start parity pass for `Inicio` screen using `ui reference/Inicio.png` as baseline.
