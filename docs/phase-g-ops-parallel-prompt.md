# Parallel Ops Prompt — Testy, vylepšenia, polish (kým agent robí Voice Lite)

**Pre:** druhého agenta ALEBO medzi-session údržbu  
**Projekt:** `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
**Pravidlo:** Nemeň `desktop-agent/main.py` Gemini loop ani Voice Lite komponenty (robí iný agent).  
**Cieľ:** Zvýšiť kvalitu, pokrytie testami, docs, DX — bez konfliktov.

---

## Copy-paste prompt

```
TASK: JARVIS Parallel Ops — testy, polish, docs (NEKONFLIKT s Voice Lite)

Project: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
Konflikt: NEROB components/workspace/desktop-voice-panel.tsx,
          desktop-auth-export.tsx, app/api/desktop-agent/status/route.ts
          (to robí Voice Lite agent)

---

## BLOK A — Testy (priorita 1)

### A1. lib/desktop-agent/health-client.test.ts
- mock fetch → parsuje health JSON
- timeout/abort → null
- non-200 → null
- typeof window === undefined path (SSR) → null

### A2. lib/desktop-agent/memory-bridge.test.ts
- isDesktopVoiceEntry() s tag desktop-voice
- formatDesktopMemoryForDisplay()
- getDesktopVoiceConversationId() === desktop-voice-session

### A3. lib/prompts/jarvis-core-prompt.test.ts
- načíta shared/jarvis-core-prompt.txt
- cache funguje (clearJarvisCorePromptCache)

### A4. lib/speech-recognition.test.ts
- rozšír o not-allowed, audio-capture messages
- network + desktopAgentOnline: true → obsahuje "Desktop JARVIS"

### A5. desktop-agent smoke (Python, lokálne)
cd desktop-agent && .venv/bin/python -c "
from or_client import client
from bridge.health_server import create_app
from memory.memory_manager import load_memory
assert client.available_models()['api_keys'] >= 1
print('desktop smoke OK')
"

Spusti: pnpm vitest run lib/desktop-agent lib/prompts lib/speech-recognition
Cieľ: 0 regresia v existujúcich testoch (pnpm test)

---

## BLOK B — DX & skripty (priorita 2)

### B1. package.json — pridaj bez konfliktu:
"desktop:setup": "cd desktop-agent && make setup"
"desktop:run": "cd desktop-agent && make run"
"desktop:gen-config": "cd desktop-agent && make gen-config"
"desktop:sync-prompt": "bash scripts/sync-jarvis-prompt.sh"
"desktop:health": "curl -s http://127.0.0.1:8765/health | python3 -m json.tool"

### B2. scripts/jarvis-stack.sh (nový)
Jeden príkaz na štart web + overenie desktop:
- check :8765 health
- check :3141/chat
- vypíš stav oboch

### B3. docs/desktop-agent.md (nový)
Sekcie:
1. Quick start (make setup, make gen-config, make run, pnpm dev)
2. API kľúče hierarchia (Mistral primary/secondary, Gemini voice)
3. Modely (small, medium, codestral, pixtral)
4. macOS permissions (mic, screen recording)
5. Auth export (odkaz na ~/.jarvis/desktop-auth.json — zatiaľ manuálne)
6. Troubleshooting (port 8765, api_keys.json prázdny, TCC)

---

## BLOK C — Polish & fix (priorita 3)

### C1. shared/tool-manifest.json
- Pridaj chýbajúci `agent_task` (18 tools total)
- Over zhodu s main.py TOOL_DECLARATIONS

### C2. lib/ops/vercel-env-manifest.ts
- Pridaj GEMINI_API_KEY, MISTRAL_API_KEY_SECONDARY ako optional (dokumentácia)
- Desktop-only env kľúče NEpridávaj ako required na Vercel

