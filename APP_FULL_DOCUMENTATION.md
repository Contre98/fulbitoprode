# Fulbito Prode 2.0 – Complete Functional Documentation

## 1. Executive Overview

### 1.1 What the application is
Fulbito Prode 2.0 is a mobile application (built with React Native / Expo) backed by a Node.js backend using PocketBase for data storage and authentication. It is a "Prode" (sports prediction) platform tailored primarily for the Liga Profesional de Fútbol (Argentina). It allows users to form private groups, predict the exact scores of upcoming football matches, earn points based on their accuracy, and compete on a leaderboard. 

### 1.2 Primary purpose
To digitize and automate the traditional "Prode" game played among friends, family, or coworkers. It removes the need for manual spreadsheet tracking by automatically pulling live football fixtures and results, computing scores, and updating group leaderboards in real-time.

### 1.3 Core value proposition
- **Frictionless Social Play:** Create groups and invite friends via deep links or codes effortlessly.
- **Automated Scoring:** Matches and results are automatically synced. Users are awarded points based on exact score hits, outcome hits, or misses.
- **Deep Analytics:** Beyond a simple leaderboard, it offers detailed group stats, "Awards and Punishments" (e.g., "Nostradamus", "El Mufa"), and historical ranking evolution.
- **Offline/Mock Gracefulness:** The app gracefully degrades to a mock data mode if the backend is unreachable or the user is not authenticated.

### 1.4 Likely target users
Argentinian football fans who want to compete with friends predicting match outcomes in the local league (Liga Profesional). The app appeals to casual fans and hardcore statisticians alike through its rich stats dashboard.

### 1.5 High-level workflow summary
1. A user downloads the app and signs up/logs in.
2. The user creates a new group or joins an existing one via an invite code/link.
3. The user navigates to the "Pronósticos" (Predictions) tab to submit score predictions for upcoming matches in a specific "Fecha" (Matchday).
4. As real matches are played, the app updates match statuses (upcoming -> live -> final).
5. Points are automatically distributed based on the accuracy of the predictions.
6. Users check the "Posiciones" (Leaderboard) and "Inicio" (Home) tabs to see their ranking, group stats, and earned awards.

---

## 2. Product Scope and Mental Model

### 2.1 Main entities/concepts in the app
- **User / Profile:** The person using the app, containing email, name, username, and overall performance stats.
- **Group (Grupo):** A private league where users compete. Groups belong to a specific league and season (e.g., Liga Profesional 2026).
- **Membership:** A user's relationship to a group, including their role (`owner`, `admin`, `member`).
- **Fixture (Partido):** A real-world football match. Has a home team, away team, kickoff time, and status (`upcoming`, `live`, `final`).
- **Prediction (Pronóstico):** A user's guess for the exact score (home goals, away goals) of a specific fixture.
- **Period (Fecha):** A matchday or round in the tournament. Fixtures are grouped by period.
- **Leaderboard (Posiciones):** The ranking of members in a group based on prediction points.
- **Awards (Premios y Castigos):** Algorithmic badges awarded to users based on their prediction history (e.g., most exact hits, longest streak without points).

### 2.2 Core user goals
- Accurately predict match results to beat friends.
- Monitor live match statuses and how they affect the leaderboard.
- Manage social groups (invite friends, kick inactive members).

### 2.3 Information architecture
The app is built around a bottom tab navigation for core gameplay, complemented by a stack navigation for auxiliary screens (Profile, Settings, Group Management). The context is highly dependent on the currently *selected group* and the currently *selected period (fecha)*, which are globally accessible states.

### 2.4 How the app is organized conceptually
The app uses a Context-driven architecture:
- `AuthContext`: Manages user session and HTTP vs. Mock data modes.
- `GroupContext`: Manages the list of memberships and the globally active group.
- `PeriodContext`: Manages the currently selected matchday (Fecha) and handles navigation between previous/next matchdays.
- `PendingInviteContext`: Handles deep links for group invitations.

### 2.5 Key objects, records, or resources managed by the app
- User accounts and authentication tokens.
- Group definitions and invite codes.
- Fixture data (read-only for users, fetched from external provider via backend).
- User Predictions (writeable only before kickoff).
- Notifications and preferences.

---

## 3. Application Structure

### 3.1 Route map / screen inventory
**Authentication Stack (Unauthenticated users):**
- `/auth` (`AuthScreen`): Login, Registration, and Password Reset.

