#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSWORD="${SMOKE_PASSWORD:-testpass123}"
HEALTHCHECK_TOKEN="${HEALTHCHECK_TOKEN:-}"
GROUP_NAME_PREFIX="${GROUP_NAME_PREFIX:-Smoke Group}"
RUN_ID="$(date +%s)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
      shift 2
      ;;
    --healthcheck-token)
      HEALTHCHECK_TOKEN="$2"
      shift 2
      ;;
    --group-prefix)
      GROUP_NAME_PREFIX="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required." >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cookie_a="${tmp_dir}/a.cookie"
cookie_b="${tmp_dir}/b.cookie"

email_a="smoke-a-${RUN_ID}@fulbito.local"
email_b="smoke-b-${RUN_ID}@fulbito.local"
name_a="Smoke A ${RUN_ID}"
name_b="Smoke B ${RUN_ID}"
group_name="${GROUP_NAME_PREFIX} ${RUN_ID}"

read_status_and_body() {
  local raw="$1"
  HTTP_STATUS="${raw##*$'\n'}"
  HTTP_BODY="${raw%$'\n'*}"
}

json_get() {
  local path="$1"
  node -e '
const fs = require("node:fs");
const path = process.argv[1];
const input = fs.readFileSync(0, "utf8");
const data = JSON.parse(input);
let current = data;
for (const segment of path.split(".")) {
  if (!segment) continue;
  if (current === null || current === undefined || !(segment in current)) process.exit(2);
  current = current[segment];
}
if (current === null || current === undefined) process.exit(2);
if (typeof current === "object") {
  process.stdout.write(JSON.stringify(current));
} else {
  process.stdout.write(String(current));
}
' "$path"
}

json_find_upcoming() {
  node -e '
const fs = require("node:fs");
const input = fs.readFileSync(0, "utf8");
const data = JSON.parse(input);
if (!Array.isArray(data.matches)) process.exit(2);
const found = data.matches.find((item) => item && item.status === "upcoming");
if (!found || !found.id) process.exit(2);
process.stdout.write(String(found.id));
'
}

assert_status() {
  local expected="$1"
  local got="$2"
  local title="$3"
  if [[ "$expected" != "$got" ]]; then
    echo "FAIL: ${title} (expected ${expected}, got ${got})" >&2
    echo "Response body: ${HTTP_BODY}" >&2
    exit 1
  fi
  echo "PASS: ${title}"
}

assert_status_one_of() {
  local got="$1"
  local title="$2"
  shift 2
  for expected in "$@"; do
    if [[ "$got" == "$expected" ]]; then
      echo "PASS: ${title} (${got})"
      return 0
    fi
  done
  echo "FAIL: ${title} (got ${got}, expected one of: $*)" >&2
  echo "Response body: ${HTTP_BODY}" >&2
  exit 1
}

echo "Private smoke test started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Base URL: ${BASE_URL}"

raw="$(curl -sS -X POST "${BASE_URL}/api/auth/register-password" \
  -H "Content-Type: application/json" \
  -c "${cookie_a}" \
  -w $'\n%{http_code}' \
  -d "{\"email\":\"${email_a}\",\"password\":\"${PASSWORD}\",\"name\":\"${name_a}\"}")"
read_status_and_body "$raw"
assert_status "201" "$HTTP_STATUS" "register user A"

raw="$(curl -sS -X POST "${BASE_URL}/api/auth/register-password" \
  -H "Content-Type: application/json" \
  -c "${cookie_b}" \
  -w $'\n%{http_code}' \
  -d "{\"email\":\"${email_b}\",\"password\":\"${PASSWORD}\",\"name\":\"${name_b}\"}")"
read_status_and_body "$raw"
assert_status "201" "$HTTP_STATUS" "register user B"

raw="$(curl -sS -X POST "${BASE_URL}/api/groups" \
  -H "Content-Type: application/json" \
  -b "${cookie_a}" \
  -w $'\n%{http_code}' \
  -d "{\"name\":\"${group_name}\"}")"
read_status_and_body "$raw"
assert_status "201" "$HTTP_STATUS" "create group with user A"

group_id="$(printf '%s' "$HTTP_BODY" | json_get "group.id")"
invite_token="$(printf '%s' "$HTTP_BODY" | json_get "invite.token")"
initial_invite_token="$invite_token"

