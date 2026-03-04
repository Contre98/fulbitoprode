# Mobile QA Checklist

## Scope
Manual regression checklist for the mobile rewrite in `apps/mobile`, focused on persistence and cross-tab state consistency for:
- `Pronósticos`
- `Posiciones`
- `Fixture`

## Preconditions
1. Use Node `22.x` (or `20.x`) in terminal.
2. Start app with one of:
   - `pnpm --filter @fulbito/mobile ios:smoke`
   - `pnpm --filter @fulbito/mobile android:smoke`
3. Ensure the user is authenticated (mock or HTTP session mode).

## Cross-tab Persistence
1. Open `Pronósticos`.
2. Select a non-default `Grupo` (if more than one group exists).
3. Select a non-default `Fecha`.
4. Navigate to `Posiciones` and confirm the same `Grupo` and `Fecha` are selected.
5. Navigate to `Fixture` and confirm the same `Grupo` and `Fecha` are selected.
6. Navigate back to `Pronósticos` and confirm values did not reset.

## Restart Persistence
1. With non-default `Grupo` and `Fecha` selected, fully close the app.
2. Reopen the app.
3. Verify `Pronósticos` restores the same `Grupo` and `Fecha`.
4. Verify `Posiciones` and `Fixture` reflect the same restored values.

## Data Mode / Diagnostics
1. Confirm `DataModeBadge` is visible in screen header area.
2. In mock mode, verify:
   - `Mock Fallback` label is visible.
   - Current fallback reason appears in development.
   - Recent fallback history entries appear in development.
3. Tap `Reintentar HTTP` and verify app remains stable.

## Result Template
- Device/Platform:
- Build command:
- Session mode (`HTTP Session` / `Mock Fallback`):
- Cross-tab persistence: `Pass/Fail`
- Restart persistence: `Pass/Fail`
- Diagnostics rendering: `Pass/Fail`
- Notes / screenshots:
