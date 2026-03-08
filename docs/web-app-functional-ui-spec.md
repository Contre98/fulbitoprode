# Fulbito Prode — Web App Functional & UI Specification

## 1. Document Purpose
- This document is a functional + UX specification reconstructed from the **implemented web code**.
- Intended audiences:
  - New engineers onboarding to architecture and behavior.
  - Designers understanding concrete interaction patterns and UI states.
  - QA writing scenario-based and edge-case test plans.
  - Product managers documenting current system behavior.
  - AI agents needing an implementation-grounded system model.
- Scope:
  - Covers only the **web application** in `apps/web`.
  - Includes pages/routes, UI shell, components, API endpoints consumed by web UI, state transitions, and inferred business rules.
- Canonical source note:
  - **Observed:** The web app is the canonical source for this specification.
  - **Observed:** A mobile app exists in the monorepo (`apps/mobile`) but is intentionally excluded.
  - **Rule applied:** Mobile code, screens, flows, and components were not used as behavior source-of-truth for this document.

## 2. Source of Truth and Analysis Method
### 2.1 Code Areas Inspected
- `apps/web/src/app`:
  - Route pages and route clients (`/`, `/auth`, `/pronosticos`, `/posiciones`, `/fixture`, `/configuracion`, `/configuracion/ajustes`, `/configuracion/perfil`, `/perfil`).
  - API routes under `/api/*`.
  - Global app shell files (`layout.tsx`, `globals.css`, `loading.tsx`).
- `apps/web/src/components`:
  - Active layout/UI components and route-level composition components.
  - Also inventoried reusable components that are present but currently not mounted by active pages.
- `apps/web/src/lib`:
  - Auth/session/theme systems.
  - Provider integration (`liga-live-provider`).
  - PocketBase repository (`m3-repo`).
  - Utility modules (`rate-limit`, `design-tokens`, `prediction-store`, etc.).
- `apps/web/src/test`:
  - API and UI tests used to validate intended behavior and edge handling.
- Shared domain packages:
  - `packages/domain` (scoring/input/date utilities).
  - `packages/api-contracts` (repository contract model).

### 2.2 How Conclusions Were Derived
- **Observed** items are direct from source code (components, handlers, constants, tests, literal strings).
- **Inferred** items are derived from code composition (e.g., route guards + API return shapes + UI rendering).
- **Assumption** items are explicitly marked where the code is ambiguous, placeholder-like, or incomplete.

### 2.3 Confidence Notes
- High confidence on:
  - Route availability, navigation model, API contracts used by UI, component states, validation logic coded in UI/API, role checks in backend routes, error handling branches.
- Medium confidence on:
  - Exact provider data shapes for all external league variants (depends on runtime API-Football payloads).
  - Some visual intent details where components exist but are not mounted.
- Lower confidence / assumptions:
  - Unwired buttons that appear intentionally placeholder (notifications, forgot password, change photo, etc.).
  - Hard-coded/statically displayed values that may be temporary product placeholders.

### 2.4 Observed vs Inferred vs Assumption Legend
- **Observed:** Directly implemented and verifiable in current web source.
- **Inferred:** Logical consequence of multiple observed implementations.
- **Assumption:** Not explicitly guaranteed by code; included for completeness and flagged.

## 3. High-Level Product Overview
### 3.1 What the App Appears to Do
- **Observed:** Fulbito Prode is a social football prediction app where users:
  - Authenticate (email/password).
  - Join/create groups.
  - Select active group and competition period (“Fecha”).
  - Submit per-match score predictions for upcoming fixtures.
  - View live/upcoming/final fixtures.
  - Track leaderboard standings and group stats.
  - Manage profile data and group membership/admin actions.

### 3.2 Primary User Goals
- Join a group and participate in prediction rounds.
- Submit/edit predictions before match kickoff lock.
- Track outcomes and points versus peers in a group.
- Monitor fixture schedule and live match status.
- Manage group roster/invites if user has admin/owner rights.

### 3.3 Main Product Areas
- Authentication (`/auth` + auth API).
- Home dashboard (`/`) with summary + upcoming/live match cards.
- Predictions (`/pronosticos`) with draft/edit/save workflow.
- Leaderboard (`/posiciones`) with positions and stats insights.
- Fixture (`/fixture`) date-based fixture board with filters.
- Group management (`/configuracion`) including create/join/invite/member administration.
- Account/settings/profile (`/configuracion/ajustes`, `/configuracion/perfil`, `/perfil`).

### 3.4 Core Workflows
- Auth flow: login/register -> session cookie -> auth context refresh -> redirect to predictions.
- Group flow: create group or join by invite code/token -> select active group -> group-specific data across pages.
- Prediction flow: select group + fecha -> edit upcoming match predictions -> save changed predictions -> success/partial/failure feedback.
- Ranking flow: select group + mode/period -> view rows -> inspect stats insights in stats mode.
- Group admin flow: open group management modal -> copy/share invite -> promote member / remove member -> leave/delete group with confirmation.

## 4. Application Architecture (Functional / Frontend Organization)
### 4.1 Overall App Structure
- Framework: Next.js App Router (`next@15`, React 19).
- Shell model:
  - Root providers in `layout.tsx`: `ThemeProvider`, `AuthSessionProvider`, `ToastProvider`.
  - Most authenticated pages use `AppShell`, which wraps content and persistent `BottomNav`.
- Visual container:
  - App constrained to max width `469px` centered, mobile-first viewport styling.

### 4.2 Routing / Pages
- Web routes:
  - `/auth` (public auth form)
  - `/` (Inicio)
  - `/pronosticos`
  - `/posiciones`
  - `/fixture`
  - `/configuracion`
  - `/configuracion/ajustes`
  - `/configuracion/perfil`
  - `/perfil`
- Global loading route:
  - `src/app/loading.tsx` renders skeleton placeholders.

### 4.3 Server-side vs Client-side Auth Guarding
- **Observed:** Some pages enforce auth server-side with `requireServerAuth()` before render:
  - `/`, `/fixture`, `/configuracion`, `/configuracion/ajustes`, `/configuracion/perfil`, `/perfil`.
- **Observed:** Some pages guard client-side via `useAuthSession` and redirect:
  - `/pronosticos`, `/posiciones`, `/auth` (redirect after successful auth only).
- **Inferred:** Mixed guard strategy likely from iterative development; functionally still protected because API also checks session.

### 4.4 Feature / Module Organization
- `components/home/*` for Inicio composition.
- Route-local large clients for `pronosticos`, `posiciones`, `fixture`, `configuracion`, `perfil`.
- Shared UI utilities in `components/ui/*`.
- Shared layout primitives in `components/layout/*`.

### 4.5 State Management
- No Redux/Zustand; state is React local state + context.
- Global contexts:
  - `AuthSessionProvider`:
    - Fetches `/api/auth/me`.
    - Stores `user`, `memberships`, `activeGroupId`.
    - Persists `activeGroupId` to `localStorage` (`fulbito.activeGroupId`).
  - `ThemeProvider`:
    - `dark|light` theme state.
    - Persists to `localStorage` (`fulbito.theme`).
    - Updates `document.documentElement.dataset.theme`.
  - `ToastProvider`:
    - In-memory toast list with timed dismissal.
- Page-level in-memory caches:
  - Home, fixture, predictions, positions pages keep per-group/per-period response maps in `useRef(Map)` to reduce refetches.

### 4.6 Data Flow
- UI page performs fetch to Next API route.
- API route validates session from cookie (`fulbito_session`), validates inputs/permissions, calls repository/provider.
- Data sources:
  - PocketBase (`m3-repo`) for users/groups/memberships/predictions/invites.
  - API-Football provider (`liga-live-provider`) for leagues/rounds/fixtures/standings.
- API returns transformed payload tailored to UI models in `src/lib/types.ts`.

### 4.7 Services / API Layer (Web-Facing Endpoints)
- Auth:
  - `POST /api/auth/login-password`
  - `POST /api/auth/register-password`
  - `POST /api/auth/logout`
  - `GET/PATCH /api/auth/me`
- Data views:
  - `GET /api/home`
  - `GET/POST /api/pronosticos`
  - `GET /api/leaderboard`
  - `GET /api/fixture`
  - `GET /api/profile`
  - `GET /api/leagues`
  - `GET /api/fechas`
- Group management:
  - `GET/POST /api/groups`
  - `POST /api/groups/join`
  - `POST /api/groups/leave`
  - `PATCH/DELETE /api/groups/[groupId]`
  - `GET/PATCH/DELETE /api/groups/[groupId]/members`
  - `GET /api/groups/[groupId]/invite`
  - `POST /api/groups/[groupId]/invite/refresh`
- Health:
  - `GET /api/health/pocketbase`
  - `GET /api/health/provider`

### 4.8 Config / Constants / Theme
- CSS variables in `globals.css` define dark/light palette and semantic tokens.
- `design-tokens.ts` maps component-friendly token names.
- Scoring constants from shared domain package:
  - Exact = 3, outcome = 1, miss = 0.
- Rate limiting uses in-memory buckets (`rate-limit.ts`) for auth + prediction writes.

## 5. Information Architecture and Navigation
### 5.1 Navigation Model
- Primary navigation (persistent bottom bar in `AppShell`):
  - Inicio (`/`)
  - Posiciones (`/posiciones`)
  - Pronósticos (`/pronosticos`)
  - Fixture (`/fixture`)
  - Grupos (`/configuracion`)
- **Observed:** Bottom nav is present on all `AppShell` pages, including subpages where `activeTab` is `null` (`/perfil`, `/configuracion/ajustes`, `/configuracion/perfil`); in those cases no tab is highlighted.
- **Observed:** `/auth` does not use `AppShell`, so no bottom nav is shown.

### 5.2 Header-Level Navigation Patterns
- Most main pages (`/`, `/pronosticos`, `/posiciones`, `/fixture`, `/configuracion`, `/perfil`, `/configuracion/ajustes`) have a top header with:
  - Brand mark.
  - Theme toggle.
  - Notification icon (visual only).
  - Settings/profile quick access.
- `/configuracion/perfil` uses reusable `TopHeader` and explicit back link to `/configuracion/ajustes`.

