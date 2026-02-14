#!/usr/bin/env bash
set -euo pipefail

SKIP_INSTALL="false"
if [[ "${1:-}" == "--skip-install" ]]; then
  SKIP_INSTALL="true"
fi

run_step() {
  local name="$1"
  shift
  echo ""
  echo "==> ${name}"
  "$@"
}

echo "Release validation started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [[ "${SKIP_INSTALL}" != "true" ]]; then
  run_step "Install dependencies (npm ci)" npm ci
else
  echo "Skipping install step (--skip-install)."
fi

run_step "Lint" npm run lint
run_step "Typecheck" npm run typecheck
run_step "Tests" npm run test:run
run_step "Build" npm run build

echo ""
echo "Release validation succeeded."
