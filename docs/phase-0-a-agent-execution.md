# Agent Execution Plan — JARVIS Desktop Agent Fáza 0 + A

**Pre:** externého implementačného agenta  
**Projekt:** `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
**Rozsah:** LEN Fáza 0 + Fáza A — nič viac  
**Odhad:** 1–2 hodiny  
**Referencia:** `docs/` + blueprint v `implementation_plan.md` (brain folder)

---

## ⚠️ HARD RULES — čo NEROBÍŠ

- ❌ Nespúšťaj `main.py`, `pnpm dev`, Gemini Live
- ❌ Nevytváraj `actions/`, `memory/`, `bridge/`, `agent/` (to je Fáza C+)
- ❌ Nemeň `app/`, `components/`, `hooks/`, existujúce API routes
- ❌ Nepridávaj závislosti do `package.json`
- ❌ Necommituj API kľúče
- ❌ Neprepisuj `main.py` / `ui.py` logiku (len skopíruj)
- ❌ Nerob Fázu B (badge, hook, env docs)

Ak niečo z tohto zoznamu urobíš, task je **FAILED**.

---

## Kontext (1 odstavec)

Integrujeme Python desktop voice agenta (Mark XXXIX-OR) do existujúceho Next.js monorepa `jarvis-chat-main`. Fáza 0 + A pripraví **skeleton repa** a **zdieľané kontrakty** (prompt, tool manifest, bridge schema) medzi webom a desktopom. Python kód zatiaľ **nebude behať** — chýbajú mu moduly, ktoré prídu v Fáze C.

---

## Fáza 0 — Príprava repozitára

### Task 0.1 — Vytvor `desktop-agent/` štruktúru

```bash
cd /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
mkdir -p desktop-agent/core
mkdir -p shared
mkdir -p scripts
mkdir -p lib/prompts
```

### Task 0.2 — Skopíruj zdrojové súbory

Zdroj: `/Users/erikbabcan/Downloads/Mark-XXXIX-OR-main-main/`

```bash
SRC="/Users/erikbabcan/Downloads/Mark-XXXIX-OR-main-main"
DST="/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main/desktop-agent"

cp "$SRC/main.py"       "$DST/main.py"
cp "$SRC/ui.py"         "$DST/ui.py"
cp "$SRC/or_client.py"  "$DST/or_client.py"
cp "$SRC/setup.py"      "$DST/setup.py"
cp "$SRC/requirements.txt" "$DST/requirements.txt"
cp "$SRC/readme.md"     "$DST/readme.md"   # ak existuje
```

**Overenie:** V `desktop-agent/` musí byť presne týchto 6 súborov (+ neskôr `core/prompt.txt`).

### Task 0.3 — Doplniť `.gitignore`

Na koniec `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main/.gitignore` pridaj:

```gitignore
# desktop-agent (Python voice agent)
desktop-agent/.venv/
desktop-agent/.env
desktop-agent/.pytest_cache/
desktop-agent/**/__pycache__/
desktop-agent/**/.ruff_cache/
desktop-agent/config/api_keys.json
desktop-agent/data/
```

**Nepridávaj** `desktop-agent/core/prompt.txt` do gitignore — ten sa syncuje zo `shared/` a má byť v gite.

---

## Fáza A — Shared kontrakty

### Task A.1 — `shared/jarvis-core-prompt.txt`

Vytvor súbor s presným obsahom:

```text
You are JARVIS — Erik's personal AI assistant in the Jarvis-Chat ecosystem.

IDENTITY
- Tone: concise, capable, slightly witty. Never sycophantic.
- Language: match the user's language (Slovak/English).
- You have REAL tools on this Mac. Always call the appropriate tool — never simulate results.

MEMORY
- You have access to long-term memory synced with the Jarvis-Chat web app.
- Reference remembered facts naturally; don't list them unprompted.

TOOLS
- Use tools for: opening apps, web search, weather, reminders, screen analysis,
  browser control, file operations, code help, and system settings.
