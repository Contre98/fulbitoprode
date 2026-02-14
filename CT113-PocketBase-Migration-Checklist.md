# CT 113 PocketBase Migration Checklist (Fulbito M3)

This checklist applies the schema in `pocketbase-m3-schema.json` and validates your current Next.js integration.

## 1) Backup current PocketBase data

Run on **[PROXMOX HOST SHELL]**:

```bash
pct exec 113 -- sh -lc 'mkdir -p /root/pb-backups && tar -czf /root/pb-backups/pb-data-$(date +%F-%H%M).tgz /opt/pocketbase/pb_data 2>/dev/null || true'
```

## 2) Confirm Next app environment

Run on **[LOCAL TERMINAL]** in your project:

```bash
grep -E '^(POCKETBASE_URL|PB_URL|NEXT_PUBLIC_PB_URL|SESSION_SECRET)=' /Users/contre/Documents/Fulbito\ Prode\ 2.0/.env.local
```

Recommended values in `.env.local`:

```env
POCKETBASE_URL=https://pb.fulbitoprode.com
SESSION_SECRET=your_long_random_secret
```

Aliases also work in code:

```env
PB_URL=https://pb.fulbitoprode.com
NEXT_PUBLIC_PB_URL=https://pb.fulbitoprode.com
```

## 3) Apply schema and rules in PocketBase Admin

1. Open: `https://pb.fulbitoprode.com/_/`
2. Ensure email/password auth is enabled for `users` auth collection.
3. Create/update these collections and fields to match exactly:
   - `users` (auth)
   - `groups`
   - `group_members`
   - `group_invites`
   - `predictions`
4. Apply indexes listed in `pocketbase-m3-schema.json`.
5. Apply list/view/create/update/delete rules from `pocketbase-m3-schema.json`.
   - For group leaderboard ranking, ensure `predictions` list/view rules let active group members read predictions in their groups.
   - Suggested `predictions` list/view rule pattern:
     - `@request.auth.id != '' && (user_id = @request.auth.id || (@collection.group_members.user_id ?= @request.auth.id && @collection.group_members.group_id ?= group_id && @collection.group_members.status ?= 'active'))`

## 4) Restart Next app after env/schema updates

Run on **[LOCAL TERMINAL]**:

```bash
cd /Users/contre/Documents/Fulbito\ Prode\ 2.0 && npm run dev
```

## 5) Smoke test API flows

Run on **[LOCAL TERMINAL]**:

```bash
curl -s -X POST http://localhost:3000/api/auth/register-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@fulbito.local","password":"testpass123","name":"Test User"}'

curl -s -X POST http://localhost:3000/api/auth/login-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@fulbito.local","password":"testpass123"}'
```

Then verify app flows in browser:

- `/auth` -> register/login with email + password
- create/list groups
- join group by code/token
- `/pronosticos` writes scoped predictions with `groupId`
- `/posiciones` reads group-aware leaderboard endpoint

## 6) Rollback (if needed)

Run on **[PROXMOX HOST SHELL]**:

```bash
pct exec 113 -- sh -lc 'systemctl stop pocketbase || true; tar -xzf /root/pb-backups/<backup-file>.tgz -C /; systemctl start pocketbase || true'
```

Then restart your Next app again.
