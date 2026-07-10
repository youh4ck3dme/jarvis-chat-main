#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SRC="$ROOT/shared/jarvis-core-prompt.txt"
DST="$ROOT/desktop-agent/core/prompt.txt"

if [ ! -f "$SRC" ]; then
  echo "❌ Source not found: $SRC"
  exit 1
fi

mkdir -p "$(dirname "$DST")"
cp "$SRC" "$DST"
echo "✅ Prompt synced → desktop-agent/core/prompt.txt"
