Fulbito Prode — Implementation Plan

0. Goal and principles

This plan focuses on four outcomes:
	1.	Restore trust in core gameplay
	•	correct scores
	•	correct history
	•	correct standings/stats
	2.	Reach mobile/web functional parity where it matters
	•	profile/settings
	•	group administration
	•	invite flow
	3.	Add engagement loops
	•	notifications
	•	weekly winners
	•	achievements
	•	shareable outcomes
	4.	Reduce architecture drift
	•	unify APIs
	•	consolidate repository usage
	•	remove placeholder/synthetic behavior

The audit shows the biggest gaps are mobile score/result reliability, synthetic mobile stats, missing mobile management surfaces, unwired UX features, and inconsistent data/architecture paths.  ￼

⸻

1. Delivery structure

Phase 1 — Core trust and correctness

Ship first.
	1.	Mobile final score correctness
	2.	Mobile prediction history correctness
	3.	Mobile standings/stats parity
	4.	Mobile fixture source unification
	5.	Mobile kickoff sorting correctness

Phase 2 — Parity and completeness

Ship second.
	6.	Mobile profile screen
	7.	Mobile settings/account screen
	8.	Mobile group admin parity
	9.	Forgot password flow
	10.	Invite deep link support

Phase 3 — Engagement

Ship third.
	11.	Notifications infrastructure
	12.	Weekly round winner
	13.	Achievements/badges
	14.	Personal performance page
	15.	Rank evolution / stats visualization

Phase 4 — Growth and shareability

Ship fourth.
	16.	Share results
	17.	Public/global leagues
	18.	Invite growth improvements

Phase 5 — Cleanup and architecture

Parallel or after each phase.
	19.	Repository abstraction consistency on mobile
	20.	Web cache/state cleanup
	21.	Remove dead/unused web components
	22.	Standardize auth guard strategy
	23.	Improve observability and QA coverage

⸻

2. Phase 1 — Core trust and correctness

2.1 Fix mobile final score correctness

Problem

Mobile currently derives final scores from fixture ID patterns instead of consuming real result payloads. This can show -- or incorrect final scores.  ￼

Target outcome

Every mobile fixture and historical prediction card shows real backend result scores, matching web.

Implementation steps

Backend/API
	1.	Review GET /api/fixture response structure on web.
	2.	Ensure /api/fixture includes for each fixture:
	•	fixture id
	•	kickoffAt
	•	status
	•	competition/fecha metadata
	•	home team info
	•	away team info
	•	final score fields
	•	live score fields if applicable
	•	lock state if useful
	3.	Confirm score fields are consistently populated for final fixtures.
	4.	If /api/fixture is insufficient, expand it rather than creating a second results shape.

Mobile repositories
	5.	Update the mobile fixture repository to consume /api/fixture instead of relying on /api/pronosticos-derived fixture data. The audit explicitly notes this discrepancy.  ￼
	6.	Create a single normalized fixture domain model for mobile:
	•	id
	•	status
	•	kickoffAt
	•	home
	•	away
	•	score: { home: number | null, away: number | null }
	•	displayStatus
	•	fechaId
	7.	Remove regex-based score extraction logic from:
	•	FixtureScreen
	•	PronosticosScreen
	•	any helper like explicitScoreFromFixtureId / deriveDisplayScore

UI
	8.	Update final-state fixture cards to render:
	•	score.home ?? "-" and score.away ?? "-" only when backend truly has no score
	9.	Update live cards to use live score fields from backend when available.
	10.	Ensure all filters still work: all, live, final, upcoming.

QA
	11.	Test with fixtures in all states:

	•	upcoming
	•	live
	•	final

	12.	Compare web vs mobile fixture screens for the same group/fecha.
	13.	Add regression test coverage for final score rendering.

Acceptance criteria
	•	No mobile screen derives scores from fixture IDs.
	•	Finalized fixtures show real scores.
	•	History cards and fixture cards show identical final scores as web for the same fixture.

⸻

2.2 Fix mobile prediction history correctness

Problem

Mobile history may show the user’s prediction instead of the real result when result data is missing.  ￼

Target outcome

Historical cards always show two clearly separated concepts:
	•	your prediction
	•	actual result

Implementation steps

Data model
	1.	Extend prediction/history card model to include both:
	•	userPrediction
	•	actualResult
	2.	Do not overload one field to represent both.

