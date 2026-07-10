# JARVIS Desktop Voice Agent

Lokálny hlasový asistent s prístupom k macOS nástrojom, plne prepojený s webovým rozhraním.

## Rýchly štart

1. **Predpríprava** — PortAudio pre mikrofón:
   ```bash
   brew install portaudio
   ```

2. **Inštalácia**
   ```bash
   pnpm desktop:setup
   ```

3. **Konfigurácia** — synchronizuj kľúče z `.env.local`:
   ```bash
   pnpm desktop:gen-config
   pnpm desktop:sync-prompt
   ```

4. **Spustenie**
   ```bash
   # Terminál 1 — desktop voice agent
   pnpm desktop:run

   # Terminál 2 — web chat
   pnpm dev
   ```

5. **Overenie stacku**
   ```bash
   pnpm desktop:stack    # stav :8765 + :3141
   pnpm desktop:health   # JSON health z desktop agenta
   ```

## API kľúče (hierarchia)

| Kľúč | Úloha |
|------|-------|
| `MISTRAL_API_KEY` | Primary — web chat + desktop text |
| `MISTRAL_API_KEY_SECONDARY` | Fallback + Codestral (kód) |
| `GEMINI_API_KEY` | Desktop hlas (Gemini Live) + web Gemini model |
| `BUILDER_UNLOCK_PASSWORD` | Builder unlock (prod: `23513900`) |

Kľúče sa generujú do `desktop-agent/config/api_keys.json` cez `pnpm desktop:gen-config`.

## Modely (desktop)

| Úloha | Model |
|-------|-------|
| Text chat | `mistral-small-latest` → fallback `mistral-medium-latest` |
| Kód | `codestral-latest` (secondary key) |
| Vision | `pixtral-12b-2409` |
| Hlas | `gemini-2.5-flash-native-audio-preview` (Gemini Live) |

## macOS permissions

- **Mikrofón** — System Settings → Privacy & Security → Microphone → povoliť Terminal/Python
- **Screen Recording** — pre `screen_process` tool (vision analýza obrazovky)
- **Accessibility** — niektoré `computer_settings` akcie

## Auth export (pamäť sync)

1. Prihlás sa v `/chat` (Supabase magic link)
2. Menu → **Stiahnuť desktop-auth.json**
3. Ulož do `~/.jarvis/desktop-auth.json`
4. Reštartuj desktop agent — `memory_sync.enabled` v health bude `true`

`web_base_url` v exporte sa nastaví automaticky podľa aktuálnej URL (localhost alebo Vercel).

## Architektúra

```
Web Chat (localhost:3141) <--- poll /health ---> FastAPI (localhost:8765)
   |                                                    |
   +---- Bearer JWT ---> /api/memory/sync <--- sync ---+
```

18 macOS nástrojov definovaných v `shared/tool-manifest.json` (vrátane `agent_task`).

## Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| PortAudio error pri `make setup` | `brew install portaudio`, over `/opt/homebrew/include` |
| Port 8765 obsadený | `lsof -i :8765` → `kill -9 <PID>` |
| `api_keys.json` prázdny | `pnpm desktop:gen-config` z `.env.local` |
| Mikrofón nefunguje | macOS Microphone permission pre terminál |
| Web mic „network" error | Očakávané — Chrome STT ide cez Google cloud; použi Desktop JARVIS |
| Memory sync nefunguje | Over `~/.jarvis/desktop-auth.json`, JWT expiráciu, Supabase env na Vercel |

## Live overenie (checklist)

```bash
pnpm desktop:health
curl -s -X POST http://127.0.0.1:3141/api/builder/unlock \
  -H 'Content-Type: application/json' -d '{"password":"23513900"}'
pnpm smoke:mistral
pnpm audit:vercel-env
```

## Memory sync E2E (automatizované)

```bash
# 1. Vygeneruj ~/.jarvis/desktop-auth.json (Supabase test user + JWT)
pnpm tsx scripts/setup-desktop-auth-e2e.ts

# 2. Push z desktop agenta + overenie v web API (< 5s)
bash scripts/memory-sync-e2e.sh

# Produkcia
pnpm tsx scripts/setup-desktop-auth-e2e.ts --web-base-url https://jarvis-ten-omega.vercel.app
bash scripts/memory-sync-e2e.sh
```

**Posledný stav (júl 2026):**
- Local memory sync E2E: **PASS** (desktop-voice tag + content match)
- Production memory sync E2E: **PASS** na `jarvis-ten-omega.vercel.app`
- Builder unlock `23513900`: **PASS** (local + prod)
- `pnpm audit:vercel-env:full`: **OK**