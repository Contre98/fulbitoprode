# Fulbito Prode Launch Runbook

This runbook implements the revised launch procedure with strict gates and evidence.

## Scope

- `private launch`: controlled rollout for invited groups.
- `public launch`: open signup/untrusted traffic. Blocked until post-private hardening is done.

## Phase 1: Freeze and Baseline

1. Use release branch: `release-private-launch-readiness`.
2. Freeze feature work while launch gates are executed.
3. Keep commits scoped by intent:
   - `feat(invites-ui-api)`
   - `feat(security-env-health)`
   - `feat(pb-rules)`
   - `test(api-and-security)`
   - `chore(ci-readme)`
4. Keep unrelated experiments out of release.

### Exit Criteria

- `git status` contains only intended launch files.
- Commits are reviewable and scoped.

## Phase 2: Deterministic Validation

Run full validation:

```bash
npm run validate:release:full
```

Fast rerun after dependency install:

```bash
npm run validate:release
```

CI must run the same gate set (`lint`, `typecheck`, `test:run`, `build`) on PR and `main`.

### Exit Criteria

- Local and CI are green on the same commit SHA.
- No flaky retries.

## Phase 3: Production Config and Secrets

Required env:

- `POCKETBASE_URL`
- `SESSION_SECRET` (mandatory in production)
- `API_FOOTBALL_BASE_URL`
- `API_FOOTBALL_KEY`
- `NEXT_PUBLIC_APP_URL`
- `HEALTHCHECK_TOKEN` (strongly recommended mandatory in production)

### Verification

- Remove `SESSION_SECRET` in a production-like run and confirm startup fails.
- Restore valid secret and confirm startup succeeds.

### Exit Criteria

- App boots cleanly with full env.
- App refuses insecure boot without required secrets.

## Phase 4: PocketBase Migration + Authorization Validation

Follow `CT113-PocketBase-Migration-Checklist.md` exactly:

1. Backup PocketBase data.
2. Apply `pocketbase-m3-schema.json`.
3. Validate rules with two users in different groups:
   - cross-group reads denied for `groups`, `group_members`, `group_invites`
   - same-group reads/writes allowed
4. Confirm rollback backup is restorable.

### Exit Criteria

- Rule behavior matches expected authorization model.
- Rollback artifact verified.

## Phase 5: Private Launch Smoke

Automated smoke runner:

```bash
npm run smoke:private -- --base-url=http://localhost:3000
```

Optional for health header validation:

```bash
HEALTHCHECK_TOKEN=<token> npm run smoke:private -- --base-url=https://app.fulbitoprode.com
```

Smoke validates:

1. Register user A and B
2. A creates group and receives invite
3. B joins with invite token
4. Invite refresh authz (owner pass, member fail)
5. Health endpoint authz (anonymous fail, owner pass, optional token pass)
6. B posts prediction
7. A reads leaderboard

### Exit Criteria

- Smoke passes end-to-end with fresh users.
- No placeholder/demo blockers in core flow.

## Phase 6: Controlled Private Rollout

1. Deploy to invite-only cohort.
2. Monitor for first 72 hours:
   - auth failures
   - invite join failures
   - prediction write failures
   - provider fallback frequency
3. Rollback trigger:
   - `>5%` core-flow failures sustained for `>30m`.
4. Rollback action:
   - revert app release
   - restore PocketBase backup when schema/rules are root cause

## Phase 7: Public Launch Gate (Blocked Until Complete)

Do not open public signup until all are green:

1. Rate limiting audited under load with edge/proxy enforcement.
2. Anti-abuse controls (captcha and/or email verification).
3. Observability and alerts (Sentry + uptime + error-rate alarms).
4. Backup/restore drill evidence with RTO/RPO.
5. Load/capacity envelope documented.
6. Incident runbook with on-call ownership.

## API/Contract Preservation

1. `GET /api/groups/[groupId]/invite`
   - `{ invite: { code, token, expiresAt } | null, canRefresh }`
2. `POST /api/groups`
   - frontend must consume `invite`.
3. `GET /api/health/provider`
   - restricted to owner/admin session or `x-healthcheck-token`.
4. Types in `src/lib/types.ts`:
   - `GroupInvite`
   - `GroupInvitePayload`
   - `CreateGroupResponse`
   - `RefreshInviteResponse`

## Evidence Checklist (per release)

- Validation log output (`validate:release*`).
- CI URL for green commit SHA.
- PocketBase backup artifact name/time.
- Two-user smoke output.
- Rollback plan confirmation and owner.
