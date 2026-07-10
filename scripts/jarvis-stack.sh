#!/usr/bin/env bash
set -euo pipefail

DESKTOP_HEALTH_URL="${DESKTOP_HEALTH_URL:-http://127.0.0.1:8765/health}"
WEB_URL="${WEB_URL:-http://127.0.0.1:3141/chat}"

echo "=== JARVIS Stack Status ==="
echo ""

if curl -sf -m 2 "$DESKTOP_HEALTH_URL" >/dev/null 2>&1; then
  echo "Desktop agent (:8765): ONLINE"
  curl -s "$DESKTOP_HEALTH_URL" | python3 -m json.tool 2>/dev/null || curl -s "$DESKTOP_HEALTH_URL"
else
  echo "Desktop agent (:8765): OFFLINE"
  echo "  Start: pnpm desktop:run"
fi

echo ""

if curl -sf -m 2 -o /dev/null "$WEB_URL"; then
  echo "Web chat (:3141): ONLINE"
else
  echo "Web chat (:3141): OFFLINE"
  echo "  Start: pnpm dev"
fi