Backend/API
	3.	Ensure /api/pronosticos or the mobile history source returns:
	•	saved prediction
	•	actual score/result when fixture is final
	•	outcome classification if available:
	•	exact
	•	outcome hit
	•	miss

UI changes
	4.	Update history cards to show:
	•	“Tu pronóstico: 2-1”
	•	“Resultado final: 1-1”
	5.	Show points earned on that match if available.
	6.	If a match is not final yet:
	•	keep actual result hidden or marked as pending
	•	never fall back to the user prediction as actual result

Logic cleanup
	7.	Remove any fallback from committed draft/prediction into read-only actual score fields.
	8.	Add an invariant guard:
	•	if actualResult is absent and status is final, log an error/analytics event

QA
	9.	Verify cards for:
	•	predicted upcoming match
	•	live match
	•	finalized match with score
	•	finalized match with temporarily missing score payload

Acceptance criteria
	•	History never displays the user prediction as the final result.
	•	Prediction and result are visually distinct.
	•	Points per fixture are trustworthy.

⸻

2.3 Implement real mobile leaderboard and stats parity

Problem

Mobile standings stats are largely synthetic/placeholders, while web computes meaningful historical metrics.  ￼

Target outcome

Mobile stats use the same underlying data semantics as web.

Scope

Parity should include at least:
	•	total points
	•	exact predictions
	•	outcome hits
	•	misses
	•	rank
	•	best round
	•	worst round
	•	streaks if available
	•	awards/highlights equivalent to web stats mode

Implementation steps

Backend/API
	1.	Review the web leaderboard/stats data path:
	•	GET /api/leaderboard
	•	historical snapshots used in web stats mode
	2.	Decide on one of two approaches:
	•	expand /api/leaderboard to return ready-to-render stats payloads
	•	or expose a dedicated /api/stats endpoint
	3.	Prefer ready-to-render backend payload for consistency and to reduce duplicated client logic.

Data contract
	4.	Define a shared contract in packages/api-contracts for leaderboard stats.
	5.	Add a shared domain type in packages/domain for:
	•	leaderboard row
	•	member stats summary
	•	awards
	•	historical rank/points series

Mobile implementation
	6.	Replace synthetic stats templates in PosicionesScreen.
	7.	Fetch real stats payload from repository.
	8.	Render:
	•	current positions table
	•	stats mode toggle
	•	awards cards
	•	member performance metrics
	9.	Remove placeholder “world rank” unless you truly support a global rank source. The audit flags this as placeholder behavior.  ￼

UX
	10.	Preserve a clean progressive layout:

	•	top three metrics
	•	awards
	•	per-user summary
	•	historical trend section later in Phase 3

QA
	11.	Compare web stats output vs mobile output for same group/fecha/member.
	12.	Test ties and empty groups.
	13.	Test the leaderboard permissions edge case noted in the doc if group-wide prediction reads are restricted.  ￼

Acceptance criteria
	•	Mobile stats are backed by real data, not templates.
	•	Top-level metrics and awards are consistent with web.
	•	No synthetic reward placeholders remain.

⸻

2.4 Unify mobile fixture source with web

Problem

Mobile gets fixture-ish data from /api/pronosticos; web uses /api/fixture. This causes richness and correctness gaps.  ￼

Target outcome

A single source of truth for fixture browsing and historical result rendering.

Implementation steps
	1.	Define responsibilities:
	•	/api/fixture: fixture browsing and result display
	•	/api/pronosticos: prediction editing state, lock status, user’s saved picks
	2.	Stop using /api/pronosticos as the primary source for final/display score rendering.
	3.	Where a screen needs both:
	•	fetch fixture data from fixture API
	•	fetch user prediction data from prediction API
	•	merge locally by fixture id
	4.	Implement a shared merge helper in mobile repository/domain layer.

Acceptance criteria
	•	Fixture score display is always sourced from fixture/result data.
	•	Prediction state is sourced from prediction data.
	•	The responsibilities are cleanly separated.

⸻

2.5 Fix mobile kickoff sorting fallback

Problem

When kickoff is missing, mobile substitutes current time, which may reorder cards incorrectly.  ￼

Implementation steps
	1.	Remove new Date().toISOString() fallback for missing kickoff.
	2.	Use one of:
	•	null kickoff with safe sorting rule
	•	backend validation that kickoffAt is always present
	3.	Sorting rule:
	•	fixtures with real kickoff sort normally
	•	missing kickoff sorts last within its group
	4.	Emit analytics/logging for missing kickoff values.

Acceptance criteria
	•	Missing kickoff never fabricates chronology.
	•	Sorting remains stable and predictable.

⸻

3. Phase 2 — Parity and completeness

3.1 Mobile profile screen

Problem

Web has /perfil; mobile has no equivalent.  ￼

Target outcome

Users can view and edit profile on mobile.

Features to include
	•	view profile summary
	•	edit name
	•	edit username
	•	edit email
	•	optionally favorite team if supported by backend
	•	recent activity
	•	stats summary

Implementation steps
	1.	Add mobile navigation route:
	•	Perfil
	2.	Reuse GET /api/profile and PATCH /api/auth/me
	3.	Create repository methods:
	•	getProfile()
	•	updateProfile(payload)
	4.	Build screens/components:
	•	profile summary header
	•	stats cards
	•	recent activity list
	•	edit modal/screen
	5.	Add form validation aligned with server rules.

Acceptance criteria
	•	Profile is editable on mobile.
	•	Validation matches backend expectations.
	•	Recent activity and basic stats render successfully.

⸻

3.2 Mobile settings/account screen

Problem

Web has /configuracion/ajustes; mobile lacks a dedicated equivalent.  ￼

Target outcome

Mobile users can access account actions from a clear settings surface.

Features
	•	go to profile
	•	logout
	•	theme placeholder if you later support theming
	•	notification preferences later in Phase 3

Implementation steps
	1.	Add Ajustes screen or expand Configuracion with an account section.
	2.	Include:
	•	profile entry point
	•	logout action
	3.	Consider separating:
	•	group management
	•	account settings
for clearer IA.

Acceptance criteria
	•	Mobile has a discoverable account settings surface.
	•	Logout is not mixed awkwardly inside group admin flows.

⸻

3.3 Mobile group admin parity

Problem

Mobile lacks promote/kick/leave/delete/member management/share invite parity.  ￼

Target outcome

Admins and owners can fully manage a group from mobile.

Features
	•	member list
	•	role display
	•	promote member to admin
	•	remove member
	•	leave group
	•	delete group if allowed
	•	copy/share invite
	•	regenerate invite

Implementation steps

Backend
	1.	Reuse existing web API endpoints:
	•	GET /api/groups/:id/members
	•	PATCH /api/groups/:id/members
	•	DELETE /api/groups/:id/members
	•	POST /api/groups/leave
	•	DELETE /api/groups/:id
	•	GET /api/groups/:id/invite
	•	POST /api/groups/:id/invite/refresh

Mobile repositories
	2.	Add missing repository methods rather than direct fetch calls.
	3.	Remove raw requestGroupAdminJson usage by moving those behaviors into groupsRepository. The audit explicitly flags this architecture inconsistency.  ￼

UI
	4.	Build a group management sheet/screen with:
	•	group info
	•	members section
	•	invite section
	•	destructive actions section
	5.	Add confirmation dialogs for:
	•	kick member
	•	leave group
	•	delete group
	6.	Respect role constraints:
	•	admin cannot alter owner
	•	admin cannot alter other admins if backend forbids it
	•	self-destructive role actions handled safely

Acceptance criteria
	•	Mobile owners/admins can fully manage group lifecycle.
	•	All admin flows use repository abstraction.
	•	Destructive actions require confirmation.

⸻

3.4 Forgot password flow

Problem

Web has a forgot-password CTA but it is not wired.  ￼

Target outcome

Users can recover accounts.

Implementation steps
	1.	Decide recovery mechanism:
	•	PocketBase/native provider recovery if supported
	•	custom email reset flow
	2.	Add backend endpoint if needed:
	•	POST /api/auth/forgot-password
	3.	Add UI on web auth page:
	•	email input or modal
	•	success/failure state
	4.	Add equivalent entry point on mobile auth screen.
	5.	Add rate limiting and abuse protection.
	6.	Add generic response semantics:
	•	do not reveal whether email exists

Acceptance criteria
	•	The CTA performs a real recovery flow.
	•	Security and enumeration protection are in place.

⸻

3.5 Invite deep link support

Problem

Web supports invite query params; mobile deep link intake is unclear/missing.  ￼

Target outcome

Invite links open the app and guide the user into the correct group join flow.

