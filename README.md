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

## Mobile Runtime Notes

- Use Node `20.x` or `22.x` for `apps/mobile` commands.
- If Homebrew has multiple Node versions installed, prepend the expected runtime:
  - `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`
- Mobile smoke commands:
  - `pnpm --filter @fulbito/mobile ios:smoke`
  - `pnpm --filter @fulbito/mobile android:smoke`
- Targeted mobile test command:
  - `pnpm --filter @fulbito/mobile test -- ConfiguracionScreen.actions.test.tsx`