**Main App Tabs (Authenticated users):**
- `/` (`HomeScreen`): Dashboard with top matches, user rank, and weekly winners.
- `/posiciones` (`PosicionesScreen`): Leaderboards and advanced group stats/awards.
- `/pronosticos` (`PronosticosScreen`): Interface to input and view predictions.
- `/fixture` (`FixtureScreen`): Full list of matches for the selected round.

**Auxiliary Stack (Authenticated users):**
- `/perfil` (`PerfilScreen`): User profile, global stats, achievements, and activity history.
- `/ajustes` (`AjustesScreen`): App settings, theme placeholders, and logout.
- `/notificaciones` (`NotificacionesScreen`): Inbox for alerts and notification preferences.
- `/configuracion` (`ConfiguracionScreen`): Group management (create, join, invite, kick, leave, delete).

### 3.2 Layout hierarchy
Most screens utilize a shared `ScreenFrame` component. 
- The frame includes a curved, elevated header card holding the app branding, user avatar, screen title, and a `HeaderGroupSelector` dropdown.
- The content area is a scrollable view with a consistent gray/slate background (`#DDE2E8`).
- Bottom tabs (`AppTabs`) persist across the main 4 screens.

### 3.3 Navigation model
- **Global Tab Navigation:** Quick switching between Home, Leaderboard, Predictions, and Fixtures.
- **Header Navigation:** The user avatar or settings icon in the header often routes to auxiliary screens (`Perfil`, `Ajustes`).
- **Deep Linking:** URLs like `https://fulbito.prode/configuracion?invite=TOKEN` automatically route the user to the `ConfiguracionScreen` and trigger the join group flow.

### 3.4 Global providers / app shell / shared wrappers
- `AuthProvider`: Wraps the entire app. Determines if `RootStack` shows `AuthScreen` or `AppTabs`.
- `PendingInviteProvider`: Listens to deep links and temporarily stores invite tokens until authentication is complete.
- `GroupProvider`: Fetches the user's groups and exposes the `selectedGroupId`.
- `PeriodProvider`: Provides the `fecha` (current matchday) and functions to increment/decrement it.
- `@tanstack/react-query`: Used extensively for data fetching, caching, and mutations across the app.

### 3.5 Shared state and cross-cutting concerns
- **Data Mode (HTTP vs Mock):** The app falls back to mock repositories if the backend is unreachable, allowing for a degraded but functional UI demonstration.
- **Error Translation:** Backend errors are intercepted and passed through `translateBackendError()` to provide localized, user-friendly Spanish error messages.
- **Date/Time Formatting:** Dates are consistently localized to `es-AR` and adjusted for timezone context.

---

## 4. User Types, Roles, and Permissions

### 4.1 User roles identified
Roles exist at the **Group Membership** level. There are no global app admins visible in the standard UI.
- `owner`: The creator of the group.
- `admin`: A promoted member with managerial capabilities.
- `member`: A standard participant.

### 4.2 Access differences by role
- **Owner:** Can rename the group, regenerate invite codes, kick members, promote members to admin, and delete the group. Cannot be kicked or leave the group unless they delete it.
- **Admin:** Can rename the group, regenerate invite codes, and kick normal members.
- **Member:** Can only view group members and leave the group.

### 4.3 Conditional UI behavior by permission
In `ConfiguracionScreen` (Manage Group Modal):
- Input to rename group is disabled for `member`.
- Buttons to "Regenerar invitación", "Copiar", and "Compartir" are disabled/hidden for `member`.
- "Hacer admin" and "Quitar" buttons next to users are hidden for `member`.
- "Eliminar grupo" button is disabled for `member`.

### 4.4 Protected routes / guarded actions
- All main app routes are protected by `isAuthenticated` in `AppNavigation`.
- Predictions cannot be saved if `fixture.status !== 'upcoming'` or if the `kickoffAt` time has passed.
- Backend APIs strictly validate group membership before returning fixtures or accepting predictions.

---

## 5. End-to-End User Journeys