### 5.3 Group Selection as Cross-Cutting IA
- Group is a first-class scope for data in home/predictions/positions/fixture/configuration.
- Group selector appears as:
  - Select-like control (custom modal) in main group-scoped pages.
  - Group cards in Home + Group list in Configuración.
- Selection source:
  - `AuthSession.activeGroupId` + membership list.
  - Persisted in localStorage.

### 5.4 Period (“Fecha”) Navigation
- Period browsing appears in predictions, positions (for `posiciones` mode), fixture.
- Pattern:
  - Left/right arrow controls cycle period index (wrap-around with modulo logic).
  - Label shows current fecha or fallback text.

### 5.5 Tab Systems Inside Pages
- Pronósticos: `Por Jugar` vs `Jugados`.
- Posiciones: `POSICIONES` vs `STATS`.
- Perfil page: `Perfil` vs “Actividad del perfil” compact mode.
- Configuración form: `Crear Grupo` vs `Unirse`.

### 5.6 Route Hierarchy (Functional)
- Public entry:
  - `/auth`
- Authenticated main areas:
  - `/` (overview dashboard)
  - `/pronosticos` (prediction management)
  - `/posiciones` (ranking + stats)
  - `/fixture` (calendar/fixture)
  - `/configuracion` (group management)
- Account/settings subroutes:
  - `/configuracion/ajustes`
  - `/configuracion/perfil` (legacy profile settings route; still active route)
  - `/perfil` (main profile experience)

### 5.7 How Users Move Through the App
- Typical path:
  - `/auth` -> `/pronosticos` after login/signup success.
  - Bottom nav for area switching.
  - Header shortcuts to settings/profile.
  - Within each area: group switch -> period switch -> feature-specific actions.

## 6. Global UI Shell and Cross-App Patterns
### 6.1 Global Layout
- `AppShell`:
  - Fixed viewport height (`h-dvh`), centered max-width container (`469px`).
  - Optional top glow effect (`showTopGlow` prop).
  - Animated route transitions with `framer-motion` unless reduced-motion.
  - Scrollable main area with bottom padding for nav + safe area.

### 6.2 Persistent UI Regions
- Persistent bottom navigation in `AppShell`.
- Sticky top header on most pages.
- Global toast stack top-center overlay within app width.

### 6.3 Shared Controls
- Theme toggle: always toggles light/dark and persists preference.
- Notification icon: consistent visual, no implemented action handler.
- Profile badge shortcut: navigates to `/perfil` (or current profile route depending page).

### 6.4 Toasts / Alerts
- Toast tones:
  - `success`
  - `error`
  - `info`
- Auto-dismiss default: 2600ms.
- Manual dismiss via close button.
- Used for:
  - Load failures.
  - Mutation success/failure.
  - Placeholder “Próximamente” notices.
  - Partial-save feedback.

### 6.5 Modals / Sheets / Overlays
- Pattern: bottom-sheet style modal with backdrop and close affordances.
- Variants:
  - Group selectors.
  - Prediction editor modal (`/pronosticos`).
  - Group management modal (`/configuracion`).
  - Confirm dialog (`ConfirmDialog` built on `BottomSheet`).
- Escape key close only in reusable `BottomSheet` component.

### 6.6 Global Search
- **Observed:** No global search feature implemented.

### 6.7 Loading Behavior
- App-level loading page (`src/app/loading.tsx`) with skeleton blocks.
- Page-level skeletons:
  - Home cards.
  - Pronósticos list.
  - Posiciones list/stats blocks.
  - Fixture cards.
  - Perfil activity/stats blocks.
- Many pages keep stale cached data and avoid spinner if cache hit.

### 6.8 Error Handling Patterns
- API errors often surfaced in two channels:
  - Toast (ephemeral).
  - Inline card/message (persistent until next action).
- API routes return clear status codes with JSON `{ error }` payload.
- Some routes translate backend generic errors to human-readable hints.

### 6.9 Empty States
- No memberships/group:
  - Home, pronósticos, posiciones, fixture show CTA to `/configuracion`.
- No rows for current filters:
  - Home: “No hay partidos para este filtro...”
  - Pronósticos tabs: no upcoming/history messages.
  - Fixture: “No hay partidos disponibles para este filtro.”
- No leaderboard groups:
  - API returns empty rows with label “Sin grupo activo”.

### 6.10 Permission/Auth Gating
- Session cookie required for almost all APIs.
- Unauthorized API calls return `401`.
- Group scoped APIs enforce membership/role and may return `403`.
- Health provider endpoint requires either:
  - Matching health token header, or
  - Authenticated admin/owner membership.

### 6.11 Responsive Behavior (Web)
- **Observed:** Mobile-first fixed canvas style optimized for narrow width (`max-w-[469px]`).
- **Inferred:** Designed as a “mobile-web app shell” rendered on desktop center column.
- Scrollbars hidden in many containers via `.no-scrollbar`.

### 6.12 Accessibility Patterns (Inferable)
- Positive:
  - Many icon-only controls include `aria-label`.
  - Focus-visible outline styling globally configured.
  - Dialog overlays use `role="dialog"` and `aria-modal` in several places.
- Gaps:
  - Some custom overlays are not fully keyboard-managed.
  - Not all modals implement Escape handling (only `BottomSheet`-based ones).
  - Some clickable visual elements are buttons without explicit keyboard hints beyond defaults.

## 7. Detailed Screen-by-Screen Breakdown
### 7.1 Auth Screen
- Purpose:
  - Authenticate existing users and register new users.
- Route/path:
  - `/auth`
- How users reach it:
  - Direct navigation.
  - Redirect from protected pages when unauthenticated.
  - Redirect back here after logout.
- Layout structure:
  - Full-page centered auth card with brand icon/title and mode-specific form.
- Components on the page:
  - Brand header block.
  - Mode-specific fields (`login` vs `signup`).
  - Submit button with loading spinner.
  - Error alert message area.
  - Footer mode-switch action.
- Data shown:
  - No server-prefill; entirely local form state.
- Available actions:
  - Switch mode between login/signup.
  - Fill fields.
  - Submit form.
  - Click “¿Olvidaste tu contraseña?” (no action implemented).
- States:
  - Loading submit state: button disabled + spinner icon.
  - Field-level validation errors.
  - Submission-level error message (`message` state).
- Conditional rendering rules:
  - Name field shown only in signup mode.
  - Forgot-password text button shown only in login mode.
  - Password min-length validation only in signup mode.
- User flows:
  - Login:
    1. User enters email/password.
    2. Client validates non-empty + email format.
    3. `POST /api/auth/login-password`.
    4. On success: `refresh()` auth context then `router.replace('/pronosticos')`.
    5. On failure: inline message from server error.
  - Signup:
    1. User enters name/email/password.
    2. Client validates name required, email format, password >= 8 chars.
    3. `POST /api/auth/register-password`.
    4. Same success redirect path as login.
- Edge cases:
  - Server can return localized or backend error text; UI displays raw `error` string.
  - Empty/invalid fields blocked client-side before request.
- Dependencies:
  - `useAuthSession.refresh`.
  - Auth API routes + session cookie creation.
- Notes / assumptions:
  - **Observed:** Forgot-password action has no handler.
  - **Assumption:** Future password-recovery flow planned.

### 7.2 Inicio (Home)
- Purpose:
  - Show active-group summary + upcoming/live match board + quick high-level metrics.
- Route/path:
  - `/`
- How users reach it:
  - Bottom nav “Inicio”.
- Layout structure:
  - Sticky header.
  - Horizontal group cards.
  - 3 compact summary stat cards.
  - Match filter tabs + match feed cards.
- Components on the page:
  - `HomeTopHeader` (inline component).
  - Group card carousel-like horizontal buttons.
  - Summary stat cards (`RANKING`, `PENDIENTES`, `EN VIVO`).
  - Filter tabs: `Todos`, `En vivo`, `Próximos`.
  - Match cards with home/away crest blocks, center status panel, stadium row.
- Data shown:
  - `/api/home?groupId=` returns `groupCards`, `liveCards`, optional `summary`.
  - `liveCards` converted to flattened `HomeMatch[]` with sorting by status and kickoff.
- Available actions:
  - Toggle theme.
  - Open settings/profile.
  - Change active group (click group card).
  - Change match filter tab.
- States:
  - Loading skeleton list for match area.
  - Error inline message + toast on fetch failure.
  - Empty state when no memberships.
  - Empty-filter state when no matches for selected filter.
- Conditional rendering rules:
  - Membership-dependent sections hidden when `memberships.length===0`.
  - Pulse animation for live count > 0.
- User flows:
  - Group switch triggers refetch (or in-memory cache hit) for home payload.
  - Filter switch only re-filters local transformed list (no network).
- Edge cases:
  - Missing team logo falls back to initials badge style.
  - Unknown kickoff date/time uses fallback labels (`HOY`, `--:--`).
- Dependencies:
  - Auth context active group.
  - `api/home` and provider-backed fixture data.

### 7.3 Pronósticos
- Purpose:
  - Main prediction editing and submission workflow per group + fecha.
- Route/path:
  - `/pronosticos`
- How users reach it:
  - Post-auth redirect target.
  - Bottom nav “Pronósticos”.
- Layout structure:
  - Sticky branded header.
  - Group selector card.
  - Fecha navigator (left/right).
  - Completion progress strip + tab switch (`Por Jugar` / `Jugados`).
  - List of match cards according to tab.
  - Floating pending-changes save bar appears when edits differ from committed state.
  - Modal editor for per-match prediction values.
- Components on the page:
  - Inline `GroupSelectorModal`.
  - Inline match rows (custom, not reusable `MatchCard`).
  - Inline prediction editor modal with increment/decrement controls.
  - Pending changes sticky footer.
- Data shown:
  - Fechas from `/api/fechas` using active selection league/season/stage.
  - Match + prediction payload from `/api/pronosticos?period=&groupId=`.
- Available actions:
  - Change active group via modal.
  - Cycle fecha left/right.
  - Toggle list tab.
  - Open match prediction editor.
  - Increment/decrement local/visitor goals in modal.
  - Confirm/cancel prediction draft.
  - Retry period load on error.
  - Save all pending changes.
