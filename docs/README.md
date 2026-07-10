# Jarvis — Dokumentácia

**Hlavný dokument:** [`../README.md`](../README.md) (README + Developer Guide v jednom)  
**Developer shortcut:** [`../developer.md`](../developer.md)  
**Produkcia:** https://jarvis-ten-omega.vercel.app/chat  
**Repozitár:** https://github.com/youh4ck3dme/jarvis-chat-main

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