- For multi-step dev tasks, use agent_task (async queue).
- After screen_process: stay silent — vision module speaks directly.

SAFETY
- Confirm before: delete files, shutdown, send messages to contacts.
- Never expose API keys or file paths with secrets.

PLATFORM
- You run on macOS (Darwin). Use Mac-native tool behavior.
- Prefer: open -a, osascript, screencapture, Finder paths.
```

---

### Task A.2 — `shared/tool-manifest.json`

Vytvor JSON s **18 nástrojmi** extrahovanými z `desktop-agent/main.py` → `TOOL_DECLARATIONS`.

Štruktúra:

```json
{
  "version": "1.0.0",
  "platform": "darwin",
  "source": "desktop-agent/main.py:TOOL_DECLARATIONS",
  "tools": [
    {
      "name": "open_app",
      "description": "...",
      "parameters": { ... },
      "macos_impl": "actions/open_app.py",
      "risk_level": "low"
    }
  ]
}
```

**Povinných 18 tool names** (musia sedieť s `main.py`):

| # | name | macos_impl | risk_level |
|---|------|------------|------------|
| 1 | `open_app` | `actions/open_app.py` | low |
| 2 | `web_search` | `actions/web_search.py` | low |
| 3 | `weather_report` | `actions/weather_report.py` | low |
| 4 | `send_message` | `actions/send_message.py` | high |
| 5 | `reminder` | `actions/reminder.py` | low |
| 6 | `youtube_video` | `actions/youtube_video.py` | low |
| 7 | `screen_process` | `actions/screen_processor.py` | medium |
| 8 | `computer_settings` | `actions/computer_settings.py` | medium |
| 9 | `browser_control` | `actions/browser_control.py` | medium |
| 10 | `file_controller` | `actions/file_controller.py` | medium |
| 11 | `desktop_control` | `actions/desktop.py` | low |
| 12 | `code_helper` | `actions/code_helper.py` | medium |
| 13 | `dev_agent` | `actions/dev_agent.py` | medium |
| 14 | `agent_task` | `agent/task_queue.py` | medium |
| 15 | `computer_control` | `actions/computer_control.py` | high |
| 16 | `game_updater` | `actions/game_updater.py` | low |
| 17 | `flight_finder` | `actions/flight_finder.py` | low |
| 18 | `file_processor` | `actions/file_processor.py` | medium |

**Pravidlá:**
- `description` a `parameters` skopíruj z `TOOL_DECLARATIONS` v `main.py`
- V `description` nahraď „Windows" → „Mac" kde to dáva zmysel (napr. `open_app`, `reminder`)
- `macos_impl` súbory ešte **neexistujú** — len referencia do budúcnosti
- Validný JSON — over cez `python3 -m json.tool shared/tool-manifest.json`

---

### Task A.3 — `shared/bridge-protocol-v1.json`

JSON Schema pre komunikáciu web ↔ desktop health server.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "jarvis-bridge-protocol-v1",
  "title": "JARVIS Desktop Agent Bridge Protocol v1",
  "version": "1.0.0",
  "constants": {
    "DESKTOP_AGENT_PORT": 8765,
    "DESKTOP_CONVERSATION_ID": "desktop-voice-session",
    "WEB_DEV_PORT": 3141,
    "WEB_DEV_BASE_URL": "http://127.0.0.1:3141",
    "AUTH_FILE": "~/.jarvis/desktop-auth.json"
  },
  "endpoints": {
    "health": {
      "method": "GET",
      "url": "http://127.0.0.1:8765/health",
      "response_schema": { "$ref": "#/$defs/HealthResponse" }
    },
    "tools": {
      "method": "GET",
      "url": "http://127.0.0.1:8765/tools",
      "response_schema": {
        "type": "object",
        "properties": {
          "tools": { "type": "array" },
          "count": { "type": "integer" }
        }
      }
    },
    "memory_sync_push": {
      "method": "POST",
      "url": "{web_base_url}/api/memory/sync",
      "auth": "Bearer JWT (Supabase)",
      "note": "Používa existujúci web API — nie nový endpoint"
    },
    "memory_sync_pull": {
      "method": "GET",
      "url": "{web_base_url}/api/memory/sync",
      "auth": "Bearer JWT (Supabase)"
    }
  },
  "$defs": {
    "HealthResponse": {
      "type": "object",
      "required": ["status", "agent_version", "platform", "conversation_id"],
      "properties": {
        "status": {
          "type": "string",
          "enum": ["ok", "degraded", "error"]
        },
        "agent_version": { "type": "string" },
        "platform": { "type": "string" },
        "gemini_live_model": { "type": "string" },
        "conversation_id": {
          "type": "string",
          "const": "desktop-voice-session"
        },
        "memory_sync": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "last_sync_at": { "type": ["string", "null"], "format": "date-time" },
            "web_base_url": { "type": "string", "format": "uri" }
          }
        },
        "tools_available": { "type": "integer", "minimum": 0 },
        "uptime_sec": { "type": "number", "minimum": 0 }
      }
    }
  }
}
```

