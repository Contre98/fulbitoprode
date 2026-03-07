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

## Phase 4 Kickoff (Draft)

### Scope
- Harden mobile behavior after parity milestone: reliability, test depth, and adapter resilience.
- Keep contracts-first boundaries intact (`packages/domain`, `packages/api-contracts`, `apps/mobile/src/repositories`).

### Key Risks
- HTTP/mock divergence as backend endpoints evolve.
- Regressions in parity screens due to refactors without snapshot/smoke coverage.
- Environment drift (Node/runtime/test command mismatch) between local and CI.

### First 3 Implementation Slices
1. Add targeted mobile e2e smoke path for login -> `Inicio` -> `Pronósticos` save -> `Grupos` join/create. ✅
2. Expand repository-level contract tests for HTTP + mock adapters on groups/fixture/predictions.
3. Add failure-injection coverage for fallback diagnostics + retry behavior (`HTTP Session` <-> `Mock Fallback` transitions).

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
- [x] Start parity pass for `Grupos` screen using `ui reference/Grupos.png` as baseline.
- [x] Start parity pass for `Inicio` screen using `ui reference/Inicio.png` as baseline.
- [x] Make `Grupos` primary actions functional on mobile (`Crear Grupo` / `Unirse`) through contracts-first repositories (HTTP + mock fallback).
- [x] Make `Inicio` match filter tabs functional (`Todos` / `En vivo` / `Próximos`) with state-driven filtering.
- [x] Add focused screen-level smoke tests for `Grupos` create/join action flows.
- [x] Add focused screen-level smoke tests for `Inicio` render/filter interactions.
- [x] Cover `Grupos` create/join error paths in screen-level tests and handle mutation rejection safely.
- [x] Add CI guard steps for mobile Node-version compatibility and targeted mobile test command parity.
- [x] Prepare Phase 3 closure summary draft grouped by tab with validation-log linkage.
- [x] Add contributor runtime notes for Node 20-22 and targeted mobile test command usage.
- [x] Capture Android medium-device parity screenshots for all tabs after cache reset and verify updated bundle load.

