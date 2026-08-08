#!/usr/bin/env bash
# `vercel dev` only loads env vars from the linked project's remote "Development"
# target, ignoring .env.local for the /api functions. Export .env.local into this
# shell first so secrets that are intentionally not pushed to Vercel (e.g.
# TURSO_PLATFORM_TOKEN, which is Production/Preview-only) still reach the function.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "Missing .env.local — run 'vercel env pull .env.local' first." >&2
  exit 1
fi

set -a
source .env.local
set +a

exec vercel dev --listen 3111 --yes "$@"
