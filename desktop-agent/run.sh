#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  echo "❌ Missing .venv — run from repo root: pnpm desktop:setup"
  exit 1
fi

exec "$ROOT/.venv/bin/python" "$ROOT/main.py" "$@"