### Phase 4
- [x] Add first app-level mobile smoke flow test covering `Inicio` -> `Pronósticos` save -> `Grupos` create/join through tab navigation.
- [x] Extend smoke-flow coverage with explicit `AuthScreen` login gate transition into `Inicio`.
- [x] Expand repository-level contract tests for HTTP + mock adapters on groups/predictions.
- [x] Expand adapter contract parity coverage to fixture/leaderboard normalization edge cases.
- [x] Add failure-injection coverage for fallback diagnostics and retry mode transitions.
- [x] Add CI guard invocations for `MobileE2ESmoke.flow.test.tsx`, `RepositoryAdapters.contract.test.ts`, and `RepositoryFallbackTransitions.test.ts`.
- [x] Add focused tests for fallback diagnostics history persistence/clear semantics under repeated failures.
- [x] Add targeted CI guard invocation for `FallbackDiagnostics.history.test.ts`.
- [x] Add dedicated Phase 4 tracking checklist section to PR template for mobile-scope changes.
- [x] Evaluate RN navigation `act(...)` warning suppression options and document as known non-blocking noise when deterministic mitigation is unavailable.
- [x] Split adapter contract parity tests into focused suites (`groups/predictions` and `fixture/leaderboard`) and align CI guards.
- [x] Add focused fallback-history integration test through `AuthContext` to confirm badge-facing state wiring under persisted diagnostics.
- [x] Expand smoke-flow assertions to include `Posiciones` mode toggle behavior (`POSICIONES` <-> `STATS`) after auth-gated entry.
- [x] Add negative-path app-flow assertion for `Grupos` join validation message before successful join submission.
- [x] Add malformed-payload rejection assertions for fixture/leaderboard HTTP adapter contract tests.
- [x] Add focused fallback-history clear assertion across subscribe/unsubscribe cycles in diagnostics utility tests.
- [x] Add CI guard invocation for `AuthContext.fallbackHistory.integration.test.tsx`.
- [x] Expand app-flow smoke coverage to include `Grupos` join mutation rejection message and retry-success sequence.
- [x] Split app-level smoke coverage into focused `auth-entry` and `tab-flow` files with shared test harness.
- [x] Add repository-composition fallback tests for fixture/leaderboard malformed-payload failures to confirm mock continuity.
- [x] Capture refreshed iOS + Android all-tab screenshots under `ui reference/current iOS` and `ui reference/current Android`.
- [x] Add Phase 4 mid-point guard-coverage summary to closure draft document.
- [x] Decide smoke-suite granularity: keep `auth-entry` + `tab-flow` for now, defer separate `group-actions` file unless runtime/mutation assertions grow materially.
- [x] Split CI smoke guard into dedicated `auth-entry` and `tab-flow` steps for clearer failure isolation.

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
| 2026-03-04 | Start screenshot-driven parity layouts for `Inicio` and `Grupos` with contract-backed data sections and shared mobile header chrome. | Continue migration scope to remaining tabs while preserving contracts-first architecture and avoiding hardcoded screen-only datasets. | `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/screens/ConfiguracionScreen.tsx` |
| 2026-03-04 | Downscale typography and card density on `Inicio`/`Grupos` after first emulator review. | First parity draft overshot text scale in key blocks; this adjustment improves proportional match with references while preserving current data wiring. | `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/screens/ConfiguracionScreen.tsx` |
| 2026-03-04 | Refine `Inicio` and `Grupos` micro-layout from second emulator screenshots (heading scale, group action alignment, card rhythm). | Close remaining polish deltas with small, low-risk visual adjustments while keeping contracts/state logic unchanged. | `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/screens/ConfiguracionScreen.tsx` |
| 2026-03-04 | Normalize remaining `Inicio`/`Grupos` action icon glyphs to non-emoji symbol set (`⌘`, `≣`). | Keep iconography consistent with the dependency-free glyph approach already used in other parity screens and avoid mixed emoji-style marks. | `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/screens/ConfiguracionScreen.tsx` |
| 2026-03-04 | Extend `GroupsRepository` contract with `createGroup` / `joinGroup` and wire `Grupos` UI actions to repository mutations with session refresh. | Transition key copied parity controls from visual-only to functional behavior using existing backend endpoints and mock fallback without bypassing architecture layers. | `packages/api-contracts/src/index.ts`, `apps/mobile/src/repositories/*`, `apps/mobile/src/screens/ConfiguracionScreen.tsx` |
| 2026-03-04 | Add `mockGroupStore` and tests to support mutable group actions in mock mode. | Keep local/dev behavior realistic and testable when HTTP session is unavailable. | `apps/mobile/src/repositories/mockGroupStore.ts`, `apps/mobile/src/test/mockGroupStore.test.ts`, `apps/mobile/src/repositories/mockDataRepositories.ts`, `apps/mobile/src/repositories/mockAuthRepository.ts` |
| 2026-03-04 | Extract `Inicio` fixture filtering helper and wire tabs to state-driven filter behavior. | Make copied parity controls functional while keeping filtering logic isolated and testable via focused unit tests. | `apps/mobile/src/screens/HomeScreen.tsx`, `apps/mobile/src/screens/homeFilters.ts`, `apps/mobile/src/test/homeFilters.test.ts` |
| 2026-03-04 | Update mobile Jest runner to pass CLI test patterns and run with deterministic handle diagnostics (`--runInBand --detectOpenHandles`). | Keep smoke runs predictable, avoid false-positive worker shutdown warnings, and ensure focused test commands actually target requested files. | `apps/mobile/scripts/run-mobile-tests.mjs` |
| 2026-03-04 | Add CI workflow guard steps for mobile Node range validation and targeted mobile test command execution. | Keep CI aligned with local mobile prerequisites/commands so regressions in mobile runner behavior are detected before merge. | `.github/workflows/ci.yml` |
| 2026-03-04 | Create a dedicated Phase 3 closure summary draft document grouped by tab (`Inicio`, `Posiciones`, `Pronósticos`, `Fixture`, `Grupos`). | Keep final parity sign-off auditable with one place to attach screenshots, feature evidence, and validation references before merge. | `docs/mobile-phase3-closure-summary.md` |
| 2026-03-04 | Add app-level mobile smoke-flow test that traverses tab navigation and asserts core user actions (`Inicio` -> `Pronósticos` save -> `Grupos` create/join). | Kick off Phase 4 with a pragmatic e2e-style regression guard using existing Jest/RTL harness before introducing heavier device-e2e tooling. | `apps/mobile/src/test/MobileE2ESmoke.flow.test.tsx` |
| 2026-03-04 | Add test-only HTTP base URL fallback hook in mobile HTTP adapters via `globalThis.__FULBITO_TEST_API_BASE_URL__`. | Expo env inlining makes `EXPO_PUBLIC_API_BASE_URL` brittle in Jest adapter tests; this preserves runtime behavior while enabling deterministic HTTP adapter contract coverage. | `apps/mobile/src/repositories/httpDataRepositories.ts`, `apps/mobile/src/test/RepositoryAdapters.contract.test.ts` |
| 2026-03-04 | Default mobile test runner env to a local API base URL when missing. | Keep HTTP adapter contract tests runnable under local/CI harness without requiring external env wiring for each invocation. | `apps/mobile/scripts/run-mobile-tests.mjs` |
| 2026-03-04 | Add repository-level failure-injection tests for fallback diagnostics and session-mode transitions. | Verify high-risk fallback behavior (`HTTP Session` to `Mock Fallback` and recovery) with deterministic unit coverage before deeper e2e rollout. | `apps/mobile/src/test/RepositoryFallbackTransitions.test.ts` |
| 2026-03-04 | Add dedicated CI guard steps for new Phase 4 mobile regression suites. | Ensure smoke/contract/fallback transition tests execute in CI on every change and prevent silent drift from local-only test coverage. | `.github/workflows/ci.yml` |
| 2026-03-04 | Expand adapter contract parity coverage for fixture/leaderboard normalization edge cases. | Lock down high-risk HTTP normalization paths (`kickoffAt` fallback, `userId` synthesis) against mock contract shape to reduce adapter drift risk. | `apps/mobile/src/test/RepositoryAdapters.contract.test.ts` |
| 2026-03-04 | Add dedicated fallback diagnostics history tests at repository utility level. | Validate persisted history hydration, repeated-failure cap, subscriber notification, and clear semantics without coupling tests to screen rendering. | `apps/mobile/src/test/FallbackDiagnostics.history.test.ts` |
| 2026-03-04 | Add CI guard execution for fallback diagnostics history test suite. | Keep newly added diagnostics-history coverage enforced in CI instead of relying on manual/targeted local test runs. | `.github/workflows/ci.yml` |
| 2026-03-04 | Add explicit Phase 4 tracking checklist block to PR template. | Keep Phase 4 validation discipline visible in PR review flow and reduce missed log/test guard updates on mobile-scope commits. | `.github/pull_request_template.md` |
| 2026-03-04 | Treat current RN/React Navigation `act(...)` warnings in smoke tests as known non-blocking noise for now. | Attempted deterministic mitigation paths did not fully suppress warnings without broader test-runtime tradeoffs; preserve signal in logs and continue with functional pass criteria. | `apps/mobile/src/test/MobileE2ESmoke.flow.test.tsx`, `docs/mobile-migration-plan.md` |
| 2026-03-04 | Split adapter parity tests by domain (`groups/predictions` vs `fixture/leaderboard`) and guard both in CI. | Keep suite growth maintainable and isolate failures to narrower adapter scopes while preserving existing parity coverage depth. | `apps/mobile/src/test/RepositoryAdapters.contract.test.ts`, `apps/mobile/src/test/RepositoryAdapters.groupsPredictions.contract.test.ts`, `.github/workflows/ci.yml` |
| 2026-03-04 | Add AuthContext-level fallback-history integration coverage using `DataModeBadge` probe rendering. | Validate persisted diagnostics hydration and clear-action wiring at context-to-UI boundary without relying solely on isolated utility/component tests. | `apps/mobile/src/test/AuthContext.fallbackHistory.integration.test.tsx` |
| 2026-03-04 | Extend mobile smoke flow to assert `Posiciones` mode toggle behavior (`STATS` and back to `POSICIONES`). | Increase tab-level regression coverage depth in the app-level flow without introducing additional e2e tooling complexity. | `apps/mobile/src/test/MobileE2ESmoke.flow.test.tsx` |
| 2026-03-07 | Split monolithic `MobileE2ESmoke` suite into focused `auth-entry` and `tab-flow` files backed by a shared harness, and update CI smoke guard command to pattern match both suites. | Keep app-level smoke coverage maintainable as assertions grow while preserving the same guard scope in CI with less test-file churn risk. | `apps/mobile/src/test/mobileSmokeTestHarness.tsx`, `apps/mobile/src/test/MobileE2ESmoke.auth-entry.test.tsx`, `apps/mobile/src/test/MobileE2ESmoke.tab-flow.test.tsx`, `.github/workflows/ci.yml` |
| 2026-03-07 | Keep malformed fixture/leaderboard HTTP payload handling routed through repository-level fallback to mock adapters (validated in composition tests). | Preserve contracts-first resilience in app runtime when HTTP normalization throws, instead of letting malformed backend payloads break core mobile tabs. | `apps/mobile/src/test/RepositoryFallbackTransitions.test.ts`, `apps/mobile/src/repositories/index.ts` |
| 2026-03-07 | Keep two-file smoke structure (`auth-entry`, `tab-flow`) and defer a third `group-actions` file. | Current `tab-flow` suite already exercises group creation/join validation/rejection/retry in app context; additional split now would add maintenance overhead without materially improving failure isolation. | `apps/mobile/src/test/MobileE2ESmoke.auth-entry.test.tsx`, `apps/mobile/src/test/MobileE2ESmoke.tab-flow.test.tsx` |
| 2026-03-07 | Split CI smoke guard into separate `auth-entry` and `tab-flow` commands. | Keep mobile smoke failures more actionable in PRs by identifying whether auth-gate path or tab-flow path regressed without re-running the full suite. | `.github/workflows/ci.yml` |
| 2026-03-04 | Add CI guard step for `AuthContext.fallbackHistory.integration.test.tsx` in the main workflow. | Keep AuthContext fallback-history integration coverage enforced on every PR/push instead of relying on local targeted runs only. | `.github/workflows/ci.yml` |

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
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after starting `Inicio`/`Grupos` parity layouts. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `HomeScreen` and `ConfiguracionScreen` parity rewrites compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by `Inicio`/`Grupos` mobile parity slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after `Inicio`/`Grupos` typography downscale adjustments. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | Refined `HomeScreen`/`ConfiguracionScreen` sizing styles compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by `Inicio`/`Grupos` refinement slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after second `Inicio`/`Grupos` emulator-driven polish pass. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `Inicio` heading/card rhythm tweaks and `Grupos` action-row alignment compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by second `Inicio`/`Grupos` polish slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after icon-glyph normalization on `Inicio`/`Grupos`. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | Updated `⌘/≣` icon glyph replacements compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by icon normalization slice. |
| 2026-03-04 | Final manual parity QA (all 5 tabs) + persistence/diagnostics checklist | Pass | Sign-off recorded in `docs/mobile-qa-checklist.md` using emulator run evidence and screenshot comparisons. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | New `mockGroupStore` tests passed; total mobile suites `6`, tests `9`. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after groups contract/repository action extension. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `createGroup`/`joinGroup` repository wiring and `ConfiguracionScreen` mutations compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile functional groups slice. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile test` | Pass | Added `homeFilters` tests; total mobile suites `7`, tests `12`. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run typecheck:web` | Pass | No web regression after making `Inicio` filter tabs functional. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm --filter @fulbito/mobile typecheck` | Pass | `HomeScreen` filter state wiring and helper extraction compile cleanly. |
| 2026-03-04 | `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by `Inicio` filter functionality slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- ConfiguracionScreen.actions.test.tsx` | Pass | New `ConfiguracionScreen` action smoke tests pass (`create`/`join` validation + success flow assertions); suite run reports existing open-handle warning after completion. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding `ConfiguracionScreen` action tests. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | New `ConfiguracionScreen.actions.test.tsx` compiles cleanly under strict TypeScript. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mobile action test slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- HomeScreen.filters.test.tsx` | Pass | New `HomeScreen` filter interaction smoke tests pass (`Todos`/`En vivo`/`Próximos` + empty-state assertion); suite run reports existing open-handle warning after completion. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding `HomeScreen` screen-level tests. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Fail | Test initially imported non-exported `FixtureStatus` type from `@fulbito/domain`; replaced with local status union and reran successfully. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by `Inicio` test slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` (post-fix rerun) | Pass | Verified after test type import correction. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` (post-fix rerun) | Pass | `HomeScreen.filters.test.tsx` compiles cleanly after replacing unsupported domain type import. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` (post-fix rerun) | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), confirming no web regression from final test slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- ConfiguracionScreen.actions.test.tsx` | Fail | New error-path tests surfaced unhandled mutation rejection in `ConfiguracionScreen` (`mutateAsync` reject without catch). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- ConfiguracionScreen.actions.test.tsx` (post-fix rerun) | Pass | Added safe rejection handling (`.catch(() => undefined)`) after `mutateAsync`; extended screen tests now pass for create/join success + error paths. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after `ConfiguracionScreen` mutation rejection-safety patch. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | `ConfiguracionScreen` + extended error-path tests compile cleanly. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by mutation rejection-safety and test extension slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile exec jest --runInBand --detectOpenHandles` | Pass | Full mobile suite reported no open handles under direct Jest diagnostics. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- ConfiguracionScreen.actions.test.tsx` | Pass | After runner update, focused pattern execution works (single suite) without worker-force-exit warning. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after mobile test-runner script update. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Runner-script changes do not affect mobile TS compile output. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by test-runner tooling slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile exec node ./scripts/check-node-version.mjs` | Pass | Mobile Node guard command succeeds under local Node `v22.22.0` (same check now executed in CI). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- ConfiguracionScreen.actions.test.tsx` | Pass | Targeted mobile command parity guard validated locally before CI workflow update. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after CI guard-step addition. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile TypeScript checks remain green after CI workflow changes. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unaffected by CI guard-step slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding Phase 3 closure summary draft documentation. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile TS checks unaffected by closure summary documentation slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by closure-summary docs slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding root contributor runtime notes for mobile command prerequisites. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile TypeScript checks unaffected by root README runtime-note updates. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by README runtime-note slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding `Phase 4 Kickoff (Draft)` section to migration plan. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile TS checks unaffected by planning-only Phase 4 kickoff documentation. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by Phase 4 kickoff planning slice. |
| 2026-03-04 | Android emulator manual QA (Medium device) after Expo cache reset (`android:smoke -- --clear`) | Pass | User confirmed updated parity UI now loads on Android and shared fresh screenshots for `Inicio`, `Posiciones`, `Pronósticos`, `Fixture`, `Grupos`. |
| 2026-03-04 | iOS simulator manual QA (notched devices) | Pass | User confirmed final status as "all good" after iOS and Android verification. |
| 2026-03-04 | Manual sanity pass (`Inicio` filters + `Grupos` create/join`) across smoke sessions | Pass | User confirmed end-to-end behavior acceptable for current Phase 3 closure gate. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after final manual QA closure status updates. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile TS checks unaffected by final Phase 3 QA sign-off documentation updates. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by final QA sign-off doc slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after recording Android screenshot evidence and QA status updates in closure docs. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile TS checks unaffected by QA evidence documentation updates. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by QA evidence docs slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` | Fail then pass | Initial failures due provider/render-path constraints (`safe-area` over-mock, `GestureHandlerRootView` init). Resolved by rendering `AppNavigation` in a local `QueryClientProvider` and refining selectors. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding Phase 4 slice #1 smoke-flow test file. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | New `MobileE2ESmoke.flow.test.tsx` compiles cleanly under strict TypeScript. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by Phase 4 slice #1 test addition. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` (final rerun) | Pass | Confirmed stable pass after plan/log updates (`1 suite, 1 test`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryAdapters.contract.test.ts` | Fail then pass | Initially blocked by HTTP base URL resolution under Expo/Jest env inlining; fixed with test-only adapter fallback hook and reran green (`2 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after Phase 4 slice #2 adapter contract tests and test-harness env fallback updates. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Fail then pass | Initial fail in new adapter test from `fecha` type mismatch (`number` vs `string`); fixed to contract-aligned string and reran successfully. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by Phase 4 slice #2 tests/tooling adjustments. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryFallbackTransitions.test.ts` | Pass | New failure-injection suite validates diagnostics reporting and session-mode transitions (`auth.getSession`, `predictions.listPredictions`, `auth.logout`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding fallback-transition coverage tests. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | New `RepositoryFallbackTransitions.test.ts` compiles cleanly under strict TypeScript. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by Phase 4 slice #3 test addition. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` | Pass | CI guard target for app-level smoke flow verified (`1 suite, 1 test`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryAdapters.contract.test.ts` | Pass | CI guard target for HTTP/mock adapter parity verified (`1 suite, 2 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryFallbackTransitions.test.ts` | Pass | CI guard target for fallback transition behavior verified (`1 suite, 4 tests`); expected `console.warn` fallback logs observed during injected failures. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after CI Phase 4 guard-step additions. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile TypeScript checks remain green after CI workflow + plan updates. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by CI Phase 4 guard-step slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` | Pass | Auth-gate extended smoke flow now covers unauthenticated `AuthScreen` login transition plus tabbed flow (`2 tests`); non-blocking RN Animated `act(...)` warning remains from navigation internals. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after auth-step smoke coverage extension. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Updated `MobileE2ESmoke.flow.test.tsx` compiles cleanly under strict TypeScript. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by auth-step smoke extension. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryAdapters.contract.test.ts` | Pass | Expanded suite now includes fixture and leaderboard normalization parity cases (`4 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adapter parity edge-case test expansion. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Fail then pass | Initial failure due test input including unsupported `mode` field in leaderboard contract input; removed field and reran green. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by adapter parity edge-case slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- FallbackDiagnostics.history.test.ts` | Fail then pass | Initial failures due dynamic `import()` not supported in current Jest runtime and TS module-mode errors; switched tests to `require()` + `jest.resetModules()` and reran green (`3 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after fallback diagnostics history test addition. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Fail then pass | Initial fail from dynamic import/module typing in new fallback-history test; resolved via `require()`-based module loading and mock reset typing. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by fallback diagnostics test slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` | Pass with warning noise | Evaluated warning suppression; React Navigation/RN emits varying non-blocking `act(...)` warnings (`Animated(View)` and `HomeScreen`) so deterministic suppression remains pending. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding fallback-history CI guard step. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile typecheck remains green after fallback-history CI guard update. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by fallback-history CI guard slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after PR template Phase 4 tracking section addition. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile typecheck unaffected by PR template checklist updates. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by PR-template tracking slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` | Pass with warning noise | Re-evaluated suppression approach; warning source remains in RN/Navigation async internals (`Animated(View)`), functional assertions stay stable. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after final warning-noise evaluation pass. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile typecheck unchanged by warning-noise evaluation outcome (docs/status only). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by warning-noise evaluation slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryAdapters.contract.test.ts` | Pass | Focused fixture/leaderboard adapter parity suite passes after split (`2 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryAdapters.groupsPredictions.contract.test.ts` | Pass | New groups/predictions adapter parity suite passes (`2 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adapter parity suite split and CI guard expansion. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile typecheck clean after introducing second adapter contract test file. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by adapter suite split slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- AuthContext.fallbackHistory.integration.test.tsx` | Fail then pass | Initial failure due Jest mock-factory scope restriction and repository export mock shape; fixed with `mock*` state names and inline `authRepository` module factory, reran green (`1 test`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding AuthContext fallback-history integration test. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | New `AuthContext.fallbackHistory.integration.test.tsx` compiles cleanly under strict TypeScript. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by AuthContext integration-test slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` | Fail then pass | Initial fail from duplicate `PREMIOS Y CASTIGOS` text query in new Posiciones assertion; changed to `getAllByText(...).length > 0` and reran green (`2 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after smoke-flow Posiciones toggle assertion extension. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Updated `MobileE2ESmoke.flow.test.tsx` compiles cleanly after Posiciones assertion addition. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by smoke-flow Posiciones toggle slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` | Pass | Added negative-path assertion for `Grupos` join validation (`Ingresá un código de invitación.`) before successful join call in tab-flow smoke test (`2 tests`); non-blocking RN `act(...)` warnings remain. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after smoke-flow join-validation assertion expansion. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Updated `MobileE2ESmoke.flow.test.tsx` compiles cleanly after join-validation negative-path assertion addition. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by smoke-flow join-validation assertion slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryAdapters.contract.test.ts` | Pass | Added malformed fixture/leaderboard payload rejection assertions in HTTP adapter parity suite (`4 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after malformed payload rejection coverage expansion in adapter contract tests. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Updated `RepositoryAdapters.contract.test.ts` compiles cleanly under strict mobile TypeScript checks. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by adapter rejection-coverage test slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- FallbackDiagnostics.history.test.ts` | Pass | Added focused assertion that verifies clear-history notifications only hit active subscribers across subscribe/unsubscribe cycles (`4 tests`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after fallback-history subscribe/unsubscribe coverage expansion. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Updated `FallbackDiagnostics.history.test.ts` compiles cleanly under strict mobile TypeScript checks. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by fallback-history subscribe-cycle test slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- AuthContext.fallbackHistory.integration.test.tsx` | Pass | Confirms CI-targeted AuthContext fallback-history integration suite remains stable (`1 test`). |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after adding AuthContext fallback-history CI guard step. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile typecheck clean with workflow guard-step update in place. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by CI-guard tooling slice. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.flow.test.tsx` | Pass with warning noise | Added `Grupos` join mutation rejection assertion (`No se pudo unir al grupo...`) followed by retry-success in app-flow smoke test (`2 tests`); non-blocking RN `act(...)` warnings remain. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after smoke-flow join mutation rejection/retry coverage expansion. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Updated `MobileE2ESmoke.flow.test.tsx` compiles cleanly after join mutation rejection/retry assertion addition. |
| 2026-03-04 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by smoke-flow join mutation rejection/retry slice. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke` | Fail then pass with warning noise | Initial split run failed from `AuthContext` mock ordering (`AsyncStorage is null`) due direct `AppNavigation` import in auth-entry test; fixed by moving rerender tree into shared harness and reran green (`2 suites, 2 tests`). |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after splitting smoke suites and updating CI smoke command pattern. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | New smoke harness plus split test files compile cleanly under strict TypeScript checks. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by smoke-suite split slice. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- RepositoryFallbackTransitions.test.ts` | Pass | Added fixture/leaderboard composition-level fallback assertions for malformed HTTP payload handling (`6 tests`); expected fallback `console.warn` logs observed. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after fallback-transition coverage expansion. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Updated `RepositoryFallbackTransitions.test.ts` compiles cleanly under strict mobile TypeScript checks. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by fallback-transition coverage slice. |
| 2026-03-07 | Manual QA evidence refresh (`ui reference/current iOS/*`, `ui reference/current Android/*`) | Pass | User provided updated iOS + Android screenshots covering all 5 tabs; paths linked into `docs/mobile-phase3-closure-summary.md`. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.auth-entry.test.tsx` | Pass with warning noise | Dedicated auth-entry smoke suite passes (`1 test`); existing non-blocking RN `act(...)` warning noise persists. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile test -- MobileE2ESmoke.tab-flow.test.tsx` | Pass | Dedicated tab-flow smoke suite passes (`1 test`) with full cross-tab + group action assertions. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run typecheck:web` | Pass | No web regression after CI smoke guard split and docs updates. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm --filter @fulbito/mobile typecheck` | Pass | Mobile typecheck remains green after CI smoke guard split. |
| 2026-03-07 | `PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm run build:web` | Pass with warnings | Same pre-existing Next warnings (`<img>` usage, one hook dependency warning), unchanged by CI smoke-guard split slice. |

## Risks & Mitigations

| Risk | Severity | Mitigation | Owner |
|---|---|---|---|
| Plan file not updated in future mobile commits. | High | Add mandatory PR checklist item + commit-time review rule. | `@contre` |
| Contract drift between mock and future HTTP adapters. | High | Keep adapters behind shared interfaces + add parity checks per feature. | `@contre` |
| Metro resolution regressions in monorepo after dependency changes. | Medium | Keep `metro.config.js` workspace watch/resolver config version-controlled and revalidate on dependency updates. | `@contre` |
| Web regressions from future shared extraction refactors. | Medium | Require `typecheck:web` + `build:web` log entry for each extraction commit. | `@contre` |

## Next Actions (Top 5)
1. Evaluate adding an explicit test-helper utility for common auth/group/period mock fixtures to reduce per-suite setup duplication beyond smoke tests.
2. Capture one full manual QA pass in `HTTP Session` mode (not mock fallback) and attach screenshots/log notes.
3. Prepare a Phase 4 closure checklist draft with explicit “done” gates for tests, CI, and manual QA artifacts.
4. Add one focused smoke assertion for `Grupos` create mutation rejection/retry in tab-flow (to mirror join rejection depth).
5. Consider whether fallback-transition warnings should be silenced in tests (stub `console.warn`) or intentionally preserved for diagnostics visibility.