Desired flow
	•	User taps invite link
	•	App opens
	•	If logged out: authenticate, then continue
	•	If logged in: join screen prefilled or auto-resolved
	•	Group joined
	•	User lands in group context

Implementation steps
	1.	Standardize invite link format:
	•	app URL with token parameter
	2.	Support:
	•	web deep link
	•	mobile app deep link
	3.	Add Expo linking config.
	4.	Add route handler in mobile root/navigation.
	5.	Persist pending invite token if auth is required before join.
	6.	On successful auth, resume invite join flow.
	7.	Add explicit success/failure screens/messages.

Acceptance criteria
	•	A shared invite URL works on web and mobile.
	•	Auth interruptions do not lose the invite token.
	•	Joined group becomes active group.

⸻

4. Phase 3 — Engagement

4.1 Notifications infrastructure

Problem

Notification buttons are visual only.  ￼

Target outcome

Users receive useful nudges around the prediction loop.

Notification MVP
	•	prediction closing soon
	•	match starting soon
	•	results published
	•	new round available
	•	someone joined your group
	•	weekly winner announced

Architecture
	1.	Decide push strategy:
	•	mobile push via Expo notifications
	•	web via email first, push later, or browser push
	2.	Add notification preferences model.
	3.	Add backend jobs/events for:
	•	fixture approaching lock
	•	round completion
	•	invite join event
	4.	Add notification inbox later if desired.

Implementation steps
	1.	Create notification domain/events map.
	2.	Store device token on mobile.
	3.	Build backend trigger service or scheduled jobs.
	4.	Add preferences UI:
	•	reminder toggles
	•	result toggles
	•	social toggles
	5.	Wire bell icon to a real inbox or preferences entry point.

Acceptance criteria
	•	Users can receive at least one meaningful push type.
	•	Bell button no longer dead-ends.
	•	Preferences can disable notifications.

⸻

4.2 Weekly round winner

Target outcome

At end of each fecha, surface the winner and create social reinforcement.

Implementation steps
	1.	Extend backend stats/leaderboard to compute round winner.
	2.	Add banner/card on Home and Positions:
	•	winner
	•	points
	•	tie handling
	3.	Optionally notify group members.
	4.	Add share CTA in Phase 4.

Acceptance criteria
	•	Completed rounds highlight a winner.
	•	Tie logic is defined.
	•	Users can easily see who won the last round.

⸻

4.3 Achievements/badges

Target outcome

Introduce a lightweight progression/reward layer.

MVP badge set
	•	first prediction submitted
	•	perfect prediction
	•	three exacts in a row
	•	round winner
	•	five rounds played
	•	first place in group

Implementation steps
	1.	Define badge taxonomy and unlock rules.
	2.	Decide:
	•	compute on read
	•	or persist badge unlock events
	3.	Prefer persisted unlock events once logic stabilizes.
	4.	Add UI:
	•	profile badges section
	•	achievement toast or modal on unlock
	5.	Add analytics for badge unlock rate.

Acceptance criteria
	•	Badge logic is deterministic.
	•	Users can view earned badges.
	•	Unlocks feel celebratory but unobtrusive.

⸻

4.4 Personal performance page

Target outcome

Give users a reason to keep returning beyond standings.

Metrics
	•	total points
	•	exact hit rate
	•	outcome hit rate
	•	misses
	•	average points per round
	•	best round
	•	streaks
	•	rank history

Implementation steps
	1.	Build on /api/profile or a dedicated stats endpoint.
	2.	Add profile sub-tabs:
	•	overview
	•	stats
	•	achievements
	3.	Reuse on web and mobile where possible.

Acceptance criteria
	•	Users can understand how well they are performing over time.
	•	The page is personal, not just group-wide.

⸻

4.5 Rank evolution / performance visualization

Target outcome

Make competition more emotionally legible.

Implementation steps
	1.	Add historical series in backend:
	•	rank by fecha
	•	points by fecha
	2.	Add simple chart on web and mobile.
	3.	Support hover/tap per point if desired later.

Acceptance criteria
	•	Users can see momentum over time.
	•	Data aligns with leaderboard snapshots.

⸻

5. Phase 4 — Growth and shareability

5.1 Share results

Target outcome

Enable organic sharing.

Share surfaces
	•	weekly winner card
	•	“I scored X points this round”
	•	“I’m first in my group”
	•	badge unlock