- Immediate state behavior after interactions:
  - Changing modal score updates `editorDraft` only.
  - Confirming modal writes to `draftPredictions` (not server yet).
  - Save bar appears if any upcoming match draft != committed.
  - Save-all iterates changed matches sequentially with per-match status.
- Backend/data effects:
  - Save-all triggers repeated `POST /api/pronosticos` calls.
  - On each success, route cache and committed state updated for that match.
- Success outcomes:
  - All saved: success toast `Pronósticos guardados`.
  - Partial save: info toast `Guardado parcial` with counts.
- Failure outcomes:
  - Match-level save error message under card.
  - Save status set to `error` for failed match.
  - Transient status retry once for statuses `408`, `409`, `429`, `>=500`.
- States:
  - Page loading skeletons.
  - Refreshing period label (`Actualizando...`).
  - No memberships CTA.
  - Empty matches for fecha.
  - Empty tab lists.
  - Lock state for upcoming match (`Bloqueado`, cannot edit).
- Conditional rendering rules:
  - Upcoming cards include editable prediction box.
  - History cards show final/live score block.
  - Floating save footer shown only when `hasPendingChanges`.
- User flows:
  - Standard save flow:
    1. Pick group/fecha.
    2. Edit multiple match drafts.
    3. Tap `Guardar cambios`.
    4. Inspect partial/full result feedback.
  - Lock conflict flow:
    1. User edits old draft.
    2. Save returns `409` (window closed).
    3. Per-card error appears; pending changes remain.
- Edge cases:
  - Completion summary uses `total = Math.max(15, matches.length)` (non-intuitive denominator floor).
  - Deadline text derived from nearest upcoming deadline; if none -> `Sin cierre`.
- Dependencies:
  - Auth session + active group.
  - Fechas API and pronósticos API.
  - Toast provider.
- Notes / assumptions:
  - **Observed:** `PredictionStepper` reusable component exists but this page uses custom modal controls.
  - **Inferred:** Current UX intentionally favors single-match modal editing over inline steppers.

### 7.4 Posiciones
- Purpose:
  - Display ranking table and group performance insights/stat awards.
- Route/path:
  - `/posiciones`
- How users reach it:
  - Bottom nav “Posiciones”.
- Layout structure:
  - Sticky header.
  - Group selector card.
  - Mode switch (`POSICIONES` / `STATS`).
  - In posiciones mode: period navigator + table.
  - In stats mode: KPI cards + “Premios y Castigos” accordions + “Rendimiento General”.
- Components on the page:
  - Inline `GroupSelectorModal`.
  - Positions table rows.
  - Stats award accordion cards.
- Data shown:
  - Fechas from `/api/fechas` (cached).
  - Leaderboard payload from `/api/leaderboard` keyed by group+mode+period.
  - Additional historical snapshots fetched in stats mode using `mode=posiciones` for each historical fecha.
- Available actions:
  - Change group.
  - Switch mode.
  - Change period (only in posiciones mode).
  - Expand/collapse individual award card details.
- Immediate state behavior:
  - Mode persisted to localStorage (`fulbito.leaderboard.mode`).
  - Entering stats mode forces period index to 0 (`global`).
  - Historical snapshot loading shows skeleton placeholders.
- Backend/data effects:
  - Read-only; no mutation endpoints called.
- Success/failure outcomes:
  - On data load failure: inline error + toast.
  - On historical stats fetch complete failure: info toast and fallback to current data-derived awards.
- States:
  - No memberships CTA.
  - Loading skeleton when no rows yet.
  - Error banner at bottom.
- Conditional rendering rules:
  - Period switch hidden in stats mode.
  - Stats cards use payload `groupStats` when available, else fallback values.
- User flows:
  - Positions flow:
    1. Select group.
    2. Switch periods.
    3. Compare rows and leader highlight.
  - Stats flow:
    1. Toggle stats mode.
    2. Wait for historical snapshots.
    3. Inspect derived award winners.
- Edge cases:
  - `RANKING MUNDIAL #842` is hardcoded UI text, not API-driven.
  - Award logic can still produce winners even with sparse history by fallback snapshot handling.
- Dependencies:
  - Leaderboard API and fechas API.
  - Local state caches for leaderboard payload and snapshot series.
- Notes / assumptions:
  - **Observed:** Reusable `LeaderboardTable` component exists but this page uses bespoke rendering.
  - **Assumption:** Bespoke layout replaced earlier reusable table incrementally.

### 7.5 Fixture
- Purpose:
  - Show fixtures grouped by date and filtered by status.
- Route/path:
  - `/fixture`
- How users reach it:
  - Bottom nav “Fixture”.
- Layout structure:
  - Header.
  - Group selector card.
  - Fecha navigator with updated timestamp text.
  - Filter chip row (`Todos`, `En vivo`, `Finalizados`, `Próximos`).
  - Date-grouped fixture cards with row lines.
- Components on the page:
  - Inline group selector modal.
  - Inline `TeamLogo` and `FixtureScoreContent` helpers.
- Data shown:
  - Fechas from `/api/fechas`.
  - Fixture payload from `/api/fixture?period=&groupId=`.
- Available actions:
  - Change group.
  - Change fecha.
  - Change filter.
- States:
  - Skeleton loading.
  - No-memberships CTA.
  - Empty-filter result message.
  - Error inline banner + toast.
- Conditional rendering rules:
  - `upcoming` filter includes rows with tone `upcoming` and `warning`.
  - Live rows show live status detail; final rows show `FINAL`; upcoming rows show kickoff time.
- User flows:
  - Select group/fecha -> browse grouped matches -> narrow by filter.
- Edge cases:
  - Kickoff time parsed from label first, else `kickoffAt`, else `--:--`.
  - Update label shows “Actualizado hace instantes” for invalid/very recent timestamps.

### 7.6 Grupos (Configuración)
- Purpose:
  - Full group lifecycle and membership management.
- Route/path:
  - `/configuracion`
- How users reach it:
  - Bottom nav “Grupos”.
- Layout structure:
  - Header.
  - Form card with internal tabs (`Crear Grupo` / `Unirse`).
  - “Mis Grupos” list.
  - Group management modal (members/invites/actions).
  - Global confirm dialog for leave/delete actions.
- Components on the page:
  - Tabbed create/join form.
  - Group list cards.
  - Bottom-sheet-like management modal.
  - `ConfirmDialog` for destructive actions.
- Data shown:
  - Auth memberships list.
  - League options from `/api/leagues` for create flow.
  - Group invite from `/api/groups/[groupId]/invite` lazily.
  - Group members from `/api/groups/[groupId]/members` on modal open.
- Available actions:
  - Create group (name + selected league).
  - Join group (code/token).
  - Set active group from list.
  - Open group management modal.
  - Copy invite link / share invite.
  - Promote member to admin (if allowed).
  - Remove member (if allowed).
  - Leave group (member role UI).
  - Delete group (owner/admin UI).
- Immediate state behavior:
  - Create/join success calls `refresh()` and sets `activeGroupId` to target group.
  - Member actions update local member list state immediately on success.
  - Leave/delete clears per-group invite/member caches.
- Backend/data effects:
  - Create -> `POST /api/groups`.
  - Join -> `POST /api/groups/join`.
  - Leave -> `POST /api/groups/leave`.
  - Delete -> `DELETE /api/groups/[groupId]`.
  - Promote/remove -> `PATCH/DELETE /api/groups/[groupId]/members`.
- Success/failure outcomes:
  - All mutation flows show toasts with contextual messages.
  - Some responses include backend-specific explanations (e.g., PB rules errors).
- States:
  - Loading leagues disable competition selector.
  - Member modal loading state (`Cargando miembros...`).
  - Role-based action disable/hide.
  - Confirmation dialog processing state.
- Conditional rendering rules:
  - Owner badge shown in group card.
  - `canManageModalMembers` true for owner/admin only.
  - Member-level action permissions:
    - Admin cannot kick another admin.
    - Cannot kick self.
    - Owner role immutable in UI/API.
- User flows:
  - Invite deep-link flow:
    1. User opens `/configuracion?invite=<token>`.
    2. Join form auto-activates and pre-fills input.
    3. User submits join.
  - Group admin flow:
    1. Open modal.
    2. Fetch members.
    3. Promote or remove members.
    4. Copy/share invite.
- Edge cases:
  - Hidden read-only input with invite placeholder exists in DOM (`sr-only`) to satisfy historical UI/test constraints.
  - Native `navigator.share` used if available; falls back to clipboard text copy.
- Dependencies:
  - Groups, invites, members APIs.
  - Auth context refresh cycle.

### 7.7 Configuración > Ajustes
- Purpose:
  - Account-level toggles and utility links.
- Route/path:
  - `/configuracion/ajustes`
- How users reach it:
  - Header settings icon from multiple pages.
- Layout structure:
  - Header.
  - Settings sections: toggles, account links, support links, logout button.
- Components on the page:
  - Local switch-style toggles.
  - Link/button rows with icons and chevron.
- Data shown:
  - Uses auth session for profile badge/identity only.
- Available actions:
  - Toggle push notifications state (local only).
  - Toggle vibration state (local only).
  - Navigate to `/perfil`.
  - Trigger placeholder toasts for unavailable features.
  - Logout.
- States:
  - Logout loading state (`Cerrando...`).
- Conditional rendering rules:
  - None complex; mostly static sections.
- Notes / assumptions:
  - **Observed:** Toggle states are ephemeral local state and not persisted server-side.
  - **Assumption:** Future preference persistence is planned.

### 7.8 Configuración > Perfil (Legacy Profile Settings Route)
- Purpose:
  - Edit name/favorite team and logout from a settings-oriented profile screen.
- Route/path:
  - `/configuracion/perfil`
- How users reach it:
  - Direct URL or internal route usage; current primary profile UX is `/perfil`.
- Layout structure:
  - `TopHeader` + back link + profile summary + editable form.
- Components on the page:
  - Name input.
  - Read-only email field.
  - Favorite team input.
  - Save/logout buttons.
- Data shown:
  - Auth session user data.
- Available actions:
  - Save profile via `PATCH /api/auth/me` with `{ name, favoriteTeam }`.
  - Logout.
