# API Cutover Runbook (Mobile-First)

## Purpose
Operational checklist for Phase 7 cutover tasks after extracting standalone `apps/api`.

## Preconditions
- Branch containing migration changes is deployed-ready (`mobile-first-api-extraction` baseline).
- Environment variables for `apps/api` are configured in target environment:
  - `SESSION_SECRET`
  - PocketBase connection/auth variables
  - provider variables for Liga/API-Football
- Mobile app points to stable API base URL (`EXPO_PUBLIC_API_BASE_URL`).

## Rollback Anchor
- Git rollback tag: `rollback-pre-api-extraction-f126fc1`
- Verify tag exists in remote before cutover:
  - `git fetch --tags`
  - `git tag --list 'rollback-pre-api-extraction-f126fc1'`

## Deployment Steps
1. Build and typecheck before deploy:
   - `pnpm run typecheck`
   - `pnpm run build`
2. Deploy `apps/api` to target runtime.
3. Confirm process is healthy:
   - `GET /api/health/pocketbase` returns `200` (or `503` only if intentionally allowing degraded rollout).
4. If provider health token is configured, confirm provider health:
   - `GET /api/health/provider` with `x-healthcheck-token`.

## Post-Deploy Smoke (Required)
Run the deployed smoke script against the live base URL:

```bash
FULBITO_API_BASE_URL="https://<api-domain>" \
SMOKE_EMAIL="<existing-user-email>" \
SMOKE_PASSWORD="<existing-user-password>" \
FULBITO_HEALTHCHECK_TOKEN="<optional-token>" \
pnpm run smoke:api:deployed
```

Optional flags:
- `SMOKE_GROUP_ID=<group-id>`: force group-scoped checks on a specific group.
- `SMOKE_PERIOD=<period-id>`: force period for fixture/leaderboard/pronosticos checks.
- `SMOKE_ALLOW_DEGRADED_HEALTH=1`: allow `503` on health probes while debugging infra.
- `SMOKE_REQUIRE_GROUP=0`: skip group-scoped checks if test user has no groups.

## What the Smoke Script Verifies
- Health endpoint reachability (`/api/health/pocketbase`, optional `/api/health/provider`)
- Auth lifecycle:
  - login
  - authenticated `/api/auth/me`
  - refresh
  - logout
  - revoked refresh token rejected after logout
- Unauthorized access guard for protected endpoint (`/api/groups` without bearer).
- Mobile-critical routes (if a group exists):
  - `/api/groups`
  - `/api/fechas`
  - `/api/pronosticos`
  - `/api/fixture`
  - `/api/leaderboard`
  - `/api/profile`

## Rollback Procedure
If cutover smoke fails in production:
1. Revert traffic to previous stable deployment.
2. Inspect API logs using `requestId`/`traceId` from failed responses.
3. Compare failing behavior against rollback tag baseline:
   - `rollback-pre-api-extraction-f126fc1`
4. Apply fix in branch, redeploy, rerun smoke, then resume cutover.

## Evidence to Record
- Deploy timestamp and commit SHA.
- Smoke command used (redact secrets).
- Smoke output summary and failed step (if any).
- Decision: proceed / rollback.