### 5.1 First-time user journey
- **Objective:** Get into the app and join a group.
- **Flow:** 
  1. User opens the app and sees `AuthScreen` (Login mode).
  2. Toggles to "Crear cuenta".
  3. Enters Name, Email, Password. Submits.
  4. App authenticates, sets HTTP mode, and redirects to `HomeScreen`.
  5. `HomeScreen` shows an empty state or defaults to a default group.
  6. User navigates to `ConfiguracionScreen` via the groups dropdown or modal.
  7. User enters a join code in the "Unirse" tab or creates a new group.
  8. Upon success, the new group becomes the `selectedGroupId` and data populates across tabs.

### 5.2 Deep-Link Invitation Journey
- **Objective:** Join a group via a shared link.
- **Flow:**
  1. User taps `https://fulbito.prode/configuracion?invite=abc123`.
  2. If unauthenticated, `PendingInviteContext` saves the token and routes to `AuthScreen`. User logs in.
  3. App immediately routes to `ConfiguracionScreen`, pre-filling the code `abc123`.
  4. App displays a message: "Invitación detectada...".
  5. User taps "Unirse al grupo".
  6. Upon success, token is cleared, group is selected, and user is in the group.

### 5.3 Main task completion journey (Making Predictions)
- **Objective:** Fill out the Prode for the weekend.
- **Flow:**
  1. User opens app, lands on `HomeScreen`.
  2. Navigates to `PronosticosScreen`.
  3. Ensures "Por Jugar" (Upcoming) tab is selected.
  4. Uses the `< >` buttons to select the correct `Fecha` (if not auto-selected).
  5. Sees a list of fixture cards with empty `[ - ] : [ - ]` inputs.
  6. Types `2` for Home, `1` for Away.
  7. The app instantly queues an auto-save (debounce of 800ms).
  8. A chip appears saying "Guardando pronóstico...".
  9. Disappears on success. The progress bar at the top updates (e.g., "1/14 completados").
  10. User repeats for all matches.

### 5.4 Admin/management journey
- **Objective:** Remove an inactive user from the group.
- **Flow:**
  1. Admin opens `ConfiguracionScreen`.
  2. Taps the settings icon (`≣`) on their group card.
  3. Modal opens, fetches member list.
  4. Admin scrolls to the inactive user.
  5. Taps "Quitar".
  6. Backend removes user, modal list updates.
  7. A success status message appears at the top of the modal.

---

## 6. Detailed Screen-by-Screen Documentation

### AuthScreen
#### Purpose
Authentication entry point (Login, Register, Forgot Password).
#### Entry points
Initial load if `isAuthenticated` is false.
#### Layout and sections
Centered single-column layout with App Title, subtitle, form inputs, submit button, and a toggle link.
#### Components present
`TextInput`, `Pressable`.
#### User interactions
- Toggling between Login and Signup modes.
- Submitting the form (triggers `login` or `register` in `AuthContext`).
- Clicking "Olvidaste tu contraseña?" triggers `requestPasswordReset`.
#### Validation and constraints
Backend validates credentials. Generic UI validation ensures email isn't empty for password reset.
#### Loading / empty / error / success states
- `submitting` state disables buttons and changes text to "Validando...".
- `error` state displays red text below inputs (e.g., "Email o contraseña incorrectos").
- `info` state displays green text for successful password reset requests.

### HomeScreen
#### Purpose
Dashboard showing an overview of the user's current status in the selected group and quick access to live/upcoming matches.
#### Entry points
Default tab after login.
#### Layout and sections
- `ScreenFrame` header with Group Selector.
- Top Summary Row (Ranking, Pending matches, Live matches).
- Weekly Winner Card (if data exists).
- Quick Fixtures list (Upcoming/Live) with filter tabs (Todos, En vivo, Próximos).
#### Data shown
`leaderboardQuery` (for rank), `fixtureQuery` (for match counts and cards), `notificationsQuery` (for weekly winner).
#### User interactions
- Changing group in header selector.
- Filtering fixture list by status.
- Clicking "Compartir resultado" on Weekly Winner opens native Share dialog.
#### Loading / empty / error / success states
- `LoadingState` while fetching queries.
- `ErrorState` with retry button if fetch fails.
- `EmptyState` if no matches match the current filter.
- Live matches have a red border and "EN VIVO" indicator.

### PosicionesScreen
#### Purpose
Displays the group leaderboard and advanced statistics.
#### Entry points
Bottom tab "Posiciones".
#### Layout and sections
- Top tabs to switch between "POSICIONES" (Leaderboard) and "STATS".
- Matchday (Fecha) navigator.
- **Posiciones Mode:** Table showing Rank, Name, Predictions made, Record (Exact/Outcome/Miss), and Points.
- **Stats Mode:** 
  - Summary row (Members, Total Points, Accuracy).
  - Rewards section (Premios y Castigos).
  - General Performance card.
  - Best/Worst round card.
  - Member Evolution list.
