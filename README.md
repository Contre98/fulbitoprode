# Fulbito Prode 2.0

Next.js + PocketBase + API-Football app for group-based football score predictions.

## Requirements

- Node.js 20+
- npm 10+
- PocketBase instance with `pocketbase-m3-schema.json` applied
- API-Football key

## Environment

Copy `.env.example` to `.env.local` and set at minimum:

- `POCKETBASE_URL`
- `SESSION_SECRET`
- `API_FOOTBALL_BASE_URL`
- `API_FOOTBALL_KEY`

Optional:

- `HEALTHCHECK_TOKEN` for `/api/health/provider`
- `NEXT_PUBLIC_APP_URL` for invite deep links

## Local Run

```bash
npm install
npm run dev
```

App routes:

- `/auth`
- `/` (Inicio)
- `/pronosticos`
- `/posiciones`
- `/fixture`
- `/configuracion`

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Release gate shortcuts:

```bash
npm run validate:release:full
npm run validate:release
```

Private two-user smoke:

```bash
npm run smoke:private -- --base-url=http://localhost:3000
```

## PocketBase Migration / Rollback

Follow `CT113-PocketBase-Migration-Checklist.md` for backup, schema migration, smoke test, and rollback.

## Launch Procedure

Use `docs/LAUNCH_RUNBOOK.md` for the phase-by-phase private launch procedure, public launch gate, rollout monitoring, and rollback triggers.

## Deployment Notes

1. Apply PocketBase schema/rules from `pocketbase-m3-schema.json`.
2. Set production env vars, especially `SESSION_SECRET`.
3. Run CI checks (lint, typecheck, tests, build) before deploy.
4. After deploy, run auth/group/invite/prediction smoke tests with two users.
5. Configure external rate limiting at edge/proxy; the app also enforces in-memory limits for auth/prediction writes.
