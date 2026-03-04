## Summary

- [ ] `feat(invites-ui-api)` scope reviewed
- [ ] `feat(security-env-health)` scope reviewed
- [ ] `feat(pb-rules)` scope reviewed
- [ ] `test(api-and-security)` scope reviewed
- [ ] `chore(ci-readme)` scope reviewed
- [ ] `mobile-rewrite` scope reviewed (if touched: `apps/mobile`, `packages/*`, or mobile-related `apps/web` imports)
- [ ] Updated `docs/mobile-migration-plan.md` for this change set
- [ ] Linked the latest relevant entry in `## Decisions Log` from `docs/mobile-migration-plan.md`

## Mobile Phase 4 Tracking (if `mobile-rewrite` scope touched)

- [ ] Linked the exact `### Phase 4` checklist items completed in this PR
- [ ] Added/updated targeted mobile guard tests and listed exact commands run
- [ ] Added a `## Validation Log` entry in `docs/mobile-migration-plan.md` with pass/fail notes for:
- [ ] `pnpm run typecheck:web`
- [ ] `pnpm --filter @fulbito/mobile typecheck`
- [ ] `pnpm run build:web`

## Release Gates

- [ ] `npm run validate:release` passed locally
- [ ] CI is green on this commit
- [ ] PocketBase backup created before schema changes
- [ ] `pocketbase-m3-schema.json` applied and verified
- [ ] Two-user smoke passed (`npm run smoke:private`)

## Security / Config

- [ ] Production `SESSION_SECRET` configured
- [ ] Production `HEALTHCHECK_TOKEN` configured
- [ ] `/api/health/provider` access verified (anonymous denied, owner/admin or token allowed)

## Rollout / Rollback

- [ ] Controlled private rollout plan attached
- [ ] Rollback trigger/owner confirmed (`>5%` core failures for `>30m`)
