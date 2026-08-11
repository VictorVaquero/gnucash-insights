#!/usr/bin/env bash
# Regenerates the synthetic guest dataset and pushes it to the cashpy-guest
# Turso database, wiping whatever rows are currently there. Safe to re-run —
# the generator is deterministic (fixed --seed) so re-running reproduces the
# same synthetic data, it does not accumulate.
#
# Usage: ./scripts/seed-guest-data.sh
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="$HOME/.turso:$PATH"

if ! command -v turso >/dev/null 2>&1; then
  echo "Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash
fi

if [ ! -f .env.local ]; then
  echo "Missing .env.local — run 'vercel env pull .env.local' first." >&2
  exit 1
fi

set -a
source .env.local
set +a

if [ -z "${TURSO_GUEST_DATABASE_NAME:-}" ]; then
  echo "TURSO_GUEST_DATABASE_NAME not set in .env.local" >&2
  exit 1
fi

SEED_FILE="$(mktemp -t guest-seed-XXXXXX.sql)"
trap 'rm -f "$SEED_FILE"' EXIT

echo "Generating synthetic guest data..."
node scripts/generate-guest-data.mjs --out "$SEED_FILE"

echo
echo "About to WIPE and REPLACE all data in Turso database '$TURSO_GUEST_DATABASE_NAME' with the synthetic dataset above."
read -r -p "Continue? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo "Uploading to $TURSO_GUEST_DATABASE_NAME..."
turso db shell "$TURSO_GUEST_DATABASE_NAME" < "$SEED_FILE"

echo "Done. cashpy-guest now contains synthetic data only."
echo
echo "If the account IDs printed above differ from what's in api/turso-token.ts"
echo "and vite.config.ts's GUEST_ACCOUNT_CONFIG, update both to match."
