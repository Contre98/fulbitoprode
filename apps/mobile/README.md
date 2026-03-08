# Fulbito Mobile

React Native (Expo) client for Fulbito Prode.

## Backend wiring

- Mobile calls the standalone API service (`/api/...`), not PocketBase directly.
- API service calls PocketBase (`POCKETBASE_URL`).

Current infrastructure check:

- PocketBase CT `113` on Proxmox node `pve` is running.
- PocketBase serves on `0.0.0.0:8090`.
- `https://pb.fulbitoprode.com/api/health` returns `200`.

## Required env

1. Copy env template:

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

2. Set `EXPO_PUBLIC_API_BASE_URL`:

- Hosted API: `https://app.fulbitoprode.com`
- iOS simulator: `http://localhost:3000`
- Android emulator: `http://10.0.2.2:3000`
- Physical device: `http://<YOUR_LAN_IP>:3000`

3. Keep mock fallback disabled for real auth/data:

- `EXPO_PUBLIC_ENABLE_MOCK_FALLBACK=false` (recommended/default)
- Set `true` only for offline UI testing with mock repositories.

## Run

From repo root:

```bash
pnpm --filter @fulbito/api dev
pnpm --filter @fulbito/mobile dev
```

If mobile cannot reach backend, check:

1. API is reachable at `<EXPO_PUBLIC_API_BASE_URL>/api/auth/me` (expect `401` when logged out).
2. API env contains `POCKETBASE_URL` and `SESSION_SECRET`.
3. PocketBase health endpoint is `200`.
