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
BUILDER_UNLOCK_PASSWORD=2366
DEFAULT_AI_MODEL=mistral/mistral-small-latest
NEXT_PUBLIC_DEFAULT_AI_MODEL=mistral/mistral-small-latest
PORT=3141
```

Ak `BUILDER_UNLOCK_PASSWORD` chýba lokálne → fallback `2366` (len `NODE_ENV=development`).

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

## Vercel — aktuálny stav (júl 2026)

| Premenná | Production | Development | Preview |
|----------|------------|-------------|---------|
| `MISTRAL_API_KEY` | ✅ | ✅ | — |
| `DEFAULT_AI_MODEL` | ✅ | ✅ | — |
| `NEXT_PUBLIC_DEFAULT_AI_MODEL` | ✅ | ✅ | — |
| `BUILDER_UNLOCK_PASSWORD` | ✅ | ✅ | ⚠️ odporúčané doplniť |

---

## Čo Jarvis NEPOUŽÍVA

- `NEXT_PUBLIC_SUPABASE_URL` — žiadny Supabase
- `NEXT_PUBLIC_BUILDER_UNLOCK_PASSWORD` — odstránené (bezpečnostný dôvod)
- Postgres / Redis connection strings

`supabase status` v `jarvis-chat-main` zlyhá — projekt nemá `supabase/` priečinok.