Implementation steps
	1.	Define shareable card payload/content.
	2.	For mobile:
	•	use native share sheet
	3.	For web:
	•	copy/share text, image export later
	4.	Add branded templates and dynamic data.

Acceptance criteria
	•	At least one meaningful share path exists.
	•	Shared content is readable and branded.

⸻

5.2 Public/global leagues

Goal

Add a broader competition layer beyond private groups.

Caution

Do this only after trust and parity are fixed.

MVP approach
	1.	Add one official/global group
	2.	Let users opt in
	3.	Show global rank separately from private groups
	4.	Only surface “world ranking” if truly supported, not placeholder

The audit notes placeholder ranking today, so do not fake this.  ￼

Acceptance criteria
	•	Global league is real, not cosmetic.
	•	Users understand difference between private and global scopes.

⸻

5.3 Invite growth improvements

Features
	•	“X joined via your invite”
	•	post-join celebration
	•	copy and share invite directly from mobile/web
	•	better invite landing states

Acceptance criteria
	•	Invite flows feel polished and social.
	•	Users are encouraged to bring in others.

⸻

6. Phase 5 — Architecture and cleanup

6.1 Mobile repository abstraction consistency

Problem

Some mobile admin actions bypass the repository layer.  ￼

Target outcome

All network access goes through repository interfaces/contracts.

Implementation steps
	1.	Inventory all direct fetch usage in mobile.
	2.	Move each into repository methods.
	3.	Update packages/api-contracts where necessary.
	4.	Ensure mock fallback compatibility where relevant.

Acceptance criteria
	•	No ad hoc fetch calls remain in feature screens.
	•	All mobile data access follows one pattern.

⸻

6.2 Web cache/state cleanup

Problem

Web uses multiple manual page-level caches that can drift.  ￼

Target outcome

More predictable data freshness and less bespoke cache logic.

Implementation steps
	1.	Inventory current manual caches:
	•	home
	•	predictions
	•	positions
	•	fixture
	2.	Decide whether to:
	•	keep manual caches and formalize invalidation
	•	or migrate to React Query/SWR
	3.	Prefer incremental migration rather than big bang.
	4.	Start with the noisiest/most error-prone screens.

Acceptance criteria
	•	Refetch behavior is consistent.
	•	Stale views are reduced.
	•	Cache invalidation paths are explicit.

⸻

6.3 Remove dead or unused web components

Problem

Several reusable components appear unused, along with duplicate selector modal implementations.  ￼

Implementation steps
	1.	Confirm unused status of:
	•	MatchCard
	•	LeaderboardTable
	•	FixtureDateCard
	•	TopHeader
	•	alternate home selector components
	•	duplicate group selector modal definitions
	2.	Decide:
	•	remove
	•	or restore into active use
	3.	Clean dead code to reduce confusion.

Acceptance criteria
	•	Active UI architecture is clearer.
	•	New contributors are not misled by stale components.

⸻

6.4 Standardize auth guard strategy on web

Problem

Mixed server-side and client-side auth guard strategy may lead to inconsistent SSR behavior.  ￼

Implementation steps
	1.	Audit all protected routes.
	2.	Define standard:
	•	server-protected for primary authenticated pages
	•	client fallback only where necessary
	3.	Apply consistently.
	4.	Add tests for unauthorized access behavior.

Acceptance criteria
	•	Auth redirection behavior is consistent across web routes.
	•	SSR/client discrepancies are reduced.

⸻

6.5 Improve observability and QA

Implementation steps
	1.	Add structured logging for:
	•	missing score payloads
	•	missing kickoffAt
	•	failed prediction save retries
	•	deep link invite failures
	•	group admin permission failures
	2.	Add analytics events for:
	•	prediction submitted
	•	invite shared
	•	invite joined
	•	weekly winner viewed
	•	badge unlocked
	3.	Expand test coverage:
	•	repository contract tests
	•	mobile UI regression tests
	•	endpoint contract tests
	•	parity checks for web/mobile data outputs

Acceptance criteria
	•	You can detect regressions in the most sensitive flows.
	•	Product usage becomes measurable.

⸻

7. Suggested ticket breakdown for Codex

Use these as execution units.

EPIC A — Data correctness
	•	A1: Replace mobile fixture data source with /api/fixture
	•	A2: Remove regex-based score parsing
	•	A3: Separate prediction vs actual result models
	•	A4: Fix kickoff sort fallback
	•	A5: Add tests for fixture/result correctness

