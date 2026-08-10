#!/usr/bin/env bash
# Optional: purge HTML/version.json at Cloudflare after a traveler deploy.
# Heroku itself has no CDN — skip this unless Cloudflare (or similar) sits in front.
#
# Required env:
#   CF_ZONE_ID
#   CF_API_TOKEN
#   TRAVELER_ORIGIN  e.g. https://delve-web-nust.herokuapp.com
#
# Usage:
#   ./scripts/purge-traveler-html-cache.sh

set -euo pipefail

if [[ -z "${CF_ZONE_ID:-}" || -z "${CF_API_TOKEN:-}" || -z "${TRAVELER_ORIGIN:-}" ]]; then
  echo "Skipping CDN purge (set CF_ZONE_ID, CF_API_TOKEN, TRAVELER_ORIGIN to enable)."
  exit 0
fi

ORIGIN="${TRAVELER_ORIGIN%/}"

curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"files\":[\"${ORIGIN}/\",\"${ORIGIN}/index.html\",\"${ORIGIN}/version.json\"]}"

echo
echo "Purged HTML/version URLs for ${ORIGIN}"