### C3. todo.md — sekcia P21 Desktop Voice Agent
```markdown
### P21 — Desktop Voice Agent
- [x] Monorepo desktop-agent/ + shared kontrakty
- [x] Badge + health polling
- [x] Dual Mistral, Gemini Live lokálne
- [x] Builder heslo 23513900 + Vercel prod
- [ ] Voice Lite panel (iný agent)
- [ ] Auth export button (iný agent)
- [ ] Memory UI pre desktop-voice-session (iný agent)
- [ ] lib/desktop-agent vitest (tento prompt)
- [ ] docs/desktop-agent.md (tento prompt)
```

### C4. Composer — vylepši hint keď desktop offline
V composer.tsx: ak desktopAgentState === "offline" a user klikne mic,
ukáž: "Pre hlas použij Desktop JARVIS (make run)" namiesto generic network error.

### C5. .github/workflows/desktop-agent.yml (nový, lightweight)
```yaml
on:
  pull_request:
    paths: ['desktop-agent/**', 'shared/**', 'lib/desktop-agent/**']
jobs:
  python-smoke:
    runs-on: macos-latest
    steps:
      - checkout
      - run: cd desktop-agent && make setup && .venv/bin/python -c "from or_client import client; print('ok')"
  web-bridge:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - run: pnpm install && pnpm vitest run lib/desktop-agent lib/prompts
```
Poznámka: make setup na CI môže trvať — timeout 10 min.

---

## BLOK D — Live overenie (priorita 4, spusti sám)

### D1. Lokálny stack
```bash
cd desktop-agent && make gen-config && make run   # T1
cd .. && pnpm dev                                # T2
```

### D2. Curl checklist
```bash
curl -s http://127.0.0.1:8765/health | python3 -m json.tool
curl -s -X POST http://127.0.0.1:3141/api/builder/unlock \
  -H 'Content-Type: application/json' -d '{"password":"23513900"}'
pnpm smoke:mistral
```

### D3. Produkcia
```bash
curl -s -X POST https://jarvis-ten-omega.vercel.app/api/builder/unlock \
  -H 'Content-Type: application/json' -d '{"password":"23513900"}'
pnpm audit:vercel-env
```

### D4. Memory sync (ak máš Supabase login)
1. Prihlás sa v /chat
2. Manuálne vlož JWT do ~/.jarvis/desktop-auth.json (dočasne)
3. Desktop: povedz "pamätaj si že môj editor je Cursor"
4. Web memory panel → fakt do 60s

Zdokumentuj výsledok v docs/desktop-agent.md (pass/fail).

---

## BLOK E — Nice-to-have (ak zostáva čas)

### E1. desktop-agent/README.md
Krátky symlink-style README → ../../docs/desktop-agent.md

### E2. lib/desktop-agent/constants.test.ts
Default port 8765, conversation id

### E3. Rate limit builder unlock — over že po 10 pokusoch 429
curl loop na /api/builder/unlock s wrong password

### E4. eslint — žiadne nové warningy v dotknutých súboroch

---

## HARD RULES

❌ Nemeň: desktop-voice-panel, desktop-auth-export (Voice Lite agent)
❌ Nemeň: desktop-agent/main.py, ui.py PyQt6 logiku
❌ Nepridávaj Gemini Live do Next.js
❌ Necommituj .env.local, api_keys.json, JWT tokeny
❌ Nerefaktoruj chat-shell.tsx masívne — len minimálne pre memory tag display ak je to 10 riadkov

✅ Môžeš: testy, docs, package.json skripty, tool-manifest fix, todo.md, CI workflow, composer hint

---

## Report template

```markdown
## Parallel Ops — Done

### Testy
- vitest lib/desktop-agent: PASS/FAIL (N tests)
- vitest lib/prompts: PASS/FAIL
- desktop python smoke: PASS/FAIL
- pnpm test regresia: PASS/FAIL (count)

### Vytvorené / upravené
- (zoznam súborov)

### Live overenie
- local health :8765: OK/FAIL
- builder unlock 23513900: OK/FAIL
- production audit: OK/FAIL

### Nezmenené (konflikt avoidance)
- Voice Lite komponenty: nedotknuté
```

---

*Spúšť paralelne s Voice Lite agentom. Ak merge conflict — Voice Lite má prioritu na UI komponentoch.*