- States:
  - Dirty detection to enable save button.
  - Inline error box + toast on save failure.
  - Loading states for save/logout.
- Notes / assumptions:
  - **Observed:** Overlaps with `/perfil` edit modal capabilities but with slightly different fields.
  - **Inferred:** Route likely retained for backward compatibility while `/perfil` evolved.

### 7.9 Perfil
- Purpose:
  - Unified profile identity + stats + activity timeline + profile edit modal.
- Route/path:
  - `/perfil`
- How users reach it:
  - Header profile shortcuts across app.
- Layout structure:
  - Header with mode toggle (`Perfil` vs activity mode).
  - Profile hero card or compact edit-cta card depending mode.
  - 3 stats cards (`Puntos`, `Precisión`, `Grupos`).
  - Recent activity list.
  - Edit profile modal.
- Components on the page:
  - Profile hero card with avatar/logo fallback.
  - Activity list rows.
  - Edit modal with fields: name, username, email.
- Data shown:
  - `/api/profile` for computed stats + recent activity.
  - Fallback local activity built from memberships if API fails.
- Available actions:
  - Toggle between profile and compact mode.
  - Open edit modal.
  - Edit and save `name/username/email` via `PATCH /api/auth/me`.
- States:
  - Loading skeletons for stats/activity.
  - Modal save loading state.
  - Modal close by backdrop/cancel/close icon.
- Conditional rendering rules:
  - Recent activity shows points badge only when numeric points exists.
  - Empty recent activity message shown when list empty.
- Edge cases:
  - Username display normalizes to `@` prefix.
  - Fallback username inferred from email/name if missing.
- Dependencies:
  - `/api/profile`, `/api/auth/me`, auth refresh.

### 7.10 Global Loading Route
- Purpose:
  - Provide skeleton placeholder while route segments stream/load.
- Route/path:
  - `src/app/loading.tsx` (global App Router loading UI).
- Layout:
  - Vertical stack of five skeleton blocks sized like mobile cards.

### 7.11 Health Endpoints (Non-UI Screens But Operationally Relevant)
- `/api/health/pocketbase`:
  - Returns PB connectivity/config status.
- `/api/health/provider`:
  - Admin/owner or token-protected provider diagnostic including query mode and fixture count.
- **Inferred:** Used operationally; optional future admin UI hook possible.

## 8. Component Inventory and Behavior
### 8.1 AppShell (`components/layout/AppShell.tsx`)
- Purpose:
  - Standard page container with animated route transition + persistent bottom nav.
- Where it appears:
  - All authenticated screens except `/auth`.
- Visual structure:
  - Full-height wrapper, centered `max-w-[469px]` canvas, optional top glow.
- Inputs/props:
  - `activeTab: AppTab | null`
  - `children`
  - `showTopGlow?: boolean`
- Variants:
  - `showTopGlow` true/false.
  - `activeTab` determines bottom-nav highlight.
- States:
  - Motion disabled if reduced-motion.
- Side effects:
  - Uses `usePathname` keying to animate route transitions.

### 8.2 BottomNav (`components/layout/BottomNav.tsx`)
- Purpose:
  - Primary IA navigation.
- Where it appears:
  - Inside `AppShell`.
- Visual structure:
  - Five icon+label links.
- Inputs:
  - `activeTab`.
- Interaction:
  - Link navigation to primary routes.
- Accessibility:
  - `aria-label="Navegación principal"` on nav.

### 8.3 ToastProvider + useToast (`components/ui/ToastProvider.tsx`)
- Purpose:
  - Global non-blocking feedback.
- Where it appears:
  - Root layout wraps app.
- Inputs/props (toast API):
  - `title`, optional `description`, `tone`, optional `durationMs`.
- Variants:
  - `success`, `error`, `info` tone icon/border styles.
- States:
  - Toast queue in state; auto-dismiss timers.
- Events/interactions:
  - Manual close button per toast.
- Accessibility:
  - `role="status"`, `aria-live="polite"`.

### 8.4 SkeletonBlock (`components/ui/SkeletonBlock.tsx`)
- Purpose:
  - Reusable loading placeholder.
- Where it appears:
  - Global loading and page-level skeleton states.
- Inputs:
  - `className` for shape/size.

### 8.5 BottomSheet (`components/ui/BottomSheet.tsx`)
- Purpose:
  - Generic modal sheet component.
- Where it appears:
  - Used by `ConfirmDialog`; other pages implement custom modal markup directly.
- Inputs:
  - `open`, `onClose`, optional `title`, `children`, optional `footer`, `maxWidth`.
- Behavior:
  - Returns `null` when closed.
  - Backdrop click closes.
  - Escape key closes when open.

### 8.6 ConfirmDialog (`components/ui/ConfirmDialog.tsx`)
- Purpose:
  - Confirmation UI for destructive/important actions.
- Where it appears:
  - `/configuracion` leave/delete group confirmation.
- Inputs:
  - `open`, `title`, `description`, `confirmLabel`, `cancelLabel`, `tone`, `loading`, callbacks.
- Variants:
  - `danger` tone uses red confirm button and warning icon.
- States:
  - `loading` disables controls and changes confirm text to `Procesando...`.

### 8.7 Home Screen Composition (`components/home/HomeScreen.tsx`)
- Purpose:
  - Implements entire Inicio screen.
- Key sub-elements:
  - `HomeTopHeader` (inline)
  - Group summary cards
  - Summary mini-cards
  - Filter tabs
  - Match cards with `TeamMark`
- State/inputs:
  - Fetches and caches `HomePayload` per group.
  - Local filter state.
- Notable behaviors:
  - Converts fixture cards to normalized home-match cards and sorts status-aware.

### 8.8 Group Selector Modals (Inline Variants)
- Purpose:
  - Group context switchers.
- Where:
  - Pronósticos, Posiciones, Fixture pages.
- Common behavior:
  - Backdrop + bottom sheet + active row highlight + selection callback.
- Differences:
  - Posiciones supports embedded logo from data URL.
  - Pronósticos and Fixture use initials-style fallback.

### 8.9 Predictions Match Row (Pronósticos inline card)
- Purpose:
  - Display upcoming match prediction box and save-state feedback.
- Inputs:
  - Match data + draft/committed + save status/error maps.
- States:
  - Normal, changed/highlighted, locked, saving, error.
- Interaction:
  - Tapping center prediction box opens modal editor.

### 8.10 Prediction Editor Modal (Pronósticos inline)
- Purpose:
  - Controlled edit of one match prediction.
- Inputs:
  - `selectedMatch`, `editorDraft`.
- Interaction:
  - Increment/decrement local and away values in [0..20].
  - Cancel closes without writing draft.
  - Confirm applies draft to local draft map.

### 8.11 Pending Save Footer (Pronósticos inline)
- Purpose:
  - Surface unsaved prediction changes + action to persist all.
- Visibility:
  - Only when draft differs from committed for at least one upcoming match.
- Content:
  - Pending count summary + warning + save button.

### 8.12 Positions Table (Posiciones inline)
- Purpose:
  - Render rank rows with highlighted leader.
- Inputs:
  - `payload.rows`.
- States:
  - Loading skeleton fallback.
- Behavior:
  - Leader row visually accentuated and star icon shown.

### 8.13 Stats Awards Accordion (Posiciones inline)
- Purpose:
  - Show computed “Premios y Castigos” winners.
- Inputs:
  - Derived `statsAwards` array from current rows + historical snapshots.
- Interaction:
  - Expand/collapse each award details text.

### 8.14 Fixture Card Rows (Fixture inline)
- Purpose:
  - Show date-grouped fixtures with status-dependent center content.
- Components:
  - `TeamLogo` fallback icon/initial.
  - `FixtureScoreContent` live/final/upcoming variant rendering.

### 8.15 Group Management Modal (Configuración inline)
- Purpose:
  - Manage selected group (invites, members, destructive actions).
- Inputs:
  - Modal membership record + loaded members + role checks.
- States:
  - Loading members / loaded / empty.
  - Action busy for specific member action keys.
- Interactions:
  - Copy/share invite.
  - Promote member.
  - Remove member.
  - Trigger leave/delete confirm.

### 8.16 Settings Toggles (Configuración/Ajustes inline)
- Purpose:
  - Local toggle controls for notification/vibration preferences.
- States:
  - On/off visual knob transitions.
- Side effects:
  - No server persistence.

### 8.17 Profile Edit Modal (`/perfil` inline)
- Purpose:
  - Edit identity fields (name, username, email).
- Inputs:
  - Local form state prefilled from auth user.
- Events:
  - Save -> PATCH auth/me -> refresh auth context.

### 8.18 TopHeader (`components/layout/TopHeader.tsx`)
- Purpose:
  - Reusable sticky top header variant.
- Where appears:
  - `/configuracion/perfil`.
- Behavior:
  - Default right-slot controls theme/notifications/profile unless overridden.

### 8.19 FixtureDateCard (`components/fixture/FixtureDateCard.tsx`)
- Purpose:
  - Reusable fixture date card with optional row click.
- Where appears:
  - Present in codebase, not mounted by current route composition.
- Behaviors:
  - Supports non-interactive and interactive row variants.

### 8.20 MatchCard + PredictionStepper + LeaderboardTable (Reusable, Currently Not Mounted)
- Purpose:
  - Generic reusable versions of key UI sections.
- Where appears:
  - Component files + tests, but no current route imports for rendering.
- Notes:
  - **Observed:** Production pages use custom inline implementations instead.
  - **Inferred:** Legacy or alternate UI components retained for iteration/testing.

### 8.21 Home Auxiliary Components Not Currently Mounted
- `GroupSwitcher`, `GroupCardCarousel`, `CurrentSelectionSelector`, `LeagueSelector` exist but are not imported by active route rendering.
- Likely represent earlier design iterations or future reusable options.

### 8.22 LiveDataStatusBadge (Unwired)
- Purpose:
  - Poll provider health every 60s and show `LIVE`, `FALLBACK`, or `CHECK` badge.
- Where appears:
  - Component exists but no active mount in current page tree.
- Behavior:
  - Calls `/api/health/provider` unless `NODE_ENV==='test'`.

## 9. Interaction and Event Matrix

