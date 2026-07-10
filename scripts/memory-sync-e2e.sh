#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTH_FILE="$HOME/.jarvis/desktop-auth.json"
TEST_KEY="e2e_favorite_editor_$(date +%s)"
TEST_VALUE="Cursor"

if [[ ! -f "$AUTH_FILE" ]]; then
  echo "❌ Missing $AUTH_FILE — run: pnpm tsx scripts/setup-desktop-auth-e2e.ts"
  exit 1
fi

TOKEN=$(python3 -c "import json; print(json.load(open('$AUTH_FILE'))['access_token'])")
WEB_BASE=$(python3 -c "import json; print(json.load(open('$AUTH_FILE'))['web_base_url'])")

echo "=== Memory Sync E2E ==="
echo "Target: $WEB_BASE"
echo "Test fact: $TEST_KEY = $TEST_VALUE"
echo ""

cd "$ROOT/desktop-agent"
.venv/bin/python -c "
import json
from pathlib import Path
from memory.memory_manager import update_memory

bridge_path = Path('config/bridge.json')
bridge = json.loads(bridge_path.read_text(encoding='utf-8'))
bridge['web_base_url'] = '$WEB_BASE'
bridge_path.write_text(json.dumps(bridge, indent=2) + '\n', encoding='utf-8')

update_memory({
    'preferences': {
        '$TEST_KEY': {'value': '$TEST_VALUE'}
    }
})
print('✅ Desktop push_memory called')
"

sleep 2

RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$WEB_BASE/api/memory/sync")
echo "$RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if not data.get('success'):
    print('❌ GET /api/memory/sync failed:', data)
    sys.exit(1)
convs = data.get('data', {}).get('conversations', [])
entries = []
for c in convs:
    if c.get('conversationId') == 'desktop-voice-session':
        entries = c.get('entries', [])
        break
needle = '$TEST_KEY: $TEST_VALUE'
found = any(needle in (e.get('content') or '') for e in entries)
voice = any('desktop-voice' in (e.get('metadata', {}).get('tags') or []) for e in entries if needle in (e.get('content') or ''))
if found and voice:
    print('✅ Memory visible in web API with desktop-voice tag')
    print('   content match:', needle)
    sys.exit(0)
print('❌ Entry not found. desktop-voice-session entries:', len(entries))
for e in entries[-3:]:
    print('  -', e.get('content'))
sys.exit(1)
"