raw="$(curl -sS -X GET "${BASE_URL}/api/groups/${group_id}/invite" \
  -b "${cookie_a}" \
  -w $'\n%{http_code}')"
read_status_and_body "$raw"
assert_status "200" "$HTTP_STATUS" "get active invite as owner"

raw="$(curl -sS -X POST "${BASE_URL}/api/groups/join" \
  -H "Content-Type: application/json" \
  -b "${cookie_b}" \
  -w $'\n%{http_code}' \
  -d "{\"codeOrToken\":\"${invite_token}\"}")"
read_status_and_body "$raw"
assert_status "200" "$HTTP_STATUS" "join group with user B"

raw="$(curl -sS -X POST "${BASE_URL}/api/groups/${group_id}/invite/refresh" \
  -b "${cookie_b}" \
  -w $'\n%{http_code}')"
read_status_and_body "$raw"
assert_status "403" "$HTTP_STATUS" "member cannot refresh invite"

raw="$(curl -sS -X POST "${BASE_URL}/api/groups/${group_id}/invite/refresh" \
  -b "${cookie_a}" \
  -w $'\n%{http_code}')"
read_status_and_body "$raw"
assert_status "200" "$HTTP_STATUS" "owner can refresh invite"

refreshed_invite_token="$(printf '%s' "$HTTP_BODY" | json_get "invite.token")"
if [[ "${refreshed_invite_token}" == "${initial_invite_token}" ]]; then
  echo "FAIL: invite refresh returned same token" >&2
  exit 1
fi
echo "PASS: refreshed invite token changed"

raw="$(curl -sS -X GET "${BASE_URL}/api/health/provider" -w $'\n%{http_code}')"
read_status_and_body "$raw"
assert_status "401" "$HTTP_STATUS" "health endpoint rejects anonymous"

raw="$(curl -sS -X GET "${BASE_URL}/api/health/provider" \
  -b "${cookie_a}" \
  -w $'\n%{http_code}')"
read_status_and_body "$raw"
assert_status_one_of "$HTTP_STATUS" "health endpoint allows owner session" "200" "503"

if [[ -n "${HEALTHCHECK_TOKEN}" ]]; then
  raw="$(curl -sS -X GET "${BASE_URL}/api/health/provider" \
    -H "x-healthcheck-token: ${HEALTHCHECK_TOKEN}" \
    -w $'\n%{http_code}')"
  read_status_and_body "$raw"
  assert_status_one_of "$HTTP_STATUS" "health endpoint allows token header" "200" "503"
else
  echo "SKIP: health header token check (HEALTHCHECK_TOKEN not provided)"
fi

raw="$(curl -sS -X GET "${BASE_URL}/api/pronosticos?groupId=${group_id}" \
  -b "${cookie_b}" \
  -w $'\n%{http_code}')"
read_status_and_body "$raw"
assert_status "200" "$HTTP_STATUS" "fetch predictions scope for user B"

period="$(printf '%s' "$HTTP_BODY" | json_get "period")"
if [[ -z "${period}" ]]; then
  echo "FAIL: pronosticos period is empty; cannot submit prediction." >&2
  exit 1
fi
match_id="$(printf '%s' "$HTTP_BODY" | json_find_upcoming)" || {
  echo "FAIL: no upcoming match available for smoke prediction." >&2
  exit 1
}

raw="$(curl -sS -X POST "${BASE_URL}/api/pronosticos" \
  -H "Content-Type: application/json" \
  -b "${cookie_b}" \
  -w $'\n%{http_code}' \
  -d "{\"groupId\":\"${group_id}\",\"period\":\"${period}\",\"matchId\":\"${match_id}\",\"home\":1,\"away\":0}")"
read_status_and_body "$raw"
assert_status "200" "$HTTP_STATUS" "submit prediction as user B"

raw="$(curl -sS -X GET "${BASE_URL}/api/leaderboard?groupId=${group_id}" \
  -b "${cookie_a}" \
  -w $'\n%{http_code}')"
read_status_and_body "$raw"
assert_status "200" "$HTTP_STATUS" "leaderboard visible for user A"

echo ""
echo "Private smoke test completed successfully."
echo "Users: ${email_a}, ${email_b}"
echo "Group ID: ${group_id}"
