#!/bin/bash
# Patches the `groups` and `group_members` collection listRule/viewRule so that
# any authenticated user can discover groups (needed for the search screen).
#
# Run this on your PocketBase server (or wherever you can reach PB directly).
# Usage: ./fix-group-search-rules.sh

PB_URL="http://localhost:8090"
PB_EMAIL="facucontre98@gmail.com"   # <-- change this
PB_PASSWORD="GmS8Zn6kX>5euW:" # <-- change this

# Get superuser auth token
echo "Authenticating..."
TOKEN=$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$PB_EMAIL\",\"password\":\"$PB_PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not get auth token. Check your email/password."
  exit 1
fi
echo "Authenticated OK"

# Allow any authenticated user to list/view groups
# (empty string = any authenticated user; null = superuser only)
echo -n "Patching groups listRule & viewRule... "
RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$PB_URL/api/collections/groups" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listRule":"@request.auth.id != \"\"","viewRule":"@request.auth.id != \"\""}')
if [ "$RESULT" = "200" ]; then
  echo "OK"
else
  echo "FAILED ($RESULT)"
fi

# Allow any authenticated user to list/view group_members (for member counts)
echo -n "Patching group_members listRule & viewRule... "
RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$PB_URL/api/collections/group_members" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listRule":"@request.auth.id != \"\"","viewRule":"@request.auth.id != \"\""}')
if [ "$RESULT" = "200" ]; then
  echo "OK"
else
  echo "FAILED ($RESULT)"
fi

echo ""
echo "Done! Group search should now show all groups to any authenticated user."