---

### Task A.4 — `scripts/sync-jarvis-prompt.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/shared/jarvis-core-prompt.txt"
DST="$ROOT/desktop-agent/core/prompt.txt"

if [[ ! -f "$SRC" ]]; then
  echo "❌ Missing: $SRC" >&2
  exit 1
fi

mkdir -p "$(dirname "$DST")"
cp "$SRC" "$DST"
echo "✅ Prompt synced → desktop-agent/core/prompt.txt"
```

Po vytvorení:

```bash
chmod +x scripts/sync-jarvis-prompt.sh
```

---

### Task A.5 — `lib/prompts/jarvis-core-prompt.ts`

```typescript
import { readFileSync } from "fs";
import { join } from "path";

let cachedPrompt: string | null = null;

/**
 * Returns the shared JARVIS core system prompt (server-side only).
 * Source of truth: shared/jarvis-core-prompt.txt
 */
export function getJarvisCorePrompt(): string {
  if (cachedPrompt) {
    return cachedPrompt;
  }

  const promptPath = join(process.cwd(), "shared", "jarvis-core-prompt.txt");
  cachedPrompt = readFileSync(promptPath, "utf-8");
  return cachedPrompt;
}

/**
 * Clears the in-memory cache (for tests).
 */
export function clearJarvisCorePromptCache(): void {
  cachedPrompt = null;
}
```

#### [NEW] `lib/prompts/jarvis-core-prompt.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  getJarvisCorePrompt,
  clearJarvisCorePromptCache,
} from "./jarvis-core-prompt";

