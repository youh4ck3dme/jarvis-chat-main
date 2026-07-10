# Jarvis — Environment Variables

**Šablóna:** `.env.example`  
**Lokálny súbor:** `.env.local` (gitignored)  
**Produkcia:** Vercel → Project **jarvis** → Settings → Environment Variables

---

## Povinné na produkcii

| Premenná | Kde | Popis |
|----------|-----|--------|
| `MISTRAL_API_KEY` | Server | API kľúč pre planner + chat stream |
| `BUILDER_UNLOCK_PASSWORD` | Server only | Heslo pre Builder režim. **Nikdy** `NEXT_PUBLIC_` |
| `BUILDER_UNLOCK_RATE_LIMIT_MAX` | Server | Max pokusov na IP za okno (default `10`) |
| `BUILDER_UNLOCK_RATE_LIMIT_WINDOW_SEC` | Server | Dĺžka okna v sekundách (default `900` = 15 min) |
| `BUILDER_UNLOCK_RATE_LIMIT_DISABLED` | Server | `true` = vypne limit (len test/dev) |

### Overenie na live

```bash
# Builder unlock (produkcia)
curl -s -X POST https://jarvis-ten-omega.vercel.app/api/builder/unlock \
  -H 'Content-Type: application/json' \
  -d '{"password":"TVOJE_HESLO"}'
# Očakávané: {"success":true,"data":{"unlocked":true}}
```

Bez `BUILDER_UNLOCK_PASSWORD` na produkcii → `503`.

---

## Odporúčané

| Premenná | Default | Popis |
|----------|---------|--------|
| `DEFAULT_AI_MODEL` | `mistral/mistral-small-latest` | Server default model |
| `NEXT_PUBLIC_DEFAULT_AI_MODEL` | rovnaký | Client default v composer |

---

## Voliteľné

| Premenná | Popis |
|----------|--------|
| `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Fallback ak user vyberie Gemini |
| `OPENAI_API_KEY` | Fallback pre OpenAI modely |
| `ANTHROPIC_API_KEY` | Fallback pre Claude |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (uploady) |
| `PORT` | Dev port (default `3141`) |

---

## Lokálny vývoj

```env
# .env.local
MISTRAL_API_KEY=sk-...
BUILDER_UNLOCK_PASSWORD=223513900
DEFAULT_AI_MODEL=mistral/mistral-small-latest
NEXT_PUBLIC_DEFAULT_AI_MODEL=mistral/mistral-small-latest
PORT=3141
```

Ak `BUILDER_UNLOCK_PASSWORD` chýba lokálne → fallback `223513900` (len `NODE_ENV=development`).

---

## Client-side API kľúče (prehliadač)

User môže v ⚙️ Settings uložiť vlastné kľúče do `localStorage`:

- `settings-mistral-key`
- `settings-google-key`
- `settings-openai-key`
- `settings-anthropic-key`

Posielajú sa ako headers `x-mistral-key`, `x-google-key`, atď. na `/api/chat` a `/api/build/plan`.  
Ak chýbajú → server použije env z Vercel.

---

## Periodický audit Vercel env (P1 Ops)

Manifest: `lib/ops/vercel-env-manifest.ts`  
Audit logika: `lib/ops/vercel-env-audit.ts`

```bash
# Lokálne (live produkčné sondy + .env.example)
pnpm audit:vercel-env

# S aktuálnym Vercel stavom (CLI JSON export)
vercel env list --format json 2>/dev/null | awk '/^\{/,0' > /tmp/vercel-env.json
pnpm audit:vercel-env -- --vercel-env-json /tmp/vercel-env.json

# CI / API (bez CLI)
VERCEL_TOKEN=... pnpm audit:vercel-env

# Doplnenie Preview z .env.local (neinteraktívne)
vercel env add MISTRAL_API_KEY preview --value "<hodnota>" --sensitive --yes --non-interactive
vercel env add DEFAULT_AI_MODEL preview --value "mistral/mistral-small-latest" --yes --non-interactive
vercel env add NEXT_PUBLIC_DEFAULT_AI_MODEL preview --value "mistral/mistral-small-latest" --yes --non-interactive
```

GitHub Actions: `.github/workflows/vercel-env-audit.yml` — **1× mesačne** + `workflow_dispatch`.  
Secret: `VERCEL_TOKEN` (voliteľné, pre remote matrix audit).

Audit kontroluje:
- povinné kľúče per `production` / `preview` / `development`
- Supabase bundle (ak je čiastočne nastavený)
- zakázané `NEXT_PUBLIC_*` secrety
- live sondy: builder unlock `401` (nie `503`), legacy heslo `2366` zamietnuté

---

## Vercel — aktuálny stav (júl 2026)

| Premenná | Production | Development | Preview |
|----------|------------|-------------|---------|
| `MISTRAL_API_KEY` | ✅ | ✅ | ✅ |
| `DEFAULT_AI_MODEL` | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_DEFAULT_AI_MODEL` | ✅ | ✅ | ✅ |
| `BUILDER_UNLOCK_PASSWORD` | ✅ | ✅ | ✅ |
| Supabase sync/auth | ✅ | ✅ | ✅ |

---

## Čo Jarvis NEPOUŽÍVA

- `NEXT_PUBLIC_BUILDER_UNLOCK_PASSWORD` — odstránené (bezpečnostný dôvod)
- Postgres / Redis connection strings