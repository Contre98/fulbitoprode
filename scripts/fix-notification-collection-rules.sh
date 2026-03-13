#!/bin/bash
# Patches notification_* collection rules from null → "" (allow public access)
# Run this on your PocketBase container (Proxmox)
# Usage: ./fix-notification-collection-rules.sh

PB_URL="http://localhost:8090"
PB_EMAIL="your-admin@email.com"   # <-- change this
PB_PASSWORD="your-admin-password" # <-- change this

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

OPEN_RULES='{"listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":null}'

patch_rules() {
  local NAME=$1
  echo -n "Patching rules for $NAME... "
  RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$PB_URL/api/collections/$NAME" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$OPEN_RULES")
  if [ "$RESULT" = "200" ]; then
    echo "OK"
  else
    echo "FAILED ($RESULT)"
  fi
}

patch_rules "notification_device_tokens"
patch_rules "notification_preferences"
patch_rules "notification_inbox"
patch_rules "notification_events"
patch_rules "notification_jobs"
patch_rules "notification_deliveries"

echo ""
echo "Done! Restart your API server and test again."