| Trigger | Where | Preconditions | Immediate UI Response | Backend/Data Effect | Success Outcome | Failure Outcome | Edge Cases | Related Areas |
|---|---|---|---|---|---|---|---|---|
| Submit login form | `/auth` login mode | Valid email + password | Button loading spinner; disabled submit | `POST /api/auth/login-password` | Session cookie set, auth refresh, redirect `/pronosticos` | Inline error banner text | Rate-limit 429 possible | Auth page + auth API |
| Submit signup form | `/auth` signup mode | Name present, valid email, password>=8 | Same loading pattern | `POST /api/auth/register-password` | Same as login | Inline error | Server can reject duplicate/invalid data | Auth page + register API |
| Toggle login/signup | `/auth` | None | Switch visible fields/text; clear errors/message | None | New mode active | N/A | Maintains field values already typed | Auth page |
| Click forgot password | `/auth` | Login mode | No visible state change | None | None | None | Placeholder only | Auth page |
| Route auth check redirect | Protected screens | `authenticated=false` after context load | Client redirect to `/auth` | None | User on auth page | N/A | Some routes also server-guarded | Most pages |
| Change active group (Home card click) | `/` | Membership exists | Card selection shifts; load or cache hydrate | `GET /api/home` when uncached | Group summary/matches refresh | Toast + inline error | Cache may show stale until manual group change | Home + auth context |
| Change Home filter | `/` | None | Match list re-filtered instantly | None | Filtered list shown | N/A | Empty-filter message shown | Home |
| Open settings | Headers | None | Navigate to `/configuracion/ajustes` | None | Settings page displayed | N/A | On pages using `router.push` vs `Link` both equivalent | Most pages |
| Open profile | Headers | None | Navigate to `/perfil` (or route-specific profile) | None | Profile page displayed | N/A | `/configuracion/perfil` exists separately | Most pages |
| Open group selector | `/pronosticos`, `/posiciones`, `/fixture` | Membership list > 0 | Bottom-sheet selector opens | None | Selectable group list visible | N/A | Backdrop closes modal | Group-scoped pages |
| Select group from selector | Same | Valid group id | Modal closes and active selection changes | Subsequent data fetches by page | New group data shown | Inline/toast errors if fetch fails | Local cache may short-circuit network | Pronósticos/Posiciones/Fixture |
| Navigate previous/next fecha | Pronósticos/Posiciones/Fixture | Period list available | Index wraps cyclically; label updates | Data fetch for new period/mode (if uncached) | New period data shown | Error + retry path | Wrap-around at ends | Period-scoped pages |
| Toggle pronósticos tab | `/pronosticos` | None | Switch between `Por Jugar` and `Jugados` lists | None | Correct subset displayed | N/A | Empty tab message if no matches | Pronósticos |
| Open prediction editor | `/pronosticos` upcoming row | Match not locked and not savingAll | Bottom-sheet editor opens with current draft | None | Editor visible | None | Locked match disables action | Pronósticos |
| Increment/decrement editor value | Prediction editor | Modal open | Score value changes in editor | None | New draft visible | N/A | Clamped to 0..20 | Pronósticos |
| Confirm prediction editor | Prediction editor | Modal open | Modal closes, row draft updates | None (local draft only) | Save bar may appear | N/A | Does not auto-save to backend | Pronósticos |
| Cancel prediction editor | Prediction editor | Not `savingAll` | Modal closes, no draft write | None | Return to list | N/A | Backdrop click uses same close logic | Pronósticos |
| Save all changes | Pronósticos footer | Pending changed matches exist | Footer button disabled while saving | Sequential `POST /api/pronosticos` per changed match | Toast success or partial info, committed state update | Per-match errors + partial toast or all-error toast | Retries transient HTTP status once | Pronósticos + pronósticos API |
| Retry pronósticos load | Pronósticos error panel | Active group+period | Sets refreshing state and bumps nonce | Forces refetch by cache invalidation | Data refreshed | Error persists with toast | Only current group+period cache entry deleted | Pronósticos |
| Switch posiciones/stats mode | `/posiciones` | Membership exists | Mode button highlight changes | `GET /api/leaderboard` with mode | Mode-specific panel shown | Toast + inline error on fail | Mode persisted in localStorage | Posiciones |
| Expand/collapse award | Posiciones stats | Stats mode | Chevron rotates + detail text toggles | None | Award detail visible/hidden | N/A | Only one expanded at a time by id state | Posiciones |
| Load stats historical snapshots | Posiciones stats mode auto effect | Active selection + historical periods | Stats insights skeleton while loading | Multiple `GET /api/leaderboard?mode=posiciones&period=...` | Awards use historical context | Info toast if all snapshots fail | Partial failures replaced by empty snapshot | Posiciones |
| Change fixture filter | `/fixture` | Data loaded | Local filtered card set updates | None | Matching rows/date-cards shown | N/A | Upcoming filter includes warning tone | Fixture |
| Open group settings modal | `/configuracion` group card | User in at least one group | Modal opens and triggers member load | `GET /api/groups/[id]/members` | Member list visible | Toast on failure | Modal auto-closes if group removed from memberships | Configuración |
| Create group | `/configuracion` create tab | Name + selected league present | Button busy/disabled | `POST /api/groups` then auth refresh | Toast success, group appears and becomes active | Error toast | League list might be empty if `/api/leagues` failed | Configuración + groups API |
| Join group | `/configuracion` join tab | Code/token non-empty | Button busy/disabled | `POST /api/groups/join` then auth refresh | Toast success, active group set | Error toast | Query param `invite` pre-fills input | Configuración |
| Copy invite link | Group modal | Manage permission + active invite | Immediate toast | `GET /invite` lazy when needed; clipboard write | Link copied toast | Error toast | Browser clipboard permission failures possible | Configuración |
| Share invite | Group modal | Manage permission + active invite | Immediate share sheet or clipboard fallback | `GET /invite` lazy | Native share success toast or copy success toast | Error toast | `navigator.share` optional | Configuración |
| Promote member to admin | Group modal member row | Role permission allows | Action button busy | `PATCH /members` | Local member role updated + toast | Error toast | Cannot promote self; server also validates | Configuración |
| Kick member | Group modal member row | Role permission allows | Action button busy | `DELETE /members` | Member removed from list + toast | Error toast | Cannot kick owner, self, or peer-admin (if admin actor) | Configuración |
| Leave group confirm | Group modal + confirm dialog | Pending action set | Confirm dialog loading state | `POST /api/groups/leave` | Membership refreshed, modal closes, toast | Error toast | If sole owner may delete group instead | Configuración |
| Delete group confirm | Group modal + confirm dialog | Owner/admin or solo member | Confirm loading state | `DELETE /api/groups/[id]` | Group deactivated/removed + toast | Error toast | Response may include `warningRequired` | Configuración |
| Toggle push/vibration | `/configuracion/ajustes` | None | Toggle knob changes | None | Local UI reflects state | N/A | Not persisted | Ajustes |
| Click unavailable settings/support items | `/configuracion/ajustes` | None | Info toast “Próximamente” | None | User informed feature pending | N/A | Placeholder actions only | Ajustes |
| Logout | `/configuracion/ajustes` or `/configuracion/perfil` | Authenticated | Button text changes to closing state | `POST /api/auth/logout` + auth refresh | Redirect `/auth` | Error toast/inline | If request fails, state resets in-page | Ajustes/Config Perfil |
| Save config perfil form | `/configuracion/perfil` | Dirty form + valid server-side | Save button loading | `PATCH /api/auth/me` with name+favoriteTeam | Auth refresh + success toast | Inline + toast error | Email read-only in this route | Config Perfil |
| Toggle profile mode | `/perfil` | None | Switch between full profile hero and compact edit card | None | Alternate layout shown | N/A | Stats/activity cards remain visible | Perfil |
| Open edit profile modal | `/perfil` | None | Modal opens over backdrop | None | Editable fields visible | N/A | Includes non-functional change-photo button | Perfil |
| Save profile modal | `/perfil` modal | User edits fields | Save button loading | `PATCH /api/auth/me` with name/username/email + refresh | Modal closes with updated auth state | Save stays open until request resolves; no dedicated toast | Server validation errors bubble as status-based throw | Perfil |

## 10. Forms and Validation Rules
### 10.1 Auth Form (`/auth`)
- Purpose:
  - Login and signup with password.
- Fields:
  - Login mode:
    - `email` (type email, required)
    - `password` (type password, required)
  - Signup mode:
    - `name` (text, required)
    - `email` (required, format)
    - `password` (required, min length)
- Required vs optional:
  - As above; all visible fields required.
- Default values:
  - Empty strings.
- Validation rules:
  - Client:
    - `name.trim()` must not be empty in signup.
    - `email.trim()` must match `/^\S+@\S+\.\S+$/`.
    - `password` required.
    - Signup password length >= 8.
  - Server:
    - Login/register endpoints require email/password.
    - Register requires password length >= 8.
- Error messages (observed literal examples):
  - `Ingresá tu nombre.`
  - `Ingresá tu email.`
  - `Email inválido.`
  - `Ingresá una contraseña.`
  - `Mínimo 8 caracteres.`
  - API side examples: `Email and password are required`, `Too many login attempts. Try again later.`
- Submit behavior:
  - Calls login/register endpoint based on mode.
  - On success: refresh auth context and redirect to `/pronosticos`.
- Cancel/reset behavior:
  - Switching mode clears errors and message.
- Success/failure behavior:
  - Success redirect.
  - Failure shows inline message from backend.

### 10.2 Create Group Form (`/configuracion`, create tab)
- Purpose:
  - Create a new group scoped to selected competition.
- Fields:
  - `name` (text)
  - `selectedCompetitionKey` (select from leagues API)
- Required vs optional:
  - Both required for submit.
- Defaults:
  - `name=""`.
  - League defaults to first available competition if fetch succeeds.
- Validation:
  - Client:
    - Name non-empty.
    - Selected league present.
  - Server:
    - `name` required in route.
    - Additional repository constraints may apply.
- Error messages:
  - `Ingresá un nombre de grupo`
  - `Seleccioná una liga`
  - Backend errors from `/api/groups` forwarded to toast.
- Submit behavior:
  - `POST /api/groups` with league/season/competition fields.
  - On success: clear name, refresh memberships, set active group.

