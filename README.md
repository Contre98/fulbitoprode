# Fulbito Prode Monorepo

Monorepo layout:

- `apps/api`: standalone Hono API service (mobile backend)
- `apps/mobile`: React Native/Expo app
- `packages/domain`: shared domain models and business logic
- `packages/api-contracts`: backend-agnostic repository contracts
- `packages/design-tokens`: shared design token primitives
- `packages/server-core`: shared backend modules (PocketBase/provider/auth/session/rate limit)

## Tooling

- Package manager: `pnpm`
- Task runner/cache: `turbo`

## Common Commands

```bash
pnpm install
pnpm run dev:api
pnpm run lint:api
pnpm run typecheck:api
pnpm run test:run
pnpm run build:api
```

## Mobile Runtime Notes

- Use Node `20.x` or `22.x` for `apps/mobile` commands.
- If Homebrew has multiple Node versions installed, prepend the expected runtime:
  - `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`
- Mobile smoke commands:
  - `pnpm --filter @fulbito/mobile ios:smoke`
  - `pnpm --filter @fulbito/mobile android:smoke`
- Targeted mobile test command:
  - `pnpm --filter @fulbito/mobile test -- ConfiguracionScreen.actions.test.tsx`