describe("getJarvisCorePrompt", () => {
  beforeEach(() => {
    clearJarvisCorePromptCache();
  });

  it("loads shared/jarvis-core-prompt.txt", () => {
    const prompt = getJarvisCorePrompt();
    expect(prompt).toContain("JARVIS");
    expect(prompt).toContain("Jarvis-Chat");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("returns cached prompt on second call", () => {
    const first = getJarvisCorePrompt();
    const second = getJarvisCorePrompt();
    expect(first).toBe(second);
  });
});
```

---

### Task A.6 — Initial sync → `desktop-agent/core/prompt.txt`

```bash
cd /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
bash scripts/sync-jarvis-prompt.sh
```

**Overenie:** `desktop-agent/core/prompt.txt` je byte-identický s `shared/jarvis-core-prompt.txt`.

```bash
diff shared/jarvis-core-prompt.txt desktop-agent/core/prompt.txt
# žiadny output = OK
```

---

## Acceptance Criteria — checklist

Agent musí potvrdiť každý bod pred ukončením:

### Fáza 0
- [ ] `desktop-agent/main.py` existuje
- [ ] `desktop-agent/ui.py` existuje
- [ ] `desktop-agent/or_client.py` existuje
- [ ] `desktop-agent/setup.py` existuje
- [ ] `desktop-agent/requirements.txt` existuje
- [ ] `.gitignore` obsahuje `desktop-agent/.venv/` a `desktop-agent/config/api_keys.json`

### Fáza A
- [ ] `shared/jarvis-core-prompt.txt` existuje
- [ ] `shared/tool-manifest.json` — 18 tools, validný JSON
- [ ] `shared/bridge-protocol-v1.json` — validný JSON
- [ ] `scripts/sync-jarvis-prompt.sh` — executable
- [ ] `lib/prompts/jarvis-core-prompt.ts` existuje
- [ ] `lib/prompts/jarvis-core-prompt.test.ts` existuje
- [ ] `desktop-agent/core/prompt.txt` synced (diff prázdny)

### Testy (agent spustí)
```bash
cd /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main

# JSON validácia
python3 -m json.tool shared/tool-manifest.json > /dev/null && echo "tool-manifest OK"
python3 -m json.tool shared/bridge-protocol-v1.json > /dev/null && echo "bridge OK"

# Prompt sync
bash scripts/sync-jarvis-prompt.sh
diff -q shared/jarvis-core-prompt.txt desktop-agent/core/prompt.txt && echo "prompt sync OK"

# Vitest — len nový test, nesmie rozbiť existujúce
pnpm vitest run lib/prompts/jarvis-core-prompt.test.ts
```

### Čo NESMIE existovať po Fáze 0+A
- [ ] Žiadne zmeny v `app/`
- [ ] Žiadne zmeny v `components/`
- [ ] Žiadne `desktop-agent/actions/`
- [ ] Žiadne `desktop-agent/bridge/`
- [ ] Žiadne spustenie `main.py`

---

## Výstup agenta (povinný report)

Na konci agent napíše:

```markdown
## Fáza 0+A — Done

### Vytvorené súbory
- (zoznam)

### Testy
- tool-manifest JSON: PASS/FAIL
- bridge-protocol JSON: PASS/FAIL
- prompt sync diff: PASS/FAIL
- vitest jarvis-core-prompt: PASS/FAIL

### Čo som NEDELAL (potvrdenie)
- [ ] Fáza B+
- [ ] Spustenie main.py
- [ ] Zmeny v app/components

### Ďalší krok
Fáza B — web predpríprava (badge, use-desktop-agent hook, .env.example)
```

---

## Copy-paste prompt pre agenta

Použi celý blok nižšie:

---

```
TASK: JARVIS Desktop Agent — Fáza 0 + A ONLY

Project root: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
Source files: /Users/erikbabcan/Downloads/Mark-XXXIX-OR-main-main/
Execution plan: docs/phase-0-a-agent-execution.md (read first)

SCOPE (strict):
- Fáza 0: desktop-agent/ skeleton + .gitignore
- Fáza A: shared/ kontrakty + sync script + lib/prompts/ + initial prompt sync

DO NOT:
- Run main.py or pnpm dev
- Create actions/, memory/, bridge/, agent/ folders
- Modify app/, components/, hooks/, package.json
- Do Fáza B or beyond

DELIVERABLES:
1. desktop-agent/{main,ui,or_client,setup,requirements,readme}.py|.txt|.md
2. shared/jarvis-core-prompt.txt
3. shared/tool-manifest.json (18 tools from main.py TOOL_DECLARATIONS)
4. shared/bridge-protocol-v1.json
5. scripts/sync-jarvis-prompt.sh (chmod +x)
6. lib/prompts/jarvis-core-prompt.ts + .test.ts
7. desktop-agent/core/prompt.txt (via sync script)
8. .gitignore updates

VERIFY:
python3 -m json.tool shared/tool-manifest.json
python3 -m json.tool shared/bridge-protocol-v1.json
bash scripts/sync-jarvis-prompt.sh && diff shared/jarvis-core-prompt.txt desktop-agent/core/prompt.txt
pnpm vitest run lib/prompts/jarvis-core-prompt.test.ts

Report using the template in phase-0-a-agent-execution.md
```

---

*Po dokončení tejto fázy pokračuje Fáza B — plán pripravíme samostatne.*