### 10.3 Join Group Form (`/configuracion`, join tab)
- Purpose:
  - Join group via invite code or token.
- Fields:
  - `codeOrToken` text input.
- Required:
  - Non-empty.
- Defaults:
  - Empty, but can be prefilled from query param `invite`.
- Validation:
  - Client non-empty.
  - Server validates invite existence/expiry/max_uses.
- Error messages:
  - `Ingresá código o token`
  - Backend examples: `Invite not found`, `Invite expired`, `Invite reached max uses`.
- Submit behavior:
  - `POST /api/groups/join`.
  - On success refresh auth and set active group.

### 10.4 Group Member Role Update Form (Implicit via buttons)
- Purpose:
  - Promote member to admin.
- Fields:
  - Implicit payload `userId`, `role='admin'`.
- Validation:
  - Server checks actor permissions and target constraints.
- Submit behavior:
  - `PATCH /api/groups/[groupId]/members`.

### 10.5 Group Member Removal Form (Implicit via buttons)
- Purpose:
  - Remove member from group.
- Fields:
  - Implicit payload `userId`.
- Validation:
  - Server prohibits self-removal via this endpoint and protects owner/admin constraints.
- Submit behavior:
  - `DELETE /api/groups/[groupId]/members`.

### 10.6 Leave/Delete Group Confirmation (`ConfirmDialog`)
- Purpose:
  - Explicit confirmation for destructive group actions.
- Fields:
  - No free text fields.
- Validation:
  - Action type + group id must exist in state.
  - Server validates role/membership and group structure.
- Submit behavior:
  - Leave: `POST /api/groups/leave`.
  - Delete: `DELETE /api/groups/[groupId]`.
- Failure behavior:
  - Toast with backend reason.

### 10.7 Configuración Perfil Form (`/configuracion/perfil`)
- Purpose:
  - Edit personal display name and favorite team.
- Fields:
  - `name` (maxLength 120)
  - `email` read-only
  - `favoriteTeam` (maxLength 120)
- Dirty logic:
  - Save enabled only when values differ from user state.
- Validation:
  - Server-side `PATCH /api/auth/me` validates name/team length.
- Error behavior:
  - Inline error panel + toast.

### 10.8 Perfil Edit Modal Form (`/perfil`)
- Purpose:
  - Edit broader identity details.
- Fields:
  - `name` (maxLength 120)
  - `username` (input displays with `@`, sends stripped)
  - `email` (maxLength 190)
- Validation:
  - Server-side in `/api/auth/me`:
    - username required if provided, <=40 chars, pattern `^[a-zA-Z0-9._-]+$`.
    - email required if provided, <=190, valid format.
    - name <=120.
- Submit behavior:
  - Save -> `PATCH /api/auth/me` -> `refresh()` -> close modal.
- Failure behavior:
  - Throw on non-OK; no dedicated inline field errors in modal.

### 10.9 Pronósticos Editing Flow as Form-like Aggregate
- Purpose:
  - Batch-save changed per-match prediction drafts.
- Fields:
  - For each upcoming match: `home`, `away` in range 0..20.
- Validation:
  - Client clamps to [0..20].
  - Server re-clamps and enforces:
    - `groupId`, `period`, `matchId` required.
    - actor must be active group member.
    - match must be upcoming and not locked.
- Submit behavior:
  - Sequential save-all with per-match status tracking.
- Failure behavior:
  - Per-match error and partial toast summarization.

## 11. States and Scenario Coverage
### 11.1 User Lifecycle States
- First-time visitor (unauthenticated):
  - **Observed:** Accessing protected pages ends in `/auth` (server redirect on server-guarded routes; client redirect on client-guarded routes).
  - **Observed:** Any API call requiring session returns `401 Unauthorized`.
- First-time authenticated user with no memberships:
  - **Observed:** `/api/auth/me` returns user + empty memberships.
  - **Observed:** Home, Pronósticos, Posiciones, Fixture render “no tenés grupos activos” empty states with CTA to `/configuracion`.
  - **Observed:** `/api/home` and `/api/profile` return valid empty payloads (not errors) with zeroed stats.
- Returning authenticated user with memberships:
  - **Observed:** `AuthSessionProvider` restores `activeGroupId` from `localStorage` (`fulbito.activeGroupId`) if still valid.
  - **Observed:** If stored group no longer exists, active group falls back to first membership.
- Returning user after role/membership changes:
  - **Observed:** `refresh()` after joins/leaves/deletes/mutations recalculates memberships and active group.
  - **Observed:** Group modal auto-closes if selected group disappears from refreshed memberships.

### 11.2 Authenticated vs Unauthenticated Scenarios
- Valid session cookie (`fulbito_session`):
  - **Observed:** `/api/auth/me` resolves user + memberships; page contexts hydrate.
- Missing/invalid/expired session cookie:
  - **Observed:** Session verification fails (`verifySessionToken`) and API returns `401`.
  - **Observed:** Protected route wrappers using `requireServerAuth()` redirect to `/auth`.
  - **Observed:** Client-guarded pages call `router.replace("/auth")` after auth context resolves unauthenticated.
- Logout:
  - **Observed:** `POST /api/auth/logout` clears session cookie (`maxAge: 0`), then `refresh()` transitions client auth state to unauthenticated and routes to `/auth`.

### 11.3 Authorization / Permissions Scenarios
| Capability | Owner | Admin | Member | Non-member |
|---|---|---|---|---|
| View group-scoped data (home/fixture/pronósticos/leaderboard) | Yes | Yes | Yes | No (`403`/selection failure) |
| Load group members list | Yes | Yes | Yes | No (`403`) |
| Promote member to admin | Yes | Yes (with constraints) | No | No |
| Demote admin/member | Yes | Admin can only demote self from admin to admin? effectively constrained | No | No |
| Remove member | Yes | Yes (cannot remove owner/admin peer) | No | No |
| Refresh invite | Yes | Yes | No | No |
| Fetch active invite | Yes | Yes | Yes | No |
| Rename group (API) | Yes | Yes | No | No |
| Delete group | Yes | Yes (if allowed by membership logic) | Only when sole active member | No |
| Leave group | Yes (special owner flow) | Yes | Yes | No active membership |
- **Observed:** API enforces permission checks even if UI suppresses controls.
- **Observed:** UI also conditionally hides/disables member-management actions when viewer is not `owner|admin`.

### 11.4 Loading, Empty, Error, Partial States by Area
| Area | Loading State | Empty State | Error State | Partial/Fallback State |
|---|---|---|---|---|
| Auth | Submit spinner | N/A | Inline message | N/A |
| Home | Skeleton match cards | No memberships / no cards in selected filter | Toast + inline message | Cached group payload used when available |
| Pronósticos | Skeleton rows + disabled period nav during refresh | No memberships / no matches in tab | Toast + inline + retry button | Partial save (some match POST fail) with per-row errors |
| Posiciones | Skeleton table/cards | No memberships / rows empty | Toast + inline message | Stats historical snapshots can partially fail and still render awards |
| Fixture | Skeleton date cards | No memberships / no cards for filter | Toast + inline message | Cached payload for previously visited `groupId:period` |
| Configuración | Button busy states for create/join/member actions | “Todavía no estás en ningún grupo” | Toast errors on each mutation | Invite load lazy; share falls back clipboard when native share unavailable |
| Ajustes | N/A (local toggles) | N/A | Toast only for logout failure | Placeholder entries intentionally show info toast |
| Perfil | Skeleton for stats/activity | Activity empty text | API profile fetch fails silently to derived fallback activity | Derived fallback from memberships when `/api/profile` fails |

### 11.5 Valid vs Invalid Form Submission Scenarios
- Auth form:
  - **Observed valid:** required fields and email format pass; request sent.
  - **Observed invalid:** client blocks submit and renders field error text.
- Create group:
  - **Observed invalid:** blank name or missing league prevents mutation and shows error toast.
- Join group:
  - **Observed invalid:** blank code/token blocked with toast.
  - **Observed invalid server-side:** expired/not-found/max-uses invite returns error toast.
- Profile edits:
  - **Observed valid:** PATCH accepted, auth refresh updates user.
  - **Observed invalid server-side:** username/email constraints return `400`.
- Pronóstico updates:
  - **Observed invalid:** missing `groupId|period|matchId` returns `400`.
  - **Observed invalid:** non-upcoming or locked match returns `400/409`.
  - **Observed valid:** values are clamped and upserted.

### 11.6 Network/API Failure Scenarios
- Auth endpoints rate-limited:
  - **Observed:** login `20/15min`, register `10/15min`; returns `429` + `Retry-After`.
- Prediction writes rate-limited:
  - **Observed:** `120/10min` per `userId + requester fingerprint`.
- Client retry behavior:
  - **Observed:** Pronósticos save retries once on transient statuses (`408`, `409`, `429`, `>=500`).
- Provider failures:
  - **Observed:** `/api/profile` catches provider round failures and returns best-effort payload.
  - **Observed:** Leaderboard route surfaces PB permission misconfiguration with dedicated `409` guidance.

### 11.7 Feature Unavailable / Stub Scenarios
- **Observed placeholders (UI-only feedback):**
  - Notification icon actions.
  - Forgot password on auth page.
  - Ajustes items: change password, help/FAQ, terms.
  - Profile modal “Cambiar foto”.
- **Observed behavior:** These trigger either no action or “Próximamente” toast; no backend mutation.

### 11.8 Disabled-Action and Locking Scenarios
- Pronósticos:
  - **Observed:** Match editor button disabled if `isLocked` or bulk save active.
  - **Observed:** Locked rows show warning chip.
- Save/submit controls:
  - **Observed:** Most action buttons disabled during in-flight requests (`creating`, `joining`, `saving`, etc.).
- Period navigation:
  - **Observed:** Disabled when no periods, and in pronósticos also during loading/refreshing.

### 11.9 Destructive / Confirmation Scenarios
- Group leave/delete:
  - **Observed:** User sets pending action -> `ConfirmDialog` appears -> confirm triggers API.
  - **Observed:** Confirm button shows `Procesando...` during request.
  - **Observed:** UI cache entries for invite/members are cleaned locally after success.

