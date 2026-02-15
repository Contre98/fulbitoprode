#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
RUNS="${RUNS:-5}"
PASSWORD="${BENCH_PASSWORD:-testpass123}"
GROUP_NAME_PREFIX="${GROUP_NAME_PREFIX:-Bench Group}"
RUN_ID="$(date +%s)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --runs)
      RUNS="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
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
cookie_file="${tmp_dir}/bench.cookie"

email="bench-${RUN_ID}@fulbito.local"
name="Bench ${RUN_ID}"
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
process.stdout.write(String(current));
' "$path"
}

url_encode() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1] || ""))' "$1"
}

benchmark_request() {
  local label="$1"
  local path="$2"
  local cookie="$3"
  local times=()

  curl -sS -o /dev/null -b "$cookie" "${BASE_URL}${path}"

  for ((i = 1; i <= RUNS; i++)); do
    local output status total
    output="$(curl -sS -o /dev/null -b "$cookie" -w "%{http_code} %{time_total}" "${BASE_URL}${path}")"
    status="${output%% *}"
    total="${output##* }"
    if [[ "$status" -lt 200 || "$status" -ge 400 ]]; then
      echo "FAIL ${label}: status ${status}" >&2
      exit 1
    fi
    times+=("$total")
  done

  node - <<'NODE' "$label" "$(IFS=,; echo "${times[*]}")"
const label = process.argv[2];
const raw = process.argv[3].split(",").map(Number).filter(Number.isFinite).map((v) => v * 1000);
raw.sort((a, b) => a - b);
const avg = raw.reduce((sum, v) => sum + v, 0) / Math.max(raw.length, 1);
const min = raw[0] ?? 0;
const max = raw[raw.length - 1] ?? 0;
const p95 = raw[Math.min(raw.length - 1, Math.floor(raw.length * 0.95))] ?? 0;
console.log(`${label.padEnd(34)} avg=${Math.round(avg)}ms min=${Math.round(min)}ms p95=${Math.round(p95)}ms max=${Math.round(max)}ms`);
NODE
}

echo "Benchmark started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Base URL: ${BASE_URL}"
echo "Runs per endpoint: ${RUNS}"
echo ""

raw="$(curl -sS -X POST "${BASE_URL}/api/auth/register-password" \
  -H "Content-Type: application/json" \
  -c "${cookie_file}" \
  -w $'\n%{http_code}' \
  -d "{\"email\":\"${email}\",\"password\":\"${PASSWORD}\",\"name\":\"${name}\"}")"
read_status_and_body "$raw"
if [[ "$HTTP_STATUS" != "201" ]]; then
  echo "Registration failed (${HTTP_STATUS}): ${HTTP_BODY}" >&2
  exit 1
fi

raw="$(curl -sS -X POST "${BASE_URL}/api/groups" \
  -H "Content-Type: application/json" \
  -b "${cookie_file}" \
  -w $'\n%{http_code}' \
  -d "{\"name\":\"${group_name}\"}")"
read_status_and_body "$raw"
if [[ "$HTTP_STATUS" != "201" ]]; then
  echo "Group creation failed (${HTTP_STATUS}): ${HTTP_BODY}" >&2
  exit 1
fi

group_id="$(printf '%s' "$HTTP_BODY" | json_get "group.id")"
league_id="$(printf '%s' "$HTTP_BODY" | json_get "group.leagueId")"
season="$(printf '%s' "$HTTP_BODY" | json_get "group.season")"
competition_stage="$(printf '%s' "$HTTP_BODY" | json_get "group.competitionStage")"

group_id_q="$(url_encode "$group_id")"
league_id_q="$(url_encode "$league_id")"
season_q="$(url_encode "$season")"
competition_stage_q="$(url_encode "$competition_stage")"

raw="$(curl -sS -X GET "${BASE_URL}/api/pronosticos?groupId=${group_id}" \
  -b "${cookie_file}" \
  -w $'\n%{http_code}')"
read_status_and_body "$raw"
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "Initial pronosticos fetch failed (${HTTP_STATUS}): ${HTTP_BODY}" >&2
  exit 1
fi

period="$(printf '%s' "$HTTP_BODY" | json_get "period")"
if [[ -z "$period" ]]; then
  period="global"
fi
period_q="$(url_encode "$period")"

echo "Created bench user ${email}"
echo "Group ID: ${group_id}"
echo "League/Season/Stage: ${league_id}/${season}/${competition_stage}"
echo "Selected period: ${period}"
echo ""
echo "API benchmarks"
benchmark_request "GET /api/auth/me" "/api/auth/me" "${cookie_file}"
benchmark_request "GET /api/home" "/api/home?groupId=${group_id_q}" "${cookie_file}"
benchmark_request "GET /api/fechas" "/api/fechas?leagueId=${league_id_q}&season=${season_q}&competitionStage=${competition_stage_q}" "${cookie_file}"
benchmark_request "GET /api/fixture" "/api/fixture?groupId=${group_id_q}&period=${period_q}" "${cookie_file}"
benchmark_request "GET /api/pronosticos" "/api/pronosticos?groupId=${group_id_q}&period=${period_q}" "${cookie_file}"
benchmark_request "GET /api/leaderboard" "/api/leaderboard?groupId=${group_id_q}&period=${period_q}" "${cookie_file}"

echo ""
echo "Page benchmarks (SSR response time)"
benchmark_request "GET /" "/" "${cookie_file}"
benchmark_request "GET /fixture" "/fixture" "${cookie_file}"
benchmark_request "GET /pronosticos" "/pronosticos" "${cookie_file}"
benchmark_request "GET /posiciones" "/posiciones" "${cookie_file}"

echo ""
echo "Benchmark completed."
