# Jarvis — Diagnostický prompt (copy-paste pre AI agenta)

Použi tento prompt v Cursor/Grok s otvoreným projektom  
`/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
a voliteľne s URL https://jarvis-ten-omega.vercel.app/chat

---

## Prompt (skopíruj celý blok)

```
Kontext:
- Projekt: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
- Stack: Next.js 16, React, Mistral API, localStorage sessions, IndexedDB memory/history
- Produkcia: https://jarvis-ten-omega.vercel.app/chat
- NIE JE Supabase — ignoruj supabase status / anon key
- Dokumentácia: docs/architecture.md, docs/environment.md, todo.md

Úloha: Kompletná diagnostika Jarvis workspace — nájdi ANOMÁLIE (bugy) aj potvrď NORMÁLNE správanie (nie je bug).

Spusti v tomto poradí:
1. pnpm test
2. pnpm exec tsc --noEmit
3. pnpm test:e2e:iphone (ak je dostupný Chromium)
4. curl produkčné endpointy:
   - GET /chat → 200
   - POST /api/builder/unlock s wrong password → 401
   - POST /api/builder/unlock so správnym heslom → 200

---

## A) LOGIKA & STAV (očakávané vs anomália)

### Chat / Builder režim
| Očakávané (OK) | Anomália (BUG) |
|----------------|----------------|
| Default režim = Chat | Builder aktívny bez hesla |
| Build intent v Chat + locked → password dialog | Pipeline štartuje bez unlock |
| Po unlock → auto-resume build promptu | Duplicitná user správa (2× rovnaký prompt) |
| `POST /api/builder/unlock` overuje heslo na serveri | Heslo v client bundle / NEXT_PUBLIC_ |
| Production bez BUILDER_UNLOCK_PASSWORD → 503 | Production akceptuje 2366 bez env |

### Build pipeline
| Očakávané (OK) | Anomália (BUG) |
|----------------|----------------|
| Planner → stream → evaluate → refine max 2× | Viac ako 2 refinement kolá |
| Story beats: build intent, plan ready, success | Chýbajúce narrative pri build flow |
| BuildTrace v UI počas buildu | Trace zmizne počas streamu bez dôvodu |
| Incomplete HTML → SK error + refine | Tichý fail bez user feedback |

### Sessions & pamäť
| Očakávané (OK) | Anomália (BUG) |
|----------------|----------------|
| Každá session = vlastný conversationId | Pamäť z session A v session B |
| Nový chat = nová session, stará ostane | Nový chat zmaže všetky sessions |
| Migrácia legacy `chat-messages` → 1 session | Strata správ po reload |
| Memory drawer: count per session | Všetky sessions 0 ale chat má fakty |

### História buildov
| Očakávané (OK) | Anomália (BUG) |
|----------------|----------------|
| Globálna IndexedDB história (max 50) | História per-session (zatiaľ NEIMPLEMENTOVANÉ = OK) |
| Nový chat NEmazé build history | Nový chat vymaže IndexedDB history |

---

## B) ZOBRAZENIE & RENDER (UI)

### Desktop (≥768px)
| Očakávané (OK) | Anomália (BUG) |
|----------------|----------------|
| Resizable chat + artifact panel | Jeden panel zmizne |
| Preview iframe + code tab | Raw HTML v chate bez preview |
| Build telemetry nad preview | Telemetry prekryje composer |

### Mobile iPhone (420px, touch)
| Očakávané (OK) | Anomália (BUG) |
|----------------|----------------|
| Single-panel: chat XOR artifact | Oba panely naraz viditeľné |
| Počas plannera/streamu → auto artifact panel | User ostane na chate, storyboard neviditeľný |
| Footer: Chat + Preview/Code počas buildu | Taby chýbajú počas plannera |
| Touch targets ≥ 44px (header, footer) | Tlačidlo < 44px |
| Žiadny horizontal overflow | scrollWidth > clientWidth |
| safe-area-inset top/bottom | Obsah pod notch / home indicator |

### Story & empty state
| Očakávané (OK) | Anomália (BUG) |
|----------------|----------------|
| Opening quote v úvodzovkách | Prázdna obrazovka bez empty state |
| 45s nudge v Chat (ak nebol build) | Nudge v Builder mode |
| Narrative v italic + border-l | Story text ako obyčajná assistant správa |

### Animácie
| Očakávané (OK) | Anomália (BUG) |
|----------------|----------------|
| Storyboard strip počas plannera | Strip zmizne počas plannera |
| Orb mind-map v empty preview | Crash / hydration error |
| Planner overlay / status text SK | Zamrznutý status navždy |

---

## C) API & ENV

Skontroluj:
- `lib/env.ts` — MISTRAL_API_KEY required at import
- `lib/builder-unlock.ts` — production: null bez env, dev: 2366
- `app/api/chat/route.ts` — stream text, JSON len errors
- `app/api/build/plan/route.ts` — requires Mistral key
- `.env.example` — BUILDER_UNLOCK_PASSWORD dokumentované

Anomálie:
- Client importuje server password
- API route bez error envelope
- CORS / 500 na /api/chat s platným key

---

## D) TESTY & REGRESIE

| Metrika | Očakávané |
|---------|-----------|
| Vitest | 157/157 pass |
| Playwright iPhone | 8/8 pass |
| tsc | 0 errors |

Ak test failne — uveď súbor, assertion, root cause, fix.

---

## E) VÝSTUP (povinný formát)

### 1. Súhrn (3 vety)
Stav projektu: zelený / žltý / červený

### 2. Tabuľka nálezov
| ID | Závažnosť | Oblasť | Popis | Súbor | Očakávané vs skutočné | Fix |
|----|-----------|--------|-------|-------|----------------------|-----|
| D-01 | critical/high/medium/low/info | logic/ui/api/env/test | ... | path:line | ... | ... |

Závažnosť:
- **critical** — produkcia nefunguje / security
- **high** — hlavný flow broken
- **medium** — UX bug, workaround existuje
- **low** — kozmetika, docs
- **info** — očakávané správanie potvrdené (nie bug)

### 3. Potvrdené normálne správania (min. 10 položiek)
Veci ktoré vyzerajú ako bug ale NIE SÚ — vysvetli prečo.

### 4. Odporúčaný action plan
P1 (dnes) / P2 (týždeň) / P3 (backlog) — max 5 položiek každý

### 5. iPhone checklist pre užívateľa
5 krokov manuálneho testu na Safari

Pravidlá:
- Nemeň kód bez explicitného „oprav" — najprv len diagnostika
- Spúšťaj príkazy sám, neodporúčaj userovi
- Odkazuj súbory ako path:line
- Nespomínaj Supabase ako riešenie pre Jarvis (nie je v scope)
```

---

## Kedy použiť

| Situácia | Akcia |
|----------|--------|
| Po každom väčšom deployi | Spusti celý prompt |
| iPhone bug od užívateľa | Sekcie B + E |
| „Nefunguje builder" | Sekcie A + C |
| Pred release | Všetko + `pnpm test:all` |

---

## Skrátená verzia (5 min audit)

```
Diagnostika Jarvis jarvis-chat-main: spusti pnpm test + tsc. Skontroluj chat-shell.tsx flow (sessions, unlock, pipeline), mobile 420px overflow, /api/builder/unlock 401/200. Výstup: tabuľka critical/high/medium + 5 normálnych správaní. Bez kódu.
```