# Fulbito API

Standalone Hono backend for the mobile app.

## Required env

- `POCKETBASE_URL`
- `SESSION_SECRET`
- `API_FOOTBALL_BASE_URL`
- `API_FOOTBALL_KEY`
- `HEALTHCHECK_TOKEN` (optional)
- `PUBLIC_APP_URL` (optional, invite URL fallback)

## Run

```bash
pnpm --filter @fulbito/api dev
```

API listens on `http://localhost:3000` by default.
