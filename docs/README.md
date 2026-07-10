# Jarvis — Dokumentácia

**Produkcia:** https://jarvis-ten-omega.vercel.app/chat  
**Repozitár:** https://github.com/youh4ck3dme/jarvis-chat-main

---

## Rýchly štart

```bash
cd /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
cp .env.example .env.local   # doplň MISTRAL_API_KEY
pnpm install
pnpm dev                     # http://127.0.0.1:3141/chat
```

Builder heslo (lokálne): `23513900` (ak `BUILDER_UNLOCK_PASSWORD` nie je v `.env.local`)

---

## Dokumenty

| Dokument | Kedy čítať |
|----------|------------|
| [architecture.md](./architecture.md) | Ako funguje pipeline, sessions, pamäť, mobile |
| [environment.md](./environment.md) | Vercel env, API kľúče, Builder password |
| [operations.md](./operations.md) | Deploy, testy, CI, troubleshooting |
| [diagnostic-prompt.md](./diagnostic-prompt.md) | **Kompletný AI audit** logiky, UI, renderu |
| [devmate-integration-prompts.md](./devmate-integration-prompts.md) | Historické prompty 1–9 (implementácia) |

---

## Čo Jarvis je / nie je

| Je | Nie je |
|----|--------|
| Next.js 16 chat + Builder workspace | Supabase / Postgres app |
| Mistral stream + lokálny evaluator | OpenRouter routing |
| localStorage sessions + IndexedDB memory/history | Server-side chat DB |
| Vercel serverless API routes | Edge Functions na Supabase |

---

## Testy

| Príkaz | Čo overí |
|--------|----------|
| `pnpm test` | 157 unit/integration testov |
| `pnpm test:iphone` | Vitest responsive iPhone 17 Air |
| `pnpm test:e2e:iphone` | Playwright layout + build handoff |
| `pnpm test:all` | Všetko vyššie |

---

## Stav projektu

Aktuálny backlog a hotové položky: [`../todo.md`](../todo.md)