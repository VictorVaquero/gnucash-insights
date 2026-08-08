#!/usr/bin/env bash
# Mints a fresh Turso platform API token for local dev and writes it into
# .env.local. TURSO_PLATFORM_TOKEN is intentionally never pushed to Vercel's
# Development environment (it's Production/Preview-only, sensitive), and it's
# a non-expiring token so Turso doesn't offer a "refresh" — re-run this script
# whenever the one in .env.local stops working (e.g. someone revoked it).
set -euo pipefail
cd "$(dirname "$0")/.."

TOKEN_NAME="cashpy-v2-local-dev"
ENV_FILE=".env.local"

export PATH="$HOME/.turso:$PATH"

if ! command -v turso >/dev/null 2>&1; then
  echo "Installing Turso CLI..."
  curl -sSfL https://get.tur.so/install.sh | bash
fi

if ! turso auth whoami >/dev/null 2>&1; then
  echo "Not logged in to Turso — opening login flow..."
  turso auth login
fi

if turso auth api-tokens list | awk '{print $1}' | grep -qx "$TOKEN_NAME"; then
  yes | turso auth api-tokens revoke "$TOKEN_NAME" >/dev/null
fi

TOKEN=$(turso auth api-tokens mint "$TOKEN_NAME")

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — run 'vercel env pull $ENV_FILE' first." >&2
  exit 1
fi

if grep -q "^TURSO_PLATFORM_TOKEN=" "$ENV_FILE"; then
  sed -i "s|^TURSO_PLATFORM_TOKEN=.*|TURSO_PLATFORM_TOKEN=$TOKEN|" "$ENV_FILE"
else
  echo "TURSO_PLATFORM_TOKEN=$TOKEN" >> "$ENV_FILE"
fi

echo "TURSO_PLATFORM_TOKEN refreshed in $ENV_FILE."
