# Fulbito Prode Monorepo

Monorepo layout:

- `apps/web`: existing Next.js web app
- `apps/mobile`: React Native/Expo app (bootstrap happens on mobile branch)
- `packages/domain`: shared domain models and business logic
- `packages/api-contracts`: backend-agnostic repository contracts
- `packages/design-tokens`: shared design token primitives

## Tooling

- Package manager: `pnpm`
- Task runner/cache: `turbo`

## Common Commands

```bash
pnpm install
pnpm run dev:web
pnpm run lint:web
pnpm run typecheck:web
pnpm run test:run
pnpm run build:web
```
