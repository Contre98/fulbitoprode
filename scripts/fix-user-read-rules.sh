#!/bin/bash
# Patches PocketBase `users` list/view rules so authenticated users can resolve
# display names used by group leaderboard/member listings.
#
# Usage:
#   PB_URL=http://localhost:8090 PB_EMAIL=admin@example.com PB_PASSWORD='secret' ./scripts/fix-user-read-rules.sh

set -euo pipefail

PB_URL="${PB_URL:-http://localhost:8090}"
PB_EMAIL="${PB_EMAIL:-}"
PB_PASSWORD="${PB_PASSWORD:-}"

if [ -z "$PB_EMAIL" ] || [ -z "$PB_PASSWORD" ]; then
  echo "ERROR: set PB_EMAIL and PB_PASSWORD environment variables."
  exit 1
fi

echo "Authenticating as PocketBase superuser..."
TOKEN=$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$PB_EMAIL\",\"password\":\"$PB_PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not get auth token. Check PB_URL/PB_EMAIL/PB_PASSWORD."
  exit 1
fi

echo -n "Patching users listRule & viewRule... "
RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$PB_URL/api/collections/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listRule":"@request.auth.id != \"\"","viewRule":"@request.auth.id != \"\""}')

if [ "$RESULT" = "200" ]; then
  echo "OK"
else
  echo "FAILED ($RESULT)"
  exit 1
fi

echo "Done. Restart API and reload posiciones."
