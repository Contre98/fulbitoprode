## Summary

- [ ] `feat(invites-ui-api)` scope reviewed
- [ ] `feat(security-env-health)` scope reviewed
- [ ] `feat(pb-rules)` scope reviewed
- [ ] `test(api-and-security)` scope reviewed
- [ ] `chore(ci-readme)` scope reviewed

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