#### Data shown
`leaderboardRepository.getLeaderboardPayload(groupId, fecha, mode)`.
#### User interactions
- Switching modes (Posiciones vs Stats).
- Navigating Fechas (changes the period for the leaderboard).
#### Loading / empty / error / success states
Standard loading/error states. Empty state shows "Sin posiciones disponibles" if no one has points yet.
#### Inferred behavior
The "Awards" are algorithmically generated by the backend (e.g., "Nostradamus" for most exact hits) and mapped to specific icons and colors in the frontend (`awardVisualById`).

### PronosticosScreen
#### Purpose
Inputting and reviewing match predictions.
#### Entry points
Bottom tab "Pronósticos".
#### Layout and sections
- Fecha navigator.
- Progress bar showing completion percentage.
- Tabs: "Por Jugar" (Upcoming) and "Jugados" (History).
- List of Fixture Cards.
#### Components present
`TeamCrest`, custom `TextInput` for scores.
#### Data shown
Matches from `fixtureQuery` and user's predictions from `predictionsQuery`.
#### User interactions
- Typing into score inputs. Triggers an optimistic UI update and an autosave debounce (`autoSaveTimersRef`).
- Switching to "Jugados" shows read-only cards with the user's past prediction vs. actual result.
#### Validation and constraints
- Inputs are restricted to numbers, max length 2.
- Inputs are disabled if `fixture.status !== 'upcoming'`.
- A warning chip appears if a match is locked.
#### Loading / empty / error / success states
- "Guardando pronóstico..." info chip appears per card during save.
- Error chip appears per card if save fails.
- Empty states if no matches exist for the selected tab.

### FixtureScreen
#### Purpose
View all matches for a specific round, grouped by date.
#### Entry points
Bottom tab "Fixture".
#### Layout and sections
- Fecha navigator.
- Filter tabs (All, Live, Final, Upcoming).
- List grouped by Date (`groupFixturesByDate`).
#### Data shown
Read-only match data.
#### User interactions
Filtering by status.

### PerfilScreen
#### Purpose
View personal statistics across all groups and edit profile details.
#### Entry points
Tapping the avatar in the header of `HomeScreen` or `AjustesScreen`, or via "Mi Perfil" button.
#### Layout and sections
- Header with Avatar and "Editar" button.
- Global stats row (Total Points, Accuracy, Groups count).
- Recent Activity list (e.g., "Joined group", "Made prediction").
- Performance summary.
- Achievements list.
- Ranking evolution list.
- **Modal:** Edit Profile form.
#### User interactions
- Tapping "Editar" opens modal.
- Submitting edit form calls `profileRepository.updateProfile`.
#### Validation and constraints
Client-side validation via `validateAndNormalizeProfileForm` (checks lengths, valid email, valid username characters).

### ConfiguracionScreen
#### Purpose
Manage group memberships (Create, Join, Manage Members).
#### Entry points
From Deep link, or from a dedicated route (often accessed via empty states or settings).
#### Layout and sections
- Top tabs: "Crear Grupo" vs "Unirse".
- Form card for Create/Join.
- List of user's current memberships.
- **Manage Modal:** Opened via settings icon on a group. Shows rename input, invite code, share buttons, member list with admin actions, and destructive actions (Leave/Delete).
- **Confirmation Modal:** For Leave/Delete actions.
#### User interactions
- Creating/Joining groups.
- Owners/Admins copying or sharing invite codes via native `Share` API or clipboard.
- Promoting/Kicking members.
- Leaving or Deleting groups.
#### Loading / empty / error / success states
Extensive use of inline status text (`actionStatus`) to display success/error messages for the myriad of mutations on this screen.

### AjustesScreen
#### Purpose
App settings and logout.
#### Layout and sections
- Account section (Profile link, Logout button).
- Preferences section (Theme placeholder, Notifications link).
#### User interactions
Tapping "Cerrar sesión" triggers `logout()` in AuthContext, clearing session and returning to AuthScreen.