### 11.10 Session Expiry and Recovery
- **Observed:** Expired session token fails verification server-side; APIs return `401`.
- **Observed:** Auth context `refresh()` transitions to unauthenticated and drops memberships/active group state.
- **Inferred:** Any stale cached page data is effectively superseded by redirect/auth reset after refresh cycle.

## 12. Data and Domain Concepts
### 12.1 Core Entities
| Entity | Primary Source | Key Fields | Used In |
|---|---|---|---|
| User | PocketBase `users` | `id`, `email`, `name`, `username`, `favoriteTeam` | Auth, Perfil, Configuración Perfil |
| Group | PocketBase `groups` | `id`, `name`, `slug`, `leagueId`, `season`, `competitionStage` | All group-scoped screens |
| Membership | PocketBase `group_members` | `userId`, `groupId`, `role`, `status`, `joinedAt` | Group selector, permissions, profile activity |
| Group Invite | PocketBase `group_invites` | `code`, `token`, `expiresAt`, `max_uses`, `uses` | Join flow, invite share/copy |
| Prediction | PocketBase `predictions` | `fixtureId`, `groupId`, `userId`, `period`, `home_pred`, `away_pred` | Pronósticos, Home summary, Leaderboard, Profile |
| Fixture | Provider API | `id`, teams, kickoff, status, goals | Pronósticos, Fixture, Home, Leaderboard scoring |
| Fecha (period) | Provider rounds endpoint | `id`, display label | Pronósticos/Posiciones/Fixture period navigation |
| League Option | Provider leagues endpoint | `id`, `name`, `season`, `competitionStage`, `competitionKey`, `status` | Group creation form |
| Leaderboard Row | Derived server payload | `rank`, `name`, `predictions`, `record`, `points` | Posiciones screen |
| Group Stats | Derived server payload | totals, accuracy, bestFecha, world benchmark | Posiciones stats mode |
| Profile Activity Item | Derived server payload | `type`, `label`, `occurredAt`, optional `points` | Perfil recent activity |

### 12.2 Entity Relationships
- User ↔ Membership:
  - One user can have many memberships.
  - Each membership ties user to one group and one role.
- Group ↔ Membership:
  - One group has many memberships.
  - Active members determine admin actions and deletion constraints.
- Group ↔ Invite:
  - Group can have multiple invites; UI fetches most recent valid invite.
- Group + Period + User ↔ Prediction:
  - Prediction uniqueness is enforced via upsert lookup on `(userId, groupId, fixtureId)`.
  - Stored prediction also carries `period` for period-scoped reads.
- Fixtures ↔ Predictions:
  - Fixture result score is external truth for points computation.
  - Only fixtures with final/live score can contribute to points.

### 12.3 Domain Terminology in Product
- `Fecha`:
  - Competition round label (`Fecha 1`, etc.) used for navigation and scoping.
- `Pronóstico`:
  - User predicted score (`home`/`away`) per fixture.
- `Pleno` / exact:
  - Prediction exactly matches final score.
- `Resultado`:
  - Prediction got outcome sign right (home win/draw/away win) without exact score.
- `Miss` / fallado:
  - Wrong outcome.
- `Grupo`:
  - Social cohort where members compete on shared fixtures.
- `Rendimiento` / `Stats`:
  - Aggregated group metrics and awards derived from scored predictions.

### 12.4 Data Lifecycles (Observed)
- Group lifecycle:
  1. Create group -> owner membership auto-created -> invite auto-created.
  2. Members join via invite code/token.
  3. Members can be promoted/removed.
  4. Group can be soft-deleted or user can leave.
- Prediction lifecycle:
  1. Fixture list loaded for selected `group + period`.
  2. User edits local draft values.
  3. Save-all posts each changed fixture prediction.
  4. Backend upserts record and returns updated timestamp.
  5. Scoring occurs later when fixture score is available.
- Profile activity lifecycle:
  1. Aggregates user predictions and group joins.
  2. Enriches prediction labels from fixture names when available.
  3. Sorts by timestamp descending and truncates to top 3 items.

### 12.5 Data Freshness and Caching Layers
- Client in-memory caches:
  - Pronósticos: payload per `groupId:period` + fechas per competition.
  - Posiciones: payload per `groupId:mode:period` + historical snapshots cache.
  - Fixture: payload per `groupId:period`.
  - Home: payload per group.
- Server/provider caches:
  - Provider fixture/league/standings caches with different TTLs.
  - Leaderboard and Home score-map caches (`120s`) to reduce recomputation.
- Local persistence:
  - `fulbito.activeGroupId`
  - `fulbito.theme`
  - `fulbito.leaderboard.mode`

### 12.6 Data Provenance Model
- PocketBase-backed truths:
  - Users, groups, memberships, invites, predictions.
- Provider-backed truths:
  - Fixture schedule/status/scores, available rounds, league lists, standings.
- Derived truths:
  - Home summary cards, leaderboard tables, stats awards, profile activity rollups.

## 13. Business Rules and Behavioral Logic
### 13.1 Authentication and Session Rules
- **Observed:** Session cookie name is `fulbito_session`.
- **Observed:** Session token embeds `uid`, `pbt` (PocketBase token), and `exp`, signed via HMAC SHA-256.
- **Observed:** Token expiration invalidates session without grace; verification returns `null`.
- **Observed:** Auth endpoints set cookie as `httpOnly`, `sameSite=lax`, `secure` only in production.
- **Observed:** Login/register lower-case email before authentication.
- **Observed:** Rate limits:
  - Login: 20 attempts / 15 min.
  - Register: 10 attempts / 15 min.

### 13.2 Group Selection and Scope Rules
- **Observed:** Every group-scoped request resolves selected group by:
  1. explicit `groupId` query (if valid membership),
  2. fallback to first membership.
- **Observed:** Invalid/unowned `groupId` resolves `403 Forbidden`.
- **Observed:** Empty memberships are handled as valid but empty payload in some endpoints (`home`, `fixture`, `leaderboard`, `profile`) and conflict-like `409` in pronósticos selection path.

### 13.3 Competition/Season Rules
- **Observed:** Group stores season in encoded format (`season|stage`) for stage-aware competitions.
- **Observed:** `leagueId=128` defaults to `apertura` stage when stage absent; others default `general`.
- **Observed:** `competitionKey` shape follows `${leagueId}-${season}-${stage}`.
- **Observed:** `formatRoundLabel` normalizes many provider round strings to `Fecha N`.

### 13.4 Prediction Rules
- **Observed:** Prediction write requires `groupId`, `period`, `matchId`.
- **Observed:** Writer must be active group member (`isActiveGroupMember`).
- **Observed:** Match must exist in fetched fixtures for requested period and have `status === "upcoming"`.
- **Observed:** Match lock rule:
  - `isLocked` true when kickoff timestamp is in the past (for upcoming matches).
  - Locked writes return `409 Prediction window closed for this match.`
- **Observed:** Home/Away values clamped server-side and client-side to `[0..20]`.
- **Observed:** Upsert behavior updates existing record for `(user, group, fixture)` else creates new.
- **Observed:** Write rate limit is `120 updates / 10 min / (user + requester fingerprint)`.

### 13.5 Scoring and Leaderboard Rules
- **Observed:** Scoring uses shared domain rules:
  - Exact score = 3.
  - Correct outcome sign = 1.
  - Otherwise = 0.
- **Observed:** Leaderboard only scores predictions where both predicted values exist and fixture has final score present.
- **Observed:** Posiciones sorting:
  - `points DESC`, then `predictions DESC`, then `name ASC`.
- **Observed:** Rank is recomputed from sorted index (1-based).
- **Observed:** Stats mode row points are efficiency percentage:
  - `round(points / (scoredPredictions * 3) * 100)`.

### 13.6 Group Stats Rules (`/api/leaderboard`, mode `stats`)
- **Observed:** Group stats include:
  - member count, scored predictions, exact/result/miss split, accuracy %, total points, avg member points.
- **Observed:** `bestFecha` picks highest per-period per-user points; ties broken by user name lexicographic order.
- **Observed:** `worldBenchmark` is computed only when standings leader points > 0.
- **Observed:** World benchmark ratio uses `groupTotalPoints / leaderPoints`.

### 13.7 Membership and Role Rules
- **Observed:** Roles: `owner`, `admin`, `member`.
- **Observed:** Only owner/admin can manage members.
- **Observed:** Admin cannot modify/remove another admin (owner required).
- **Observed:** Owner cannot be demoted/removed via member-management routes.
- **Observed:** Self-removal through kick endpoint forbidden; user must use leave action.
- **Observed:** Rename group allowed for owner/admin; name required and max length 80.
- **Observed:** Group delete allowed when:
  - actor is owner/admin, or
  - actor is sole active member.

### 13.8 Leave/Delete Group Rules
- **Observed:** Leaving as owner with only one owner can trigger soft-delete path.
- **Observed:** Soft-delete tries to set `groups.is_active=false`.
- **Observed:** If PB setup rejects required bool constraint, flow continues by expiring invites + removing members.
- **Observed:** Result may return `warningRequired=true` when active members > 1.

### 13.9 Invite Rules
- **Observed:** Invite generation:
  - code: 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
  - token: random base64url bytes.
  - expiry: now + 7 days.
  - default max uses: 200.
- **Observed:** Join accepts either code or token.
- **Observed:** Join rejects expired or maxed invites.
- **Observed:** Rejoining with removed status reactivates membership as `member` (or preserves `owner`).
- **Observed:** Invite usage increment attempts are best-effort (failure tolerated).

### 13.10 Provider and Data-Resolution Rules
- **Observed:** Fixture statuses classified from provider short status:
  - live statuses set, final statuses set, otherwise upcoming.
- **Observed:** Provider caching TTL adapts:
  - live fixtures short TTL.
  - stable fixtures long TTL.
  - empty fixtures short TTL.
- **Observed:** Default period resolution inspects available fechas and fixture statuses to pick best current period.
- **Observed:** Allowed leagues default to IDs `128` and `39` unless env override.

### 13.11 Error Translation and Guardrails
- **Observed:** Several routes normalize PocketBase raw errors into user-facing hints (especially leave group).
- **Observed:** Many mutation routes return `400` for malformed payload, `403` for permission, `401` for auth absence.
- **Observed:** UI toasts generally reflect route error text verbatim.

