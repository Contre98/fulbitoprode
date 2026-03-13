#!/bin/bash
# Run this on your PocketBase container (Proxmox)
# Usage: ./create-notification-collections.sh

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

create_collection() {
  local NAME=$1
  local BODY=$2
  echo -n "Creating $NAME... "
  RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PB_URL/api/collections" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  if [ "$RESULT" = "200" ] || [ "$RESULT" = "201" ]; then
    echo "OK ($RESULT)"
  else
    echo "FAILED ($RESULT) - may already exist, continuing..."
  fi
}

create_collection "notification_device_tokens" '{
  "name": "notification_device_tokens",
  "type": "base",
  "fields": [
    {"name":"user_id","type":"text","required":true},
    {"name":"token","type":"text","required":true},
    {"name":"platform","type":"text","required":true},
    {"name":"provider","type":"text","required":true},
    {"name":"app_version","type":"text"},
    {"name":"registered_at","type":"date","required":true},
    {"name":"last_seen_at","type":"date","required":true},
    {"name":"invalidated_at","type":"date"}
  ],
  "indexes": [
    "CREATE INDEX idx_ndt_user_id ON notification_device_tokens (user_id)",
    "CREATE UNIQUE INDEX idx_ndt_user_token ON notification_device_tokens (user_id, token)"
  ]
}'

create_collection "notification_preferences" '{
  "name": "notification_preferences",
  "type": "base",
  "fields": [
    {"name":"user_id","type":"text","required":true},
    {"name":"reminders","type":"bool"},
    {"name":"results","type":"bool"},
    {"name":"social","type":"bool"}
  ],
  "indexes": [
    "CREATE UNIQUE INDEX idx_np_user_id ON notification_preferences (user_id)"
  ]
}'

create_collection "notification_inbox" '{
  "name": "notification_inbox",
  "type": "base",
  "fields": [
    {"name":"user_id","type":"text","required":true},
    {"name":"event_type","type":"text","required":true},
    {"name":"title","type":"text","required":true},
    {"name":"body","type":"text","required":true},
    {"name":"read","type":"bool"},
    {"name":"idempotency_key","type":"text"},
    {"name":"data_json","type":"text"}
  ],
  "indexes": [
    "CREATE INDEX idx_ni_user_id ON notification_inbox (user_id)",
    "CREATE INDEX idx_ni_user_read ON notification_inbox (user_id, read)",
    "CREATE INDEX idx_ni_idempotency ON notification_inbox (user_id, idempotency_key)"
  ]
}'

create_collection "notification_events" '{
  "name": "notification_events",
  "type": "base",
  "fields": [
    {"name":"event_type","type":"text","required":true},
    {"name":"scope","type":"text","required":true},
    {"name":"target_ids_json","type":"text"},
    {"name":"title","type":"text","required":true},
    {"name":"body","type":"text","required":true},
    {"name":"data_json","type":"text"},
    {"name":"idempotency_key","type":"text","required":true},
    {"name":"status","type":"text","required":true},
    {"name":"processed_at","type":"date"}
  ],
  "indexes": [
    "CREATE UNIQUE INDEX idx_ne_idempotency ON notification_events (idempotency_key)",
    "CREATE INDEX idx_ne_status ON notification_events (status)",
    "CREATE INDEX idx_ne_event_type ON notification_events (event_type)"
  ]
}'

create_collection "notification_jobs" '{
  "name": "notification_jobs",
  "type": "base",
  "fields": [
    {"name":"event_id","type":"text","required":true},
    {"name":"status","type":"text","required":true},
    {"name":"total_recipients","type":"number"},
    {"name":"sent","type":"number"},
    {"name":"failed","type":"number"},
    {"name":"started_at","type":"date"},
    {"name":"completed_at","type":"date"},
    {"name":"error","type":"text"}
  ],
  "indexes": [
    "CREATE INDEX idx_nj_event_id ON notification_jobs (event_id)",
    "CREATE INDEX idx_nj_status ON notification_jobs (status)"
  ]
}'

create_collection "notification_deliveries" '{
  "name": "notification_deliveries",
  "type": "base",
  "fields": [
    {"name":"job_id","type":"text","required":true},
    {"name":"user_id","type":"text","required":true},
    {"name":"token_id","type":"text","required":true},
    {"name":"status","type":"text","required":true},
    {"name":"attempts","type":"number"},
    {"name":"last_attempt_at","type":"date"},
    {"name":"provider_message_id","type":"text"},
    {"name":"error","type":"text"}
  ],
  "indexes": [
    "CREATE INDEX idx_nd_job_id ON notification_deliveries (job_id)",
    "CREATE INDEX idx_nd_user_id ON notification_deliveries (user_id)",
    "CREATE INDEX idx_nd_status ON notification_deliveries (status)"
  ]
}'

echo ""
echo "Done! Check PocketBase admin to verify collections were created."