### NotificacionesScreen
#### Purpose
Manage notification preferences and view inbox.
#### Layout and sections
- Preferences card (toggles for Reminders, Results, Social).
- Inbox card with "Marcar todo leído" button and list of notifications.
#### User interactions
- Toggling preferences immediately fires mutation.
- Tapping "Marcar todo leído" clears unread styling.

---

## 7. Component Catalog

### 7.1 ScreenFrame
- **Purpose:** Standard layout wrapper providing Safe Area insets, a stylized header, and a consistent background.
- **Props:** `title`, `subtitle`, `header` (ReactNode), `hideDataModeBadge`, `containerStyle`, `contentStyle`.

### 7.2 HeaderGroupSelector
- **Purpose:** Dropdown or trigger in the header to switch the globally active group.
- **Behavior:** Reads `memberships` and `selectedGroupId`. Calls `onSelectGroup`.

### 7.3 TeamCrest
- **Purpose:** Displays a team's logo. If `logoUrl` is missing or fails to load, falls back to rendering the team's 3-letter `code` in a colored circle.
- **Props:** `teamName`, `code`, `logoUrl`, `size`.

### 7.4 EmptyState / ErrorState / LoadingState
- **Purpose:** Standardized feedback components.
- **EmptyState Props:** `title`, `description`. Includes a generic illustration/icon.
- **ErrorState Props:** `message`, `retryLabel`, `onRetry`.
- **LoadingState Props:** `message`. Renders an `ActivityIndicator`.

### 7.5 BrandBadgeIcon
- **Purpose:** Renders the app's visual logo icon.

---

## 8. Interaction Matrix

| Interaction | Trigger | Immediate UI State | Async Work | Success State | Failure State |
|---|---|---|---|---|---|
| **Save Prediction** | Typing in score input in `PronosticosScreen`. | Input reflects text. 800ms debounce starts. | `predictionsRepository.savePrediction` | "Guardando..." chip disappears. Data refetched. | Error chip appears on the specific match card. |
| **Join Group** | Tapping "Unirse" with code. | Button says "Uniendo...". Disabled. | `groupsRepository.joinGroup` | Input clears. Group selected. Success message. | Error text shown. |
| **Share Invite** | Tapping "Compartir invitación" in Modal. | Button says "...". | Fetch invite if missing, then Native Share. | Native dialog opens. | Error text shown. |
| **Kick Member** | Tapping "Quitar" next to user. | Button says "...". Disabled. | `groupsRepository.removeMember` | User removed from list. Success text. | Error text shown. |
| **Change Fecha** | Tapping `<` or `>` in navigator. | Local state `fecha` updates instantly. | Queries invalidate and fetch new data. | New match data shown. | Error state shown for new data. |
| **Logout** | Tapping "Cerrar sesión". | - | `authRepository.logout` | Session cleared, routed to AuthScreen. | - |

---

## 9. Forms and Validation

### 9.1 Authentication Form
- **Fields:** Email (required), Password (required), Name (required for signup).
- **Validation:** Relies primarily on backend constraints.
- **Behavior:** Submits to PocketBase endpoints.

### 9.2 Edit Profile Form
- **Fields:** Name (max 120), Username (max 48, alphanumeric+dash/dot), Email (max 190).
- **Validation:** `validateAndNormalizeProfileForm` performs regex checks on username and email format.
- **Behavior:** Updates PocketBase user record.

### 9.3 Create Group Form
- **Fields:** Group Name.
- **Validation:** Must not be empty. Backend enforces length. Default season/league data is hardcoded (Liga Profesional Apertura 2026).

### 9.4 Prediction Inputs
- **Fields:** Home Score, Away Score.
- **Validation:** Regex `/[^\d]/g` replacement immediately removes non-numeric characters. Max length 2. Max value 99 (enforced by domain logic).

---

## 10. Data and State Behavior

### 10.1 Main client-side state domains
- `AuthContext`: Session data, HTTP vs Mock mode flag.
- `GroupContext`: `memberships` array, `selectedGroupId` string.
- `PeriodContext`: `fecha` string (current matchday ID), `options` array (available matchdays).
- `PendingInviteContext`: Temporarily holds deep link tokens.

### 10.2 Server data dependencies
- All major entities (Leaderboard, Fixtures, Predictions, Profile, Inbox) are fetched via `@tanstack/react-query` calling repository adapters.
- Query keys are heavily parameterized by `groupId` and `fecha` to ensure strict cache isolation (e.g., `["fixture", groupId, fecha]`).