## 14. Reusable Patterns and Design System Observations
### 14.1 Structural UI Patterns
- Single-column app shell with fixed max width (`469px`) and persistent bottom nav.
- Sticky top headers with:
  - brand mark,
  - theme toggle,
  - notifications icon,
  - settings/profile shortcut.
- Card-driven surfaces:
  - rounded corners,
  - subtle border + shadow,
  - muted interior bands for labels.

### 14.2 Interaction Patterns Reused Across Pages
- Group context switch:
  - always via bottom-sheet selector.
  - active option visual confirmation checkmark.
- Fecha cycling:
  - left/right arrows with modulo wrap.
- Tab switches:
  - segmented controls with highlighted active segment.
- Toast feedback:
  - success/error/info tone consistently used for async outcomes.
- Modal semantics:
  - backdrop close across most modals.
  - destructive actions use explicit confirm sheet.

### 14.3 Visual State Conventions
- Status color/tone conventions:
  - Accent green for primary actions/success-like highlights.
  - Red for dangerous/failure/live pulse in some contexts.
  - Amber for warning/locked/deadline urgency.
- Skeleton placeholders:
  - used in each data-heavy page before initial payload resolves.
- Disabled control pattern:
  - opacity drop + no hover emphasis.

### 14.4 Data Presentation Conventions
- Group label pattern:
  - `League · GroupName` composite everywhere.
- Compact stat cards:
  - top label uppercase tiny text + large numeric value.
- Table/list rows:
  - left identity cluster + right metric cluster alignment.
- Relative freshness text:
  - “Actualizado …” labels in fixture.

### 14.5 Naming and Implementation Conventions
- Type names are explicit and route-oriented (`PronosticosPayload`, `FixturePayload`, etc.).
- API routes return JSON objects with predictable shape and optional `error` field.
- Page clients keep local caches in `useRef(Map)` keyed by stable scope strings.
- Utility helpers normalize display text, initials, logos, and dates consistently.

### 14.6 Accessibility-Related Reuse
- Frequent use of `aria-label` on icon-only buttons.
- Dialog roles in reusable sheet/dialog components.
- Keyboard focus styles defined globally for interactive elements.
- Remaining inconsistency:
  - not all custom modal implementations include full keyboard trap/escape behavior.

## 15. Edge Cases, Ambiguities, and Open Questions
### 15.1 Observed Edge Cases
- Pronósticos completion bar uses `total = max(15, matches.length)`:
  - **Observed:** Completion percentage may appear low for fechas with fewer than 15 matches.
- Empty/invalid kickoff times:
  - **Observed:** UI falls back to `Sin horario` or placeholder time labels.
- Missing logos:
  - **Observed:** Team/group/profile fallback initials render.
- Partial saves:
  - **Observed:** Batch save can produce mixed success and per-row errors.

### 15.2 Incomplete or Unwired Features
- **Observed:** Notification buttons are visual only.
- **Observed:** Auth “forgot password” button has no request handler.
- **Observed:** Settings support/legal actions show “Próximamente” only.
- **Observed:** Profile “Cambiar foto” has no upload/update flow.
- **Observed:** `LiveDataStatusBadge` component exists but is not mounted.
- **Observed:** Some generic reusable components (`MatchCard`, `PredictionStepper`, `LeaderboardTable`) are present but not used by current pages.
- **Observed:** Group rename and invite refresh APIs exist but are not exposed in current Configuración UI actions.

### 15.3 Behavioral Ambiguities / Potential Risks
- **Observed:** Mixed auth-guard model (some server, some client) can create inconsistent first-paint behavior across routes.
- **Observed:** `/perfil` `saveProfile()` lacks explicit catch branch in client code:
  - failures can propagate without inline feedback in modal (only loading state resets).
- **Observed:** Posiciones stats screen includes hardcoded visual values (`#842`, fallback `1240`) when payload portions missing.
- **Observed:** Some API error text is English while most UI is Spanish (inconsistent localization surface).
- **Inferred:** In-memory caches are per-page session only; no shared invalidation between routes after mutations.

### 15.4 Assumptions and Uncertainties
- **Assumption:** PocketBase collection schemas include custom fields used by repo layer (`owner_user_id`, `is_active`, invite/membership statuses) exactly as queried.
- **Assumption:** Provider payload fields stay consistent with parsing logic (`fixture.status.short`, `goals.home`, etc.).
- **Inferred:** Feature intent indicates `/perfil` is primary profile UI while `/configuracion/perfil` remains for backward compatibility.
- **Assumption:** Competitive awards labels (“Nostradamus”, “Mufa”, etc.) are productized and not temporary copy experiments.

### 15.5 Open Product/Engineering Questions
- Should group rename and invite refresh be exposed in web UI now that APIs exist?
- Should leaderboard stats hardcoded ranking/points placeholders be replaced with live values?
- Should auth guards be standardized (all server or all client+API) for consistency?
- Should settings toggles persist to backend/user preferences?
- Should profile modal include explicit validation + error rendering comparable to auth form?

## 16. Suggested QA Checklist
### 16.1 Authentication
- [ ] Visiting `/auth` unauthenticated renders login mode with email/password fields.
- [ ] Login with valid credentials sets session and redirects to `/pronosticos`.
- [ ] Signup enforces password minimum 8 and blocks invalid email format.
- [ ] Login/register rate-limit responses (`429`) are surfaced to user.
- [ ] Logout from settings removes session and redirects to `/auth`.
- [ ] Expired/invalid session hitting protected APIs returns `401`.

### 16.2 Navigation and Information Architecture
- [ ] Bottom nav routes correctly to Inicio/Posiciones/Pronósticos/Fixture/Grupos.
- [ ] Active tab highlight matches current main route.
- [ ] Header profile/settings shortcuts navigate correctly on each page.
- [ ] Group selector modal opens/closes via button, backdrop, and close icon.
- [ ] Period arrows cycle with wrap-around behavior.

### 16.3 Group Management
- [ ] Create group requires non-empty name and selected league.
- [ ] Join group requires non-empty code/token.
- [ ] Joining with invalid/expired invite returns error toast.
- [ ] Member list loads in group modal and orders self first.
- [ ] Promote member action updates role and row UI.
- [ ] Kick member action removes row on success.
- [ ] Leave group flow shows confirmation and updates memberships.
- [ ] Delete group flow shows confirmation and removes/inactivates group.
- [ ] Non-admin/member permissions are blocked server-side for manage endpoints.

### 16.4 Pronósticos
- [ ] Upcoming and history tabs render correct fixture subsets.
- [ ] Editing prediction opens modal, increments/decrements values, and confirms into draft only.
- [ ] Pending save bar appears only when draft differs from committed.
- [ ] Save-all processes changed matches and handles full success.
- [ ] Partial failure shows row-level errors and “Guardado parcial” toast.
- [ ] Locked match cannot be edited and shows locked warning.
- [ ] Retry load button invalidates cache and refetches period payload.

### 16.5 Posiciones and Stats
- [ ] Mode switch persists to `localStorage` and restores on reload.
- [ ] Posiciones mode supports global and per-fecha periods.
- [ ] Table sorting and rank highlighting follow backend payload order.
- [ ] Stats mode shows awards accordion and allows expand/collapse.
- [ ] Historical snapshot fetch partial failure still renders awards fallback.
- [ ] Group stats cards show API-driven values where available.

### 16.6 Fixture
- [ ] Fixture page loads cards by selected group and fecha.
- [ ] Filters `Todos/En vivo/Finalizados/Próximos` correctly subset rows.
- [ ] Empty filter state message appears when no rows remain.
- [ ] Date cards preserve grouped rows and status-specific score/time center panel.
- [ ] Updated-at label changes based on payload timestamp freshness.

### 16.7 Home
- [ ] Group cards reflect user rank/points per group.
- [ ] Summary mini-cards update when active group changes.
- [ ] Match filter tabs (`Todos/En vivo/Próximos`) update list instantly without refetch.
- [ ] No-memberships empty state routes users to `/configuracion`.

### 16.8 Perfil and Settings
- [ ] Perfil loads stats and activity from `/api/profile`.
- [ ] `/api/profile` failure falls back to join-activity-derived list.
- [ ] Edit profile modal saves to `/api/auth/me` and updates visible name/email/username.
- [ ] Configuración perfil route save button only active when dirty.
- [ ] Ajustes toggles switch UI state; unsupported actions show info toast.

### 16.9 API Contract and Error Handling
- [ ] All protected endpoints reject missing session with `401`.
- [ ] Group-scoped endpoints reject unauthorized group access with `403`.
- [ ] Invalid payloads return `400` with clear `error` field.
- [ ] Leaderboard endpoint returns actionable `409` when PB rules block group prediction reads.
- [ ] Health provider endpoint requires admin/owner or health token.

### 16.10 Cross-Cutting UX and Accessibility
- [ ] Theme toggle persists and applies across routes.
- [ ] Toasts auto-dismiss and can be manually dismissed.
- [ ] Icon-only controls expose meaningful `aria-label`.
- [ ] Focus ring visible for keyboard navigation.
- [ ] Modal backdrops close correctly and do not leave stale overlays.

## 17. Concise Functional Summary
- **Observed:** Fulbito Prode web is a group-based football prediction application where authenticated users join or create groups, select competition rounds (`fechas`), submit match score predictions, and compare performance in leaderboard and stats views.
- **Observed:** The app is organized around five primary web areas (Inicio, Pronósticos, Posiciones, Fixture, Grupos) plus account/profile routes, all tied to an active group context and provider-backed fixture data.
- **Observed:** Core business behavior is enforced in API routes and repository logic: membership and role permissions, prediction lock windows, scoring rules (3/1/0), invite lifecycle constraints, and defensive handling for empty/partial/error data.
- **Inferred:** The product is currently optimized for a mobile-width web shell with strong state feedback (skeletons, toasts, confirmation dialogs, empty/error messages) and iterative feature growth, with some placeholder UI actions intentionally left unimplemented.
- **Scope note:** This specification is intentionally based on the web app implementation only; unfinished mobile code is out of scope and not used as product truth.
