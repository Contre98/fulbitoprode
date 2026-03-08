# App Full Documentation

## Table of Contents
- [1. Executive Summary](#1-executive-summary)
- [2. Product Overview](#2-product-overview)
- [3. Platform Coverage](#3-platform-coverage)
  - [3.1 Web App](#31-web-app)
  - [3.2 Mobile App](#32-mobile-app)
  - [3.3 Web vs Mobile Parity](#33-web-vs-mobile-parity)
- [4. App Structure and Organization](#4-app-structure-and-organization)
- [5. Information Architecture](#5-information-architecture)
- [6. Detailed Screen/Page Documentation](#6-detailed-screenpage-documentation)
- [7. UI Component Inventory](#7-ui-component-inventory)
- [8. Feature-by-Feature Functional Documentation](#8-feature-by-feature-functional-documentation)
- [9. Interaction and Scenario Matrix](#9-interaction-and-scenario-matrix)
- [10. Forms, Input Rules, and Validation](#10-forms-input-rules-and-validation)
- [11. State Management and Data Flow](#11-state-management-and-data-flow)
- [12. API / Backend Integration](#12-api--backend-integration)
- [13. Authentication, Authorization, and Access Control](#13-authentication-authorization-and-access-control)
- [14. Status, Feedback, and System Messaging](#14-status-feedback-and-system-messaging)
- [15. Edge Cases and Failure Modes](#15-edge-cases-and-failure-modes)
- [16. Visual and UX Patterns](#16-visual-and-ux-patterns)
- [17. Known or Suspected Gaps](#17-known-or-suspected-gaps)
- [18. Suggested Questions / Things to Confirm](#18-suggested-questions--things-to-confirm)
- [19. Appendix](#19-appendix)

## 1. Executive Summary
- **Observed:** This is a monorepo product (`Fulbito Prode`) with a web app (`apps/web`) and a mobile app (`apps/mobile`) focused on social football score predictions by groups.
- **Observed:** Core user value is collaborative prediction play: join/create a group, submit predictions before kickoff, and track standings/fixture outcomes.
- **Observed:** Supported platforms are Next.js web (App Router) and React Native/Expo mobile.
- **Observed:** Backend integration is layered through web API routes (`/api/*`) that combine PocketBase data (`users`, `groups`, `group_members`, `predictions`, `group_invites`) and API-Football provider data (leagues/rounds/fixtures/standings).
- **Observed:** Shared domain rules and contracts live in `packages/domain` and `packages/api-contracts`.
- **Observed:** Main functional domains are authentication, group management, predictions, leaderboard/stats, fixture browsing, and profile/settings.
- **Inferred:** Web is currently the more complete product surface for admin/member management, profile editing, and detailed stats.

### Audit coverage level
- **Fully inspected:**
  - `apps/web/src/app`, `apps/web/src/components`, `apps/web/src/lib`, `apps/web/src/test`
  - `apps/mobile/src/navigation`, `apps/mobile/src/screens`, `apps/mobile/src/components`, `apps/mobile/src/state`, `apps/mobile/src/repositories`, `apps/mobile/src/test`
  - `packages/domain`, `packages/api-contracts`, `packages/design-tokens`
- **Partially inspected:**
  - `docs/*` (used only as secondary context, not source-of-truth)
  - build/test tooling files and scripts

## 2. Product Overview
### What the app does
- Lets users authenticate with email/password.
- Associates users with one or more prediction groups.
- Scopes data by active group and selected date period ("Fecha").
- Shows fixtures by state (upcoming/live/final).
- Lets users save predictions for upcoming fixtures.
- Computes points and ranking from real results.
- Provides group management capabilities (invite, member role operations, leave/delete behavior).

### Likely users
- Casual football fans playing private prediction leagues.
- Group admins/owners who manage invitations and members.
- Competitive users comparing rank, accuracy, and historical performance.

### Core workflows
1. Authenticate.
2. Create or join a group.
3. Select active group and period.
4. Submit predictions for open fixtures.
5. Track ranking and stats.
6. Monitor fixture/live status.
7. Manage profile/group administration as needed.

### Primary use cases
- “I want to join a friend’s group and submit predictions quickly.”
- “I want to compare my points with my group every date.”
- “I need admin actions: invite people, rename group, promote member, remove member.”

### Business/user goals supported
- Increase repeat engagement around matchdays.
- Retain users through group mechanics and leaderboard competition.
- Enable self-service group growth via invite links/tokens.

## 3. Platform Coverage
## 3.1 Web App
### Entrypoints
- Public route: `/auth`.
- Authenticated route set:
  - `/`
  - `/pronosticos`
  - `/posiciones`
  - `/fixture`
  - `/configuracion`
  - `/configuracion/ajustes`
  - `/perfil`

### Main routes/pages and navigation
- Bottom nav (`apps/web/src/components/layout/BottomNav.tsx`) includes: `Inicio`, `Posiciones`, `Pronósticos`, `Fixture`.
- Group management is accessed via selector modal actions and settings/profile links, not via bottom nav tab.

### Web-specific behavior
- Theme system with persisted `dark/light` (`use-theme.tsx`, localStorage key `fulbito.theme`).
- Toast stack with translated backend messages (`ToastProvider.tsx`).
- Mixed route guarding strategy:
  - server-side guard with `requireServerAuth()` on some routes.
  - client-side redirect to `/auth` on others.
- Extensive API surface under Next route handlers.

## 3.2 Mobile App
### Entrypoints
- Expo entry: `apps/mobile/App.tsx` -> `AppNavigation`.

### Navigation stacks/tabs/screens
- Auth-gated root stack (`AppNavigation.tsx`):
  - Unauthenticated: `Auth`
  - Authenticated: `App` (tabs) + `Configuracion` stack screen
- Bottom tabs:
  - `Inicio`
  - `Posiciones`
  - `Pronosticos`
  - `Fixture`

### Mobile-specific behavior
- React Query for server-state orchestration.
- Repository abstraction with HTTP/mock fallback (`apps/mobile/src/repositories/index.ts`).
- Dev diagnostics for fallback mode/history (`DataModeBadge`, `fallbackDiagnostics.ts`).
- Persistent selection with `AsyncStorage`:
  - group id (`fulbito.mobile.selectedGroupId`)
  - period by group (`fulbito.mobile.selectedFecha:<groupId>`)

### Native/platform integrations
- Safe area handling (`react-native-safe-area-context`).
- Gesture root (`react-native-gesture-handler`).
- Async storage persistence.

## 3.3 Web vs Mobile Parity
### Shared behavior
- Auth screen with login/signup toggle.
- Same major domains available in navigation: home, predictions, standings, fixture.
- Group scoping and period scoping as core data dimensions.
- Save predictions for upcoming fixtures.

### Shared UI patterns
- Branded header block with icon/title and group switch affordance.
- Card-based list presentation.
- Filter tabs on Home/Fixture.
- “Por Jugar/Jugados” split in Predictions.

### Platform-specific differences (high impact)
- **Observed:** Web has dedicated profile and account settings screens; mobile does not expose equivalent profile editing flow.
- **Observed:** Web standings stats mode computes data-rich awards and group metrics from historical snapshots; mobile stats are mostly synthetic/static display values.
- **Observed:** Mobile fixture/final score display depends on fixture id naming conventions (regex), while web uses real score payloads.
- **Observed:** Web group admin modal supports member list with promote/kick operations and leave/delete confirm dialog; mobile modal currently supports rename + invite regeneration only.
- **Observed:** Mobile create-group flow currently hardcodes competition scope (`leagueId: 128`, `season: "2026"`, `competitionStage: "apertura"`) and does not expose a league picker equivalent to web.

### Missing parity items
- Profile edit parity is missing on mobile.
- Group member role management parity is missing on mobile UI.
- Final score rendering parity is incomplete/broken on mobile for real HTTP fixtures.

### Visual discrepancies
- Web uses CSS variables and dark/light themes.
- Mobile currently uses a fixed light visual system (no user-facing theme toggle state integration).

### Interaction discrepancies
- Web predictions edit via +/- controls and auto-save queue with transient retry.
- Mobile predictions edit via numeric text inputs with auto-save queue and React Query mutation semantics.

### Functional discrepancies
- Mobile repositories read fixtures from `/api/pronosticos` adapter payload, not `/api/fixture`, reducing available scoreboard richness.
- Web `/api/home` endpoint returns richer summary payload; mobile home composes from fixture + leaderboard queries separately.
- Mobile `ConfiguracionScreen` mixes repository usage (`groupsRepository.createGroup/joinGroup`) with direct fetch calls (`PATCH /api/groups/:id`, `POST /api/groups/:id/invite/refresh`), so mobile admin actions bypass repository abstraction.

## 4. App Structure and Organization
### Repository structure
- `apps/web`: Next.js frontend + API routes.
- `apps/mobile`: Expo React Native client.
- `packages/domain`: shared entities, scoring/date utilities, backend error translation.
- `packages/api-contracts`: repository interfaces used by mobile adapters.
- `packages/design-tokens`: shared primitive color/spacing tokens.

### Responsibility split
- **Web UI layer:** `apps/web/src/app/*`, `apps/web/src/components/*`.
- **Web service/data layer:** `apps/web/src/app/api/*`, `apps/web/src/lib/m3-repo.ts`, `apps/web/src/lib/liga-live-provider.ts`.
- **Web infra/util layer:** session/auth/theme/rate-limit/toast.
- **Mobile UI layer:** `apps/mobile/src/screens/*`, `apps/mobile/src/components/*`.
- **Mobile logic/data layer:** `apps/mobile/src/state/*`, `apps/mobile/src/repositories/*`.

### Shared vs platform-specific code
- Shared:
  - user/group/prediction/fixture/leaderboard domain models.
  - scoring logic and fixture date utils.
  - backend error message translation.
- Platform-specific:
  - web: route handlers, server auth cookie verification, provider and PocketBase orchestration.
  - mobile: React Query adapters, HTTP/mock fallback mode, AsyncStorage hydration.

### Notable architecture patterns
- Web uses request-time API normalization into UI payload types (`apps/web/src/lib/types.ts`).
- Mobile uses adapter contracts (`@fulbito/api-contracts`) to maintain stable UI contracts across HTTP and mock data sources.

## 5. Information Architecture
### Main navigation model
- Primary “daily loop” is tabbed: Home -> Predictions -> Positions -> Fixture.
- Secondary “management loop” is launched from headers/group selectors to settings/group admin.

### Page/screen hierarchy
- **Web:**
  - Public: `/auth`
  - Protected shell pages: `/`, `/pronosticos`, `/posiciones`, `/fixture`
  - Protected management pages: `/configuracion`, `/configuracion/ajustes`, `/perfil`
- **Mobile:**
  - Root auth gate -> Tabs
  - `Configuracion` pushed as stack route from group selector actions

### User journeys
- **Join and play:** Auth -> Join group -> Select group -> Predictions tab -> Save picks.
- **Track competition:** Home/Fixture for match context -> Posiciones for rank.
- **Admin management:** Configuracion -> manage modal -> rename/invite/members (web richer than mobile).

### Deep links/routes
- **Observed:** Web invite deep link pattern `.../configuracion?invite=<token>`.
- **Observed:** Configuracion page reads query param and pre-populates join field (`useSearchParams`).
- **Unclear / Needs Confirmation:** Dedicated mobile deep link intake for invite token is not visible in current code.

## 6. Detailed Screen/Page Documentation

### 6.1 Web: `AuthPage`
- **Name:** `AuthPage`
- **Route:** `/auth`
- **Platform(s):** Web
- **Purpose:** Login/signup entry.
- **Entry conditions:** Public.
- **Exit paths:** successful auth -> `router.replace('/pronosticos')`.
- **Layout structure:** centered card with mode-specific fields and submit CTA.
- **Components:** inline form controls, loading icon (`RefreshCw`), mode toggle.
- **Data displayed:** local form state + server error message.
- **Actions:**
  - toggle login/signup mode
  - submit form
  - forgot password button (visual only)
- **Validation (client):**
  - signup name required
  - email required + regex
  - password required; signup min 8
- **Loading state:** submit button disabled + spinner.
- **Error state:** inline message panel.
- **Permissions:** none.
- **Variants:** login vs signup field set.
- **Parity status:** **Parity partial** (mobile has same high-level flow but weaker client-side validation and no forgot-password affordance).

### 6.2 Web: `HomeScreen`
- **Name:** `HomeScreen`
- **Route:** `/`
- **Platform(s):** Web
- **Purpose:** show summary cards and filtered upcoming/live match cards for active group.
- **Entry conditions:** `requireServerAuth()` in page wrapper + auth context hydrated.
- **Exit paths:** settings/profile links and bottom nav.
- **Data source:** `GET /api/home?groupId=`.
- **Layout:** sticky branded header + summary cards + filter tabs + match card list.
- **Actions:**
  - toggle theme
  - open group selector modal
  - change home filter (`todos`, `en vivo`, `próximos`)
- **Loading state:** skeleton blocks.
- **Empty state:** “No hay partidos para este filtro…”.
- **Error state:** toast + inline error box.
- **Permissions:** membership-aware; if no memberships summary and cards collapse.
- **Web/mobile notes:** web shows all status types under `Todos`; mobile “all” excludes finals by logic.
- **Parity status:** **Parity partial**.

### 6.3 Web: `PronosticosPage`
- **Name:** `PronosticosPage`
- **Route:** `/pronosticos`
- **Platform(s):** Web
- **Purpose:** prediction editing and historical match review.
- **Entry conditions:** client auth redirect if unauthenticated.
- **Data sources:**
  - `GET /api/fechas`
  - `GET /api/pronosticos`
  - `POST /api/pronosticos`
- **Layout:**
  - header with group selector
  - fecha cycler
  - completion progress bar
  - mode tabs (`Por Jugar`, `Jugados`)
  - cards list
- **Key interactions:**
  - plus/minus for each side score (0..20 clamp)
  - auto-save queue per match (800ms debounce)
  - transient retry for save call (408/409/429/5xx)
- **Immediate UI behavior:**
  - draft updates instantly
  - per-fixture “Guardando pronóstico…” chip while in flight
  - lock warning for blocked fixtures
- **State transitions:** `draftPredictions` -> queued -> `committedPredictions` on success.
- **Validation:** complete prediction requires both home and away values; locked fixtures reject editing.
- **Loading state:** skeleton cards.
- **Error states:** inline period-load error + retry button; per-fixture save error chip.
- **Permissions:** group membership required.
- **Parity status:** **Parity partial** (mobile has similar autosave concept but different implementation and status handling).

### 6.4 Web: `PosicionesPage`
- **Name:** `PosicionesPage`
- **Route:** `/posiciones`
- **Platform(s):** Web
- **Purpose:** leaderboard and advanced stats insights.
- **Entry conditions:** client auth redirect if unauthenticated.
- **Data sources:**
  - `GET /api/fechas`
  - `GET /api/leaderboard` for selected mode/period
  - extra historical `GET /api/leaderboard` calls in stats mode to build awards timeline
- **Modes:**
  - `posiciones`: ranking table by points
  - `stats`: awards + aggregate metrics
- **Interactions:**
  - mode toggle
  - period navigation (for positions mode)
  - awards accordion expand/collapse
- **Loading states:** skeleton for table and stats insights.
- **Empty/error states:** inline error text; toast on fetch failures.
- **Business rules:** stats awards computed client-side from historical snapshots and tie-breakers.
- **Known placeholder in UI:** static “RANKING MUNDIAL #842” display in stats card.
- **Parity status:** **Parity broken / discrepancy found** (mobile stats view is largely synthetic and not equivalent to web historical computations).

### 6.5 Web: `FixturePageClient`
- **Name:** `FixturePage`
- **Route:** `/fixture`
- **Platform(s):** Web
- **Purpose:** browse fixtures by date and status filters.
- **Entry conditions:** server auth wrapper + client auth fallback guard.
- **Data sources:** `GET /api/fechas`, `GET /api/fixture`.
- **Layout:** fecha cycler, updated-at label, filter tabs (`Todos`, `En vivo`, `Finalizados`, `Próximos`), grouped cards.
- **Interactions:** change filter, cycle period, change group.
- **Loading state:** skeleton cards.
- **Empty state:** “No hay partidos disponibles para este filtro.”
- **Error state:** inline error and toast.
- **Parity notes:** web has explicit status detail and score labels from fixture cards.
- **Parity status:** **Parity partial** (mobile fixture uses simpler data model and final score derivation fallback logic).

### 6.6 Web: `ConfiguracionPageClient`
- **Name:** `Configuracion` (Groups management)
- **Route:** `/configuracion`
- **Platform(s):** Web
- **Purpose:** create/join groups and administer memberships/invites.
- **Entry conditions:** server auth wrapper + client auth fallback guard.
- **Primary sections:**
  - create/join switcher
  - league selector for creation
  - group cards list
  - per-group management modal
- **Actions:**
  - create group
  - join with code/token
  - set active group
  - open members modal
  - copy/share invite
  - rename group (admin/owner)
  - regenerate invite (admin/owner)
  - promote member to admin (role constrained)
  - kick member (role constrained)
  - leave group or delete group with confirm dialog
- **Loading states:** per-operation button states; member loading state.
- **Error handling:** toast messages translated through shared domain translator.
- **Permissions/visibility:** admin tools visible only for owner/admin.
- **Parity status:** **Parity partial** (mobile has create/join and limited admin tools, but missing member role management, leave/delete flow parity).

### 6.7 Web: `ConfiguracionAjustesPageClient`
- **Name:** `Configuración Ajustes`
- **Route:** `/configuracion/ajustes`
- **Platform(s):** Web
- **Purpose:** account-level actions (link to profile, logout).
- **Actions:** navigate to `/perfil`, logout.
- **Loading/error:** logout button disabled while closing session; toast on logout failure.
- **Parity notes:** no equivalent dedicated settings page in mobile stack.
- **Parity status:** **Parity broken / discrepancy found**.

### 6.8 Web: `ProfilePageClient`
- **Name:** `Perfil`
- **Route:** `/perfil`
- **Platform(s):** Web
- **Purpose:** profile summary, stats, recent activity, and editable profile fields.
- **Data source:** `GET /api/profile`.
- **Actions:**
  - switch `perfil`/`stats` mode
  - open edit modal
  - edit name/username/email
  - save -> `PATCH /api/auth/me`
- **Loading states:** skeletons for stats/activity.
- **Fallback behavior:** if `/api/profile` fails, builds recent activity from memberships.
- **Validation behavior:** limited client constraints (max lengths), server route enforces regex/required rules.
- **Parity notes:** mobile has no separate profile screen.
- **Parity status:** **Parity broken / discrepancy found**.

### 6.9 Mobile: `AuthScreen`
- **Name:** `AuthScreen`
- **Navigation identifier:** `Auth`
- **Platform(s):** Mobile
- **Purpose:** login/signup.
- **Entry conditions:** unauthenticated root navigator.
- **Exit path:** auth state flips to authenticated, navigator switches to tabs.
- **Actions:** toggle mode, submit, update fields.
- **Validation:** mostly backend-driven; no strict client regex/length checks.
- **Loading/error:** submit disabled while pending; translated inline error text.
- **Parity status:** **Parity partial**.

### 6.10 Mobile: `HomeScreen`
- **Name:** `HomeScreen`
- **Navigation identifier:** tab `Inicio`
- **Platform(s):** Mobile
- **Purpose:** summary metrics and filtered match cards.
- **Data sources:**
  - leaderboard query (`getLeaderboard`)
  - fixture query (`listFixture`)
- **Filters:** `all`, `live`, `upcoming` (`homeFilters.ts`).
- **Behavior note:** `all` returns live + open upcoming only; finals excluded by design in helper.
- **Loading/empty/error:** dedicated components.
- **Parity status:** **Parity partial**.

### 6.11 Mobile: `PronosticosScreen`
- **Name:** `PronosticosScreen`
- **Navigation identifier:** tab `Pronosticos`
- **Platform(s):** Mobile
- **Purpose:** prediction editing and history view.
- **Data sources:** fixture and predictions repositories.
- **Interactions:**
  - mode tabs `upcoming/history`
  - fecha navigation
  - numeric text input scores
  - debounce autosave queue (800ms)
- **State patterns:** optimistic cache update via React Query `onMutate`; invalidate on settle.
- **Per-fixture statuses:** `saving`, `error`, `idle`.
- **Important discrepancy:** non-upcoming card score rendering falls back to fixture id regex or user prediction values.
- **Parity status:** **Parity partial** with **score-display discrepancy risk**.

### 6.12 Mobile: `PosicionesScreen`
- **Name:** `PosicionesScreen`
- **Navigation identifier:** tab `Posiciones`
- **Platform(s):** Mobile
- **Purpose:** positions and stats-like panel.
- **Data source:** leaderboard repository only.
- **Behavior notes:**
  - positions table synthesizes extra columns from points (not true EX/RE/NA payload).
  - stats section uses static reward templates and derived placeholder world rank.
- **Parity status:** **Parity broken / discrepancy found** versus web stats feature depth and data semantics.

### 6.13 Mobile: `FixtureScreen`
- **Name:** `FixtureScreen`
- **Navigation identifier:** tab `Fixture`
- **Platform(s):** Mobile
- **Purpose:** date-grouped fixture list with filters.
- **Filters:** all/live/final/upcoming.
- **Grouping:** shared domain utility `groupFixturesByDate`.
- **Score display:** final score is parsed from fixture id pattern if present; otherwise `--`.
- **Parity status:** **Parity broken / discrepancy found** for final score reliability.

### 6.14 Mobile: `ConfiguracionScreen`
- **Name:** `ConfiguracionScreen`
- **Navigation identifier:** stack route `Configuracion`
- **Platform(s):** Mobile
- **Purpose:** group create/join and limited admin actions.
- **Actions:** create, join, open manage modal, rename group, regenerate invite, logout.
- **Observed implementation detail:** create-group uses fixed defaults (`Liga Profesional`, `leagueId=128`, `season=2026`, `competitionStage=apertura`), with no user-facing competition selector.
- **Observed implementation detail:** rename/invite-refresh use direct `fetch` helpers instead of the shared repository interface.
- **Permissions:** rename/invite refresh gated to owner/admin.
- **Missing compared to web:** no member list management, no leave/delete action confirm flow, no share/copy invite link flows.
- **Parity status:** **Parity partial**.

### 6.15 Cross-screen transient views (both platforms)
- **Web modals/sheets:**
  - `GlobalGroupSelector` bottom sheet
  - `ConfirmDialog` (leave/delete)
  - profile edit modal
  - configuration members modal
- **Mobile modals:**
  - `HeaderGroupSelector` selector sheet
  - `Configuracion` management modal
- **Parity status:** **Parity partial** (web has richer modal action breadth).

## 7. UI Component Inventory

### 7.1 Layout and navigation components
| Component | File | Platform | Purpose | Inputs | Outputs/Callbacks | States | Usage | Parity |
|---|---|---|---|---|---|---|---|---|
| `AppShell` | `apps/web/src/components/layout/AppShell.tsx` | Web | Frame + animated route transitions + bottom nav | `activeTab`, `showTopGlow` | none | normal | all shell pages | Partial |
| `BottomNav` | `apps/web/src/components/layout/BottomNav.tsx` | Web | primary nav | `activeTab` | link navigation | active/inactive | shell pages | Confirmed tab set |
| `GlobalGroupSelector` | `apps/web/src/components/layout/GlobalGroupSelector.tsx` | Web | active group switcher modal | memberships, active id | `onSelectGroup` | open/closed/disabled | main scoped pages | Partial |
| `TopHeader` | `apps/web/src/components/layout/TopHeader.tsx` | Web | generic header primitive | title/subtitle | theme toggle (internal) | n/a | currently unused | Unclear |
| `ScreenFrame` | `apps/mobile/src/components/ScreenFrame.tsx` | Mobile | screen scaffold with optional header and scroll body | title/subtitle/header | none | badge hidden/shown | all mobile screens | Partial |
| `HeaderGroupSelector` | `apps/mobile/src/components/HeaderGroupSelector.tsx` | Mobile | group selector modal from headers | memberships, selected id | `onSelectGroup`, navigate to Configuracion | open/closed | all major tabs | Partial |

### 7.2 Feedback/state components
| Component | File | Platform | Purpose | Inputs | Outputs | States | Usage | Parity |
|---|---|---|---|---|---|---|---|---|
| `ToastProvider` | `apps/web/src/components/ui/ToastProvider.tsx` | Web | global toasts | toast payload | `showToast` API | success/error/info | globally wrapped | Broken (no equivalent toast system surfaced on mobile) |
| `SkeletonBlock` | `apps/web/src/components/ui/SkeletonBlock.tsx` | Web | loading placeholders | className | none | n/a | multiple pages | Partial |
| `LoadingState` | `apps/mobile/src/components/LoadingState.tsx` | Mobile | loading feedback | message | none | n/a | mobile screens | Partial |
| `EmptyState` | `apps/mobile/src/components/EmptyState.tsx` | Mobile | empty list feedback | title/description | none | n/a | mobile screens | Partial |
| `ErrorState` | `apps/mobile/src/components/ErrorState.tsx` | Mobile | error + retry button | message/retry | `onRetry` | retry visible/hidden | mobile screens | Partial |
| `DataModeBadge` | `apps/mobile/src/components/DataModeBadge.tsx` | Mobile | diagnostics of HTTP vs mock fallback | auth context state | retry/clear history actions | http/mock modes | only via `ScreenFrame` (currently often hidden) | Broken in practical visibility |

### 7.3 Form/input and dialog components
| Component | File | Platform | Purpose | Inputs | Outputs | States | Usage | Parity |
|---|---|---|---|---|---|---|---|---|
| `BottomSheet` | `apps/web/src/components/ui/BottomSheet.tsx` | Web | reusable sheet container | `open`, `title`, `footer` | `onClose` | open/closed | used by confirm dialog | Partial |
| `ConfirmDialog` | `apps/web/src/components/ui/ConfirmDialog.tsx` | Web | destructive/confirm prompt | title/description/tone/loading | `onConfirm`, `onCancel` | loading/idle | group leave/delete | Broken (no equivalent generic confirmation pattern on mobile) |
| `PredictionStepper` | `apps/web/src/components/matches/PredictionStepper.tsx` | Web | numeric stepper with wheel/touch drag | value/min/max/disabled | increment/decrement callbacks | enabled/disabled | only in unused `MatchCard` currently | Unclear |
| `GroupSelector` | `apps/mobile/src/components/GroupSelector.tsx` | Mobile | horizontal group chips | context state | set selected group | active/inactive | currently unused in screens | Unclear |
| `FechaSelector` | `apps/mobile/src/components/FechaSelector.tsx` | Mobile | period cycler control | context state | set fecha | wrap-around prev/next | currently unused in screens | Unclear |

### 7.4 Domain visual components
| Component | File | Platform | Purpose | Inputs | Outputs | States | Usage | Parity |
|---|---|---|---|---|---|---|---|---|
| `MatchCard` | `apps/web/src/components/matches/MatchCard.tsx` | Web | rich match card states (live/upcoming/final) | match model + optional prediction controls | click/increment/decrement callbacks | live/upcoming/final, locked | not currently mounted by route pages | Unclear |
| `LeaderboardTable` | `apps/web/src/components/leaderboard/LeaderboardTable.tsx` | Web | positions table + mode switch | rows/mode | mode change callback | loading/idle | not currently mounted by route pages | Unclear |
| `FixtureDateCard` | `apps/web/src/components/fixture/FixtureDateCard.tsx` | Web | grouped fixture rows | card model | row click callback | accent live/default | not currently mounted by current fixture page | Unclear |
| `TeamCrest` | `apps/mobile/src/components/TeamCrest.tsx` | Mobile | team logo or fallback crest | team name/code/logo | image error internal state | logo/fallback | used in multiple mobile screens | Partial |
| `BrandBadgeIcon` | `apps/mobile/src/components/BrandBadgeIcon.tsx` | Mobile | brand glyph | size | none | n/a | mobile headers | Partial |

### 7.5 Additional web home components present but not mounted
- `CurrentSelectionSelector` (`apps/web/src/components/home/CurrentSelectionSelector.tsx`)
- `GroupCardCarousel` (`apps/web/src/components/home/GroupCardCarousel.tsx`)
- `GroupSwitcher` (`apps/web/src/components/home/GroupSwitcher.tsx`)
- `LeagueSelector` (`apps/web/src/components/home/LeagueSelector.tsx`)
- **Observed:** these appear to be legacy or alternate UI implementations and are currently unused by active routes.

## 8. Feature-by-Feature Functional Documentation

### 8.1 Authentication and Session
- **What it does:** login/register/logout and session hydration.
- **Where:**
  - Web UI: `/auth`
  - Web API: `/api/auth/*`
  - Mobile: `AuthScreen`, `AuthContext`, auth repositories
- **Data flow:**
  - web login/register sets signed cookie `fulbito_session` with user id + PocketBase token payload.
  - session validated by HMAC (`session.ts`).
  - mobile HTTP auth adapter calls web API and relies on cookie-based session (`credentials: include`).
- **Validation rules:**
  - login/register API requires email/password; register enforces password >= 8.
  - web client adds stricter pre-submit checks.
- **Failure cases:**
  - 401 unauthorized returns to auth.
  - rate limits: login (20/15m), register (10/15m).
- **Parity status:** **Parity partial**.

### 8.2 Group Selection Scope
- **What it does:** central “active group” context used by Home/Predictions/Fixture/Leaderboard.
- **Where:**
  - Web: `use-auth-session.ts`
  - Mobile: `GroupContext.tsx`
- **State persistence:**
  - web localStorage `fulbito.activeGroupId`
  - mobile AsyncStorage `fulbito.mobile.selectedGroupId`
- **Edge behavior:** if stored group no longer valid, first membership is selected.
- **Parity status:** **Parity confirmed** for core behavior.

### 8.3 Group Lifecycle and Administration
- **What it does:** create, join, invite operations, member role management, leave/delete logic.
- **Where:** web config page + group APIs + `m3-repo`.
- **Business rules (Observed):**
  - only owner/admin can manage invites and member roles.
  - admin cannot modify/remove another admin; owner protections enforced.
  - leaving as sole owner may soft-delete group.
- **Invites:**
  - code/token generated with entropy + expiration 7 days.
  - max uses enforced if configured.
- **Platform differences:** mobile currently exposes create/join + rename/invite refresh only, and create-group is pinned to one competition scope instead of choosing from `/api/leagues`.
- **Parity status:** **Parity partial**.

### 8.4 Prediction Submission
- **What it does:** capture per-fixture scores for upcoming matches before lock.
- **Where:**
  - Web: `/pronosticos`, `/api/pronosticos`
  - Mobile: `PronosticosScreen` + predictions repository adapter
- **Rules:**
  - both scores required before submit queue.
  - score clamp to 0..20 in web route and client logic.
  - lock at kickoff (`isLocked`).
- **Immediate UX:** per-fixture save statuses (saving/error chips).
- **Server protections:** membership check + write rate limit 120/10m.
- **Parity status:** **Parity partial**.

### 8.5 Fixture Browsing
- **What it does:** period-based fixture view with status filtering.
- **Web data path:** `/api/fixture` built from provider fixture cards with status labels and scores.
- **Mobile data path:** adapter currently uses `/api/pronosticos` matches list and derives display states.
- **Known discrepancy:** mobile final scores are not reliably sourced from backend match results.
- **Parity status:** **Parity broken / discrepancy found**.

### 8.6 Leaderboard and Stats
- **What it does:** rank users by points and expose group performance stats.
- **Web:** dynamic computation from predictions + fixture scores + historical snapshots.
- **Mobile:** simplified leaderboard rows; stats view includes placeholders/synthetic labels.
- **Parity status:** **Parity broken / discrepancy found**.

### 8.7 Home Dashboard
- **What it does:** quick summary and filtered match visibility.
- **Web:** uses dedicated `/api/home` summary payload and live cards.
- **Mobile:** composes from fixture + leaderboard repositories.
- **Discrepancy:** filter semantics and final match treatment differ.
- **Parity status:** **Parity partial**.

### 8.8 Profile and Account Settings
- **Web:** dedicated `/perfil` with edit modal and `/configuracion/ajustes` with account actions.
- **Mobile:** no equivalent profile page or profile-edit route.
- **Parity status:** **Parity broken / discrepancy found**.

### 8.9 Data Fallback Diagnostics (Mobile-only feature)
- **What it does:** if enabled by env, repositories can fall back from HTTP to mock data and track diagnostics.
- **Where:** `apps/mobile/src/repositories/index.ts`, `fallbackDiagnostics.ts`, `DataModeBadge`.
- **Behavior:** logs scope/message/time and allows `Reintentar HTTP` and history clearing.
- **Parity status:** **Parity broken / discrepancy found** (web has no comparable user-facing diagnostics flow).

## 9. Interaction and Scenario Matrix

| Interaction | Where | Preconditions | Immediate UI response | State/data changes | Backend/API | Success path | Error/invalid path | Retry/cancel/leave behavior | Web vs Mobile |
|---|---|---|---|---|---|---|---|---|---|
| Login submit | Web `/auth`, Mobile `AuthScreen` | email/password entered | button disabled + loading text/spinner | auth context session updated | `POST /api/auth/login-password` + session fetch | redirects/gates into app | inline auth error shown | user can retry immediately | Web adds stricter client validation |
| Signup submit | Web `/auth`, Mobile `AuthScreen` | signup mode | loading CTA | new session state | `POST /api/auth/register-password` | enters app | translated error | retry possible | Web enforces name + password length client-side |
| Toggle auth mode | Auth screens | none | swaps form fields/copy | local mode state only | none | mode switched | n/a | user can toggle back | Similar |
| Select active group | header selector modal | memberships > 0 | modal closes, header label updates | selected group persisted | none directly, pages refetch based on state | page data refreshes for new scope | no explicit error | can reopen modal and reselect | Similar core behavior |
| Selector footer action (Nuevo/Administrar) | web `GlobalGroupSelector`, mobile `HeaderGroupSelector` | selector modal open | modal closes and app navigates to config surface | none until config actions | web route transition to `/configuracion`; mobile `navigation.navigate("Configuracion")` | user reaches create/join/manage UI | no explicit inline error branch | user can back-navigate to prior tab/screen | Similar intent; mobile always routes to one stack screen |
| Cycle fecha | predictions/positions/fixture | options available | label changes instantly | selected period state updates | triggers corresponding queries/fetches | new period data shown | query error state shown | user cycles again or retry query | Similar core behavior |
| Edit prediction value | predictions upcoming card | fixture open upcoming | input/score widget updates | draft state updated | queued save call | eventual saved state and chips cleared | per-fixture error chip | autosave queue can retrigger on new changes | control style differs |
| Save prediction | web autosave, mobile mutation | complete home+away | “saving” indicator | server state mutation | `POST /api/pronosticos` | committed prediction updated | lock/forbidden/network errors | retry by editing again / auto queue | Web has explicit transient-status retry |
| Attempt edit on locked fixture | predictions upcoming area | kickoff passed or locked match | controls disabled / locked warning | no mutation | none | locked message only | n/a | user cannot force save | Similar intent |
| Switch predictions mode | predictions page/screen | none | list switches tabs | local mode state | none | upcoming/history cards shown | n/a | no data loss of drafts | Similar |
| Open group manage modal | config groups list | membership exists | modal/sheet appears | modal state set | may trigger members/invite load (web) | manage actions enabled by role | toast on load failure | close modal | Web richer modal |
| Create group | config create form | non-empty group name; selected league (web) | submit button busy | refresh auth memberships | `POST /api/groups` | new group selected and success message | translated error message | user can edit input and retry | Parity partial: web selects competition; mobile submits fixed `leagueId: 128`, `season: "2026"`, `competitionStage: "apertura"` |
| Join group | config join form | code/token entered | submit busy | refresh memberships | `POST /api/groups/join` | joined group selected | translated error message | retry with new code | Similar core |
| Rename group | config manage modal | owner/admin role | action button busy | group name refreshed | `PATCH /api/groups/:id` | toast/status success | error message | retry possible | Both support |
| Regenerate invite | config manage modal | owner/admin | action busy | new invite code cached | `POST /api/groups/:id/invite/refresh` | new code shown | error message | retry possible | Both support, web also has copy/share link |
| Promote member/kick member | web config modal | owner/admin + role constraints | action icon busy | members list updated locally | `PATCH/DELETE /api/groups/:id/members` | success toast | permission/error toast | can retry after failure | Missing on mobile UI |
| Leave/delete group | web config confirm dialog | membership exists | confirm dialog + loading | memberships/invites cache cleanup + refresh | `POST /api/groups/leave` or `DELETE /api/groups/:id` | success toast and modal closes | error toast | user can cancel before confirm | Missing on mobile UI |
| Save profile edits | web `/perfil` modal | fields filled | modal save button busy | refresh auth session | `PATCH /api/auth/me` | modal closes + updated profile | currently generic failure handling in UI | user can retry | Missing on mobile |
| Toggle theme | web headers | none | icon and theme change | theme in localStorage + html data-theme | none | immediate visual switch | n/a | persistent across sessions | Missing equivalent on mobile |
| Logout | web ajustes, mobile config | authenticated | button busy | session cleared | `POST /api/auth/logout` (web/mobile HTTP when available) | user returns to auth | toast/status on fail | retry button press | Similar intent |
| Retry fallback HTTP | mobile `DataModeBadge` | in mock mode | action button press | auth refresh attempted | `/api/auth/me` via auth repo | mode may switch back to HTTP | still mock with diagnostics | repeat action | Mobile-only |

## 10. Forms, Input Rules, and Validation

### 10.1 Web forms
| Form | Fields | Required | Validation | Submit behavior | Disabled/loading | Success handling | Error handling | Mobile parity |
|---|---|---|---|---|---|---|---|---|
| Auth login | email, password | yes | email regex, non-empty | POST login route | submit disabled while loading | refresh session + redirect | inline error text | Partial |
| Auth signup | name, email, password | yes | name non-empty, email regex, password >= 8 | POST register route | submit disabled while loading | refresh + redirect | inline error text | Partial |
| Create group | name + league selector | name + league | trim non-empty | POST `/api/groups` | button disabled if invalid or creating | refresh memberships, set active group | toast error | Partial |
| Join group | codeOrToken | yes | trim non-empty | POST `/api/groups/join` | button disabled if invalid or joining | refresh + set active group | toast error | Confirmed core |
| Rename group | name | yes | trim non-empty (server max 80) | PATCH group route | action-specific loading | refresh + toast | toast error | Partial |
| Profile edit | name, username, email | effectively yes for username/email in API | max lengths client; API regex and length checks | PATCH `/api/auth/me` | save button loading | modal close + refresh | generic failure branch | Missing |

### 10.2 Mobile forms
| Form | Fields | Required | Validation | Submit behavior | Disabled/loading | Success handling | Error handling |
|---|---|---|---|---|---|---|---|
| Auth login/signup | name (signup), email, password | yes except signup name optional fallback | minimal client checks | via `authRepository` | submit disabled while pending | root navigator switches on session | translated inline error |
| Create group | group name | yes | trim non-empty | `groupsRepository.createGroup` with hardcoded scope (`leagueId: 128`, `season: "2026"`, `competitionStage: "apertura"`) | pending blocks controls | refresh + set active group + status message | translated status message |
| Join group | invite code/token | yes | trim non-empty | `groupsRepository.joinGroup` | pending blocks controls | refresh + set active group + status message | translated status message |
| Rename group | new name | yes | trim non-empty | direct `requestGroupAdminJson` fetch to `PATCH /api/groups/:id` (outside repository adapters) | modal action loading | updates local status + refresh | translated status |

### 10.3 Prediction input validation
- **Web:** plus/minus controls clamp each score to `0..20`; save only when both values present.
- **Mobile:** text input sanitized to digits; normalized by shared `normalizePredictionInput`; save only if complete.
- **Server:** `/api/pronosticos` clamps `home/away` to `0..20`; rejects missing identifiers and locked/non-upcoming fixtures.

## 11. State Management and Data Flow
### 11.1 Web state
- **Global contexts:**
  - `AuthSessionProvider` for user/memberships/activeGroup.
  - `ThemeProvider` for light/dark mode.
  - `ToastProvider` for transient notifications.
- **Page-local state:** heavy use of `useState` + `useMemo` + `useRef` caches.
- **Client caching examples:**
  - Home: `homeCacheRef` by `groupId`.
  - Predictions: `fechasCacheRef`, `payloadCacheRef`, autosave timer/queue refs.
  - Positions: `payloadCacheRef`, `statsSnapshotsCacheRef`.
  - Fixture: `fixtureCacheRef`.

### 11.2 Mobile state
- `AuthContext`: session + dataMode + fallback diagnostics + auth actions.
- `GroupContext`: membership-scoped selected group with AsyncStorage persistence.
- `PeriodContext`: per-group fecha options/selection with API-backed hydration and AsyncStorage persistence.
- `PeriodContext` fallback defaults when API is unavailable: `2026-01`/`Fecha 1`, `2026-02`/`Fecha 2`, `2026-03`/`Fecha 3`.
- React Query for server state and mutation orchestration.

### 11.3 Async flows and derived state
- Derived examples:
  - completion percentages for predictions
  - nearest deadline labels
  - filtered fixture/match lists
  - computed awards in web positions stats mode
- Async behavior:
  - cancellation flags in web effects (`cancelled` booleans)
  - mutation lifecycle in mobile predictions (`onMutate`, `onError`, `onSettled`)

### 11.4 Cache invalidation/refetch
- Web: manual cache map invalidation by deleting keys.
- Mobile: `queryClient.invalidateQueries` after prediction save settle.

### 11.5 Optimistic updates
- Mobile predictions use explicit optimistic update of query cache before server response.
- Web predictions update `draft` locally and commit only after successful save, without full optimistic backend assumption.

## 12. API / Backend Integration

### 12.1 Auth/session endpoints
- `POST /api/auth/login-password`
  - validates credentials, rate limits, sets signed cookie.
- `POST /api/auth/register-password`
  - validates payload, creates user in PocketBase, logs in, sets cookie.
- `GET /api/auth/me`
  - resolves user + memberships with enriched league names.
- `PATCH /api/auth/me`
  - validates name/username/email/favorite team lengths and formats.
- `POST /api/auth/logout`
  - clears cookie.

### 12.2 Group endpoints
- `GET /api/groups`: list user groups.
- `POST /api/groups`: create group + owner membership + invite.
- `POST /api/groups/join`: join by code/token.
- `POST /api/groups/leave`: leave membership, or delete if sole owner.
- `PATCH /api/groups/:id`: rename group.
- `DELETE /api/groups/:id`: soft-delete group and deactivate members/invites.
- `GET/PATCH/DELETE /api/groups/:id/members`: list/promote/remove members with role checks.
- `GET /api/groups/:id/invite`: fetch current valid invite and `inviteUrl`.
- `POST /api/groups/:id/invite/refresh`: create fresh invite.

### 12.3 Data endpoints
- `GET /api/home`: summary + live cards by selected group.
- `GET/POST /api/pronosticos`: fetch matches/predictions, save prediction.
- `GET /api/leaderboard`: positions/stats payload; can return `409` with explicit PocketBase rules guidance when group-wide prediction reads are blocked.
- `GET /api/fixture`: grouped fixture cards by period.
- `GET /api/fechas`: period list + default period.
- `GET /api/leagues`: competition options for group creation.
- `GET /api/profile`: user stats + recent activity.

### 12.4 Health endpoints
- `GET /api/health/pocketbase`.
- `GET /api/health/provider` with admin/health-token access controls and short-term cache.

### 12.5 Backend contracts and assumptions
- **Observed:** web API hides direct PocketBase schema from clients.
- **Observed:** provider-layer caching and normalization are handled server-side.
- **Inferred:** mobile should ideally consume richer fixture payloads if parity for final scores is required.

### 12.6 Retry and error patterns
- Web prediction save has one retry for transient HTTP statuses.
- Rate limiting errors include `Retry-After` header.
- Many API errors are translated client-side through `translateBackendErrorMessage`.

## 13. Authentication, Authorization, and Access Control
### Login/logout/session
- Signed cookie (`fulbito_session`) includes user id + PocketBase auth token + expiry.
- Signature uses HMAC SHA-256 and `SESSION_SECRET`.
- Unauthorized API responses are explicit `401`.

### Route protection
- Server-side guard exists on selected web routes.
- Client-side auth redirects exist on other routes.
- Mobile root navigator conditionally renders auth vs app stacks.

### Roles/permissions
- Membership roles: `owner`, `admin`, `member`.
- Privileged operations require owner/admin.
- Additional role constraints:
  - owner role immutable by admin actions.
  - admins cannot alter/expel other admins.
  - self-demotion/self-kick blocked.

### Unauthorized states
- API: `401` unauthorized, `403` forbidden.
- UI: redirect to auth (web), auth stack fallback (mobile).

## 14. Status, Feedback, and System Messaging
### Loading indicators
- Web: skeleton placeholders in main pages.
- Mobile: `LoadingState` component and query loading branches.

### Empty states
- Home, predictions, fixture, positions all have explicit empty copy.

### Error messaging
- Web: toast + inline chips/panels.
- Mobile: inline `ErrorState` and status text.
- Shared translator maps raw backend strings to user-facing Spanish copy.

### Confirmations and warnings
- Web has explicit `ConfirmDialog` for destructive actions.
- Prediction lock warnings shown near cards.
- Success notifications for group actions in web toasts/mobile status labels.

### Notable messaging gaps
- notification bell buttons are visual only (no event panel).
- forgot-password action on web auth is not wired.

## 15. Edge Cases and Failure Modes
- **No memberships:**
  - web home/fixture/leaderboard return empty-safe payloads.
  - mobile contexts fallback to null/default selections.
- **No available fechas:**
  - web and mobile both provide fallback labels/options.
- **Session expiration:**
  - API returns unauthorized; UI redirects/gates to auth.
- **Provider outage:**
  - web provider calls return empty or error; health endpoint exposes status.
- **Prediction lock at kickoff:**
  - server rejects with `409` and client shows lock/error chips.
- **Network instability:**
  - web has limited transient retry for prediction save only.
  - mobile can optionally fall back to mock mode when enabled.
- **Race conditions:**
  - queue/in-flight safeguards reduce overlapping prediction saves.
- **Potential stale/cache issues:**
  - multiple page-local caches in web can drift if refresh invalidation misses a path.
- **Cross-platform inconsistency risk:**
  - mobile final score rendering logic is not equivalent to web/provider score source.
- **Mobile fixture chronology fallback:**
  - HTTP fixture adapter sets missing `kickoffAt` to `new Date().toISOString()`, which can reorder cards incorrectly when backend payload omits kickoff.

## 16. Visual and UX Patterns
- Mobile-first card architecture on both platforms.
- Lime-accent visual identity (`primary` around `#B6D900`/`#C6FF00`) shared via tokens.
- Repeated top header pattern: brand mark + section icon + profile/group affordance.
- Dense data cards with compact typography and badges.
- Web supports dark/light themes; mobile currently stylistically fixed to light palette.
- Accessibility clues:
  - many controls include `aria-label` on web.
  - focus-visible outlines defined in CSS.
  - mobile uses accessibility labels on key Pressables.
- Consistency observations:
  - tab naming and primary domain labels are mostly aligned.
  - detailed stats semantics and profile/settings capabilities diverge notably.

## 17. Known or Suspected Gaps
| # | Description | Evidence | Affected platform(s) | Confidence |
|---|---|---|---|---|
| 1 | Mobile final scores depend on fixture id regex; real API ids may not encode scores, causing `--` or wrong values | `FixtureScreen` `deriveDisplayScore`; `PronosticosScreen` `explicitScoreFromFixtureId` fallback | Mobile | High |
| 2 | Mobile predictions history may show user prediction instead of real result when score missing | `PronosticosScreen` `readOnlyHome/readOnlyAway` fallback to committed draft | Mobile | High |
| 3 | Mobile standings stats are synthetic and not equivalent to web stats computation | `PosicionesScreen` hardcoded reward templates and derived placeholders | Mobile | High |
| 4 | No mobile profile edit screen equivalent to web `/perfil` + `/configuracion/ajustes` | navigator and screen inventory | Mobile vs Web | High |
| 5 | Member promote/kick flows exist on web but not exposed on mobile | web config modal vs mobile config modal actions | Mobile vs Web | High |
| 6 | Duplicate/unused group selector modal implementations in web route files | `GroupSelectorModal` defined in fixture/posiciones page but not rendered | Web | High |
| 7 | Multiple reusable web components are present but currently unused | `MatchCard`, `LeaderboardTable`, `FixtureDateCard`, `TopHeader`, home selector variants | Web | High |
| 8 | `GET /api/home` returns `groupCards` but current `HomeScreen` does not render them | endpoint payload vs `HomeScreen` state usage | Web | High |
| 9 | Mixed auth guard strategy across web routes can create inconsistent SSR behavior | `requireServerAuth` only on subset of pages | Web | Medium |
| 10 | Notification bell buttons are visual only | multiple pages render bell without handlers | Web/Mobile | High |
| 11 | Forgot-password CTA is present but not wired | `/auth` button lacks action | Web | High |
| 12 | `DataModeBadge` infrastructure exists but all major mobile screens pass `hideDataModeBadge` | `ScreenFrame` usage in tab screens | Mobile | High |
| 13 | API `PATCH /api/auth/me` catches broad errors and may return generic `Invalid payload` for backend failures | route-level catch logic | Web | Medium |
| 14 | In-memory rate limiting/cache is process-local, not distributed | `rate-limit.ts`, provider caches | Web infra | Medium |
| 15 | Existing docs mention routes/components not present in current code (`/configuracion/perfil`) | `docs/web-app-functional-ui-spec.md` vs route inventory | Docs | Medium |
| 16 | Mobile create-group flow is fixed to a single competition scope and cannot select league/season/stage | `ConfiguracionScreen` create mutation payload (`leagueId: 128`, `season: "2026"`, `competitionStage: "apertura"`) | Mobile | High |
| 17 | Mobile group-admin actions bypass repository abstraction and call raw fetch helpers | `ConfiguracionScreen` `requestGroupAdminJson` for rename/invite-refresh | Mobile architecture | Medium |
| 18 | Mobile HTTP fixture mapping substitutes missing kickoff with current timestamp, potentially distorting sort order | `httpDataRepositories.ts` `kickoffAt: match.kickoffAt ?? new Date().toISOString()` | Mobile | Medium |

## 18. Suggested Questions / Things to Confirm
1. Should mobile consume `/api/fixture` (or richer match result fields) to guarantee correct final score display?
2. Is mobile expected to reach full parity for profile editing and account settings, or is web intentionally the management surface?
3. Is mobile `Posiciones` stats currently a placeholder, and if yes what exact metrics should mirror web?
4. Should web keep both server-side and client-side auth guards, or standardize one strategy per route type?
5. Are notification buttons planned features, and what are the expected entry points/behaviors?
6. Should `DataModeBadge` be visible in production/dev screens or intentionally hidden now?
7. Is `groupCards` from `/api/home` still part of product intent (carousel) or safe to remove from API/UI?
8. For destructive group operations, should mobile also implement leave/delete confirmations and role-based member actions?
9. Should prediction max goals stay `20` on web route while shared domain allows up to `99` input normalization?
10. Should soft-delete semantics for groups be surfaced more explicitly in UI copy and audit logs?
11. Should mobile create-group expose league/season/stage selection (matching web `/api/leagues`) instead of fixed defaults?
12. Should mobile rename/invite-refresh move into `groupsRepository` for parity with adapter/fallback architecture?

## 19. Appendix

### 19.1 Route inventory
#### Web pages
- `/auth`
- `/`
- `/pronosticos`
- `/posiciones`
- `/fixture`
- `/configuracion`
- `/configuracion/ajustes`
- `/perfil`

#### Mobile navigation
- Root stack: `Auth` | `App` tabs + `Configuracion`
- Tabs: `Inicio`, `Posiciones`, `Pronosticos`, `Fixture`

#### Web API routes
- Auth: `/api/auth/login-password`, `/api/auth/register-password`, `/api/auth/logout`, `/api/auth/me`
- Groups: `/api/groups`, `/api/groups/join`, `/api/groups/leave`, `/api/groups/[groupId]`, `/api/groups/[groupId]/members`, `/api/groups/[groupId]/invite`, `/api/groups/[groupId]/invite/refresh`
- Data: `/api/home`, `/api/pronosticos`, `/api/leaderboard`, `/api/fixture`, `/api/fechas`, `/api/leagues`, `/api/profile`
- Health: `/api/health/pocketbase`, `/api/health/provider`

### 19.2 Screen inventory
- **Web:** `AuthPage`, `HomeScreen`, `PronosticosPage`, `PosicionesPage`, `FixturePage`, `ConfiguracionPage`, `ConfiguracionAjustesPage`, `ProfilePage`.
- **Mobile:** `AuthScreen`, `HomeScreen`, `PronosticosScreen`, `PosicionesScreen`, `FixtureScreen`, `ConfiguracionScreen`.

### 19.3 Component inventory (high-level)
- **Web layout/ui:** `AppShell`, `BottomNav`, `GlobalGroupSelector`, `TopHeader`, `BottomSheet`, `ConfirmDialog`, `ToastProvider`, `SkeletonBlock`.
- **Web domain UI:** `HomeScreen` and related selectors, `MatchCard`, `PredictionStepper`, `LeaderboardTable`, `FixtureDateCard`.
- **Mobile layout/ui:** `ScreenFrame`, `HeaderGroupSelector`, `DataModeBadge`, `LoadingState`, `EmptyState`, `ErrorState`, `TeamCrest`, `BrandBadgeIcon`, `GroupSelector`, `FechaSelector`.

### 19.4 Important constants/enums
- `SCORE_RULES`: exact `3`, outcome `1`, miss `0` (`packages/domain`).
- `MAX_PREDICTION_GOALS`: `99` in shared domain input helper.
- Web prediction route clamping range: `0..20`.
- Match status ordering: `live` -> `upcoming` -> `final`.
- Membership roles: `owner`, `admin`, `member`.
- Competition stages: `apertura`, `clausura`, `general`.

### 19.5 Feature flags and config toggles found
- **Web env:**
  - `POCKETBASE_URL` / `PB_URL` / `NEXT_PUBLIC_PB_URL`
  - `SESSION_SECRET`
  - `API_FOOTBALL_*` (base url, key, paths, allowed leagues, default season)
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_ENABLE_PAGE_BENCHMARK`
  - `HEALTHCHECK_TOKEN`
  - optional global enrollment: `FULBITO_GLOBAL_GROUP_ID`, `FULBITO_GLOBAL_GROUP_INVITE`
- **Mobile env:**
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_ENABLE_MOCK_FALLBACK`

### 19.6 Glossary
- **Fecha:** competition round/period selection used to scope fixtures and predictions.
- **Group membership:** user-role relationship to a prediction group.
- **Exacto / Resultado / NA:** exact score hit / outcome hit / miss.
- **Fallback mode (mobile):** repository behavior that switches from HTTP adapters to mock repositories when enabled and HTTP fails.

### 19.7 Observability summary tags used in this document
- **Observed:** directly in code/tests.
- **Inferred:** deduced from code composition.
- **Unclear / Needs Confirmation:** ambiguous or product-intent not fully explicit.