### 10.3 Optimistic updates
- **Predictions:** When saving a prediction, `useMutation`'s `onMutate` modifies the React Query cache immediately so the UI doesn't stutter, storing the `previous` state to rollback `onError`.

### 10.4 URL state / query params / deep-linking
- Deep linking is supported via `fulbito://` or `https://fulbito.prode`.
- Links containing `?invite=TOKEN` are intercepted by React Navigation linking config and passed to `ConfiguracionScreen`.

---

## 11. System Feedback and UX States

### 11.1 Loading states
- Full screen `ActivityIndicator` during initial Auth boot.
- `LoadingState` component replaces main content when queries are fetching for the first time.
- Inline text changes on buttons (e.g., "Guardando...").

### 11.2 Error states
- `ErrorState` component replaces lists if queries fail, providing a "Reintentar" button.
- Backend errors are mapped via `translateBackendErrorMessage` to friendly Spanish strings (e.g., "invalid credentials" -> "Email o contraseña incorrectos.").

### 11.3 Empty states
- Heavily utilized via `EmptyState` component. Custom messaging based on context (e.g., "No hay partidos en vivo" vs "No hay partidos próximos" based on current filter).

### 11.4 Warning/destructive flows
- Leaving or Deleting a group opens a dedicated secondary Modal (`confirmRoot`) requiring explicit confirmation before executing the destructive API call.

---

## 12. Conditional Logic and Scenario Coverage

- **User lacks permissions:** Attempting to rename a group as a `member` results in a client-side block and toast message. Backend also enforces this.
- **API is down:** The `AuthContext` detects HTTP failures and can seamlessly downgrade to `mockDataRepositories` if configured, allowing the app to run in a demo state.
- **Match has started (locked):** If `fixture.status !== 'upcoming'` or `kickoffAt` is in the past, `isEditable` evaluates to false. Inputs are replaced with a read-only pill showing the prediction, and a yellow warning chip ("Partido bloqueado...") is displayed.
- **No groups:** If the user has 0 memberships, the Leaderboard API gracefully returns empty data with a "Sin grupo activo" label.

---

## 13. Navigation and Routing Behavior

### 13.1 Global navigation
Handled by `RootNavigator`. Switches between `AuthStack` and `AppStack` based on `isAuthenticated`.

### 13.2 Fallback/404 behavior
Deep links not matching configured screens will likely default to the home screen or ignore the params.

### 13.3 Guarded routes
If `isAuthenticated` goes false (e.g., token expires, user logs out), the entire `AppStack` unmounts, dumping all state, and remounts `AuthStack`.

---

## 14. External Integrations and Side Effects

### 14.1 APIs
- **PocketBase:** Used for Auth, CRUD operations, and real-time data storage on the backend.
- **Liga Live Provider:** The backend integrates with an external football API (likely API-FOOTBALL or similar, inferred from `fetchLigaArgentinaFixtures` in backend code) to sync real-world fixtures and scores.

### 14.2 Device features
- **Push Notifications:** The app registers device tokens on login via `notificationsRepository.registerDeviceToken(Platform.OS)`.
- **Share/Clipboard:** Used to distribute invite codes. Fallbacks from `navigator.clipboard` to native `Share.share` API.

---

## 15. UI/UX Patterns and Design Conventions

### 15.1 Visual hierarchy
- **Colors:** Primary branding uses a Lime Green / Chartreuse (`#A3C90A`, `#B7D70A`) accent color over a Slate/Navy (`#0F172A`) and light Gray background (`#F8FAFC`, `#DDE2E8`).
- **Typography:** Heavy use of bold/black weights (`800`, `900`) for headers and numbers, creating a sporty, data-heavy dashboard feel.
- **Shapes:** Heavy use of rounded corners (`borderRadius: 10` to `16`) for cards, buttons, and inputs. Pill-shaped badges for status indicators.

### 15.2 Consistency patterns
- **Date Navigation:** The `< Fecha >` block is identically styled and functions exactly the same across Home, Leaderboard, Predictions, and Fixtures.
- **Match Cards:** The layout of Home Team (Left) - Score (Center) - Away Team (Right) is strictly maintained across all lists.

---

## 16. Domain Model / Business Logic Inferred