EPIC B — Stats parity
	•	B1: Define shared leaderboard/stats contract
	•	B2: Expose backend-ready stats payload
	•	B3: Remove synthetic mobile stats
	•	B4: Implement real mobile stats UI
	•	B5: Add parity tests against web responses

EPIC C — Mobile account parity
	•	C1: Add mobile profile route and repository
	•	C2: Implement profile edit flow
	•	C3: Add mobile settings/account surface
	•	C4: Add validation parity with backend

EPIC D — Mobile group admin parity
	•	D1: Add repository methods for members/invites/leave/delete
	•	D2: Build member list UI
	•	D3: Add promote/kick flows
	•	D4: Add leave/delete confirmations
	•	D5: Add invite copy/share UI

EPIC E — Auth recovery and invite deep links
	•	E1: Implement forgot-password backend flow
	•	E2: Wire forgot-password on web
	•	E3: Add forgot-password on mobile
	•	E4: Add Expo deep linking for invites
	•	E5: Persist and resume pending invite join after auth

EPIC F — Notifications
	•	F1: Device token registration
	•	F2: Notification preference model and UI
	•	F3: Match lock reminder job
	•	F4: Results published notification
	•	F5: Weekly winner notification
	•	F6: Bell icon real destination

EPIC G — Engagement and growth
	•	G1: Weekly winner card
	•	G2: Achievements rules and persistence
	•	G3: Personal performance page
	•	G4: Rank evolution chart
	•	G5: Share results action

EPIC H — Cleanup
	•	H1: Remove direct fetches from mobile screens
	•	H2: Standardize repository usage
	•	H3: Audit/remove unused web components
	•	H4: Standardize auth guards
	•	H5: Improve logging and analytics

⸻

8. Recommended execution order for Codex

Give Codex the plan in this order:

Step 1

Implement EPIC A completely.

Reason: this fixes trust-breaking result errors.

Step 2

Implement EPIC B completely.

Reason: standings/stats credibility is core to the product.

Step 3

Implement EPIC D and C.

Reason: once trust is fixed, mobile parity becomes the biggest product gap.

Step 4

Implement EPIC E.

Reason: recovery and invite onboarding directly affect usability and growth.

Step 5

Implement EPIC F and G.

Reason: engagement loops matter most after the core app is trustworthy.

Step 6

Implement EPIC H.

Reason: cleanup should not block core delivery, but it should be completed before scaling further.

⸻

9. Definition of done by phase

Phase 1 done when
	•	Mobile score/result display matches backend truth
	•	History is no longer misleading
	•	Mobile stats are real, not synthetic

Phase 2 done when
	•	Mobile users can manage account and groups fully
	•	Password recovery exists
	•	Invite links work end-to-end on mobile

Phase 3 done when
	•	Users receive meaningful nudges
	•	Weekly competition feels visible
	•	Profiles show personal progress

Phase 4 done when
	•	Users can share outcomes
	•	Invite/growth loops are smoother
	•	Global/public competition is real if shipped

Phase 5 done when
	•	Data access patterns are consistent
	•	Web state/auth architecture is cleaner
	•	Dead code and drift are reduced

⸻

10. Product callouts: what to avoid
	1.	Do not add flashy social features before fixing score correctness.
If results are wrong, engagement features amplify distrust.
	2.	Do not keep fake global/world rank placeholders.
Remove placeholders until a real model exists.  ￼
	3.	Do not create duplicate APIs for mobile/web unless absolutely necessary.
Prefer shared contracts.
	4.	Do not let mobile keep bypassing repository abstraction.
That drift will worsen every future feature.  ￼
	5.	Do not ship deep links without pending-auth resume support.
Invite flows will feel broken.

⸻

11. Highest-value MVP subset

If you want the fastest meaningful improvement, do this exact subset first:
	1.	Replace mobile fixture source with /api/fixture
	2.	Remove regex/fallback score parsing
	3.	Separate actual result from user prediction in history
	4.	Replace synthetic mobile stats with real backend-driven stats
	5.	Add mobile group member management
	6.	Add mobile profile/settings
	7.	Implement forgot password
	8.	Implement invite deep linking

That set gives you the highest product improvement per engineering effort. It addresses the most severe audit gaps directly. 