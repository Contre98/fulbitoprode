# Mobile Test Harness Scaffold

This folder is reserved for React Native test files once dependencies are available.

Expected test path:

- `src/test/**/*.test.ts`
- `src/test/**/*.test.tsx`

Current harness entrypoint:

- `pnpm --filter @fulbito/mobile test`

If required test packages are missing, the runner exits cleanly and prints install guidance.

Recommended first smoke tests:

- `DataModeBadge` rendering for `http` and `mock` modes.
- `FechaSelector` interaction updates selected period state.
- `GroupSelector` interaction updates selected membership state.