### 16.1 Scoring System (`calculatePredictionPoints`)
- **Exact Hit (Pleno):** 3 points. (e.g., predict 2-1, result 2-1).
- **Outcome Hit (Tendencia):** 1 point. (e.g., predict 2-0, result 2-1. Correct winner or correct draw).
- **Miss:** 0 points.

### 16.2 Leaderboard Tie-breaking
Inferred from backend `buildRows`:
1. Total Points (Highest first)
2. Total Exact Predictions (Highest first)
3. Alphabetical by Name

### 16.3 Awards Logic (`buildStatsAwards`)
- **Nostradamus:** Most exact hits.
- **Bilardista:** Most points gathered solely from outcome hits (0 exact hits).
- **La Racha:** Longest consecutive streak of matches gaining >0 points.
- **Batacazo:** Being the *only* person in the group to score points on a specific match.
- **Robin Hood:** High ratio of hitting difficult matches (where few scored) and missing easy matches (where many scored).
- **El "Casi":** Outcome hit, but missed the exact score by exactly 1 goal difference.
- **El Mufa:** Longest consecutive streak of matches with 0 points.

---

## 17. Technical Clues That Explain Product Behavior

- **Autosave Debounce:** In `PronosticosScreen`, `autoSaveTimersRef` utilizes `setTimeout` for 800ms. This explains why there is no explicit "Guardar" button for predictions; the app waits for the user to stop typing and silently queues a mutation.
- **Optimistic Rendering:** The React Query `onMutate` function manually updates the local cache before the server responds. This makes the UI feel instantly responsive when entering scores.
- **Backend Score Map Caching:** The backend route `leaderboard/route.ts` uses an in-memory `leaderboardScoreMapCache` with a TTL of 120,000ms (2 minutes). This explains why leaderboard calculations are fast, but might have up to a 2-minute delay reflecting live goal changes.

---

## 18. Known Gaps / Ambiguities / Inferences

- **Theme System:** `AjustesScreen` shows a "Tema" setting labeled "Próximamente". Inferred that dark mode is planned but not currently implemented.
- **Admin/Owner Promotion limitations:** It appears an Admin cannot promote another Member to Admin; only the Owner can. Code mentions `modalViewerRole === 'admin'`.
- **Backend Polling:** It is not explicitly clear from the frontend code if live matches auto-poll for new scores, or if the user must pull-to-refresh / change tabs to trigger a React Query refetch.
- **Competition Hardcoding:** Group creation currently hardcodes `leagueId: 128` and `season: 2026`. This suggests the app is currently single-tenant for the Liga Profesional 2026 season and doesn't support custom leagues yet.

---

## 19. Comprehensive Feature Inventory

- [x] **Authentication:** Email/Password Login, Signup, Password Reset.
- [x] **Group Management:** Create group, Join via code, Join via deep link.
- [x] **Group Administration:** Rename group, Generate/Share invites, Promote to Admin, Kick Member, Delete Group.
- [x] **Match Viewing:** Filterable fixture lists (Live, Upcoming, Final).
- [x] **Predictions:** Input scores, auto-save, lock on kickoff, view historical predictions vs actuals.
- [x] **Leaderboards:** Global points ranking, rank highlighting.
- [x] **Advanced Statistics:** Group accuracy, Total points, Best/Worst rounds.
- [x] **Gamification:** 7 unique algorithmic awards (Nostradamus, Batacazo, etc.).
- [x] **Profile:** View global stats, recent activity feed, rank evolution chart.
- [x] **Notifications:** In-app inbox, push notification registration, preference toggles.

---

## 20. Appendix

### 20.1 Route inventory
Mobile Screens: `AuthScreen`, `HomeScreen`, `PosicionesScreen`, `PronosticosScreen`, `FixtureScreen`, `PerfilScreen`, `AjustesScreen`, `NotificacionesScreen`, `ConfiguracionScreen`.
API Routes: `/auth/*`, `/groups/*`, `/fixture`, `/leaderboard`, `/pronosticos`, `/notifications/*`, `/profile`.

### 20.2 Key Component inventory
`ScreenFrame`, `HeaderGroupSelector`, `TeamCrest`, `BrandBadgeIcon`, `EmptyState`, `ErrorState`, `LoadingState`.

### 20.3 State inventory
`AuthContext`, `GroupContext`, `PeriodContext`, `PendingInviteContext`, `@tanstack/react-query` Cache.
