# Jarvis — Stav projektu & backlog

**Projekt:** `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
**Produkcia:** https://jarvis-ten-omega.vercel.app/chat  
**GitHub:** https://github.com/youh4ck3dme/jarvis-chat-main  
**Model:** `mistral/mistral-small-latest`  
**Posledná aktualizácia:** júl 2026

---

## ✅ Hotové (Prompt 1–16)

### P1 — Foundation
- [x] `lib/env.ts` — Zod validácia env
- [x] `types/build.ts` — BuildTrace, BuildPlan, BuildEvaluation
- [x] `lib/agents/build-evaluator.ts` — scoring 0–1, shouldRefine
- [x] `lib/agents/build-orchestrator.ts` — refinement max 2×
- [x] `lib/api-response.ts` — `{ success, data, error }`

### P2 — Orchestrátor & UI metriky
- [x] `lib/chat/build-pipeline.ts` — extrahovaný z chat-shell
- [x] `lib/agents/build-planner.ts` — JSON plán pred streamom
- [x] Build telemetry, metrics, reasoning panel
- [x] `lib/agents/build-experience.ts` — localStorage hints

### P3 — História & API polish
- [x] IndexedDB build history (max 50)
- [x] `/api/chat` + `/api/build/plan` error envelope

### P4 — Test coverage & CI
- [x] Vitest: 157 testov (agents, lib/chat, responsive, integrity)
- [x] Playwright iPhone 17 Air: 8 E2E testov
- [x] CI: test → e2e-iphone → build → lint
- [x] Odstránený mŕtvy `chat-sidebar.tsx`

### P5 — Chat / Builder modes & story
- [x] Default **Chat** režim, Builder chránený heslom
- [x] `lib/chat/jarvis-story.ts` — narrative beats, 45s nudge, build intent
- [x] Storyboard strip + Orb mind-map animácie
- [x] Build intent → password dialog → auto-resume pipeline

### P6 — Mobile QA (Prompt 11)
- [x] `lib/agents/build-mobile-validator.ts`
- [x] iPhone 17 Air viewport 420×912, touch targets 44px
- [x] E2E pixel snapshot + overflow checks

### P7 — Multi-session chat (Prompt 12)
- [x] `lib/chat/chat-sessions.ts` — localStorage sessions + migrácia `chat-messages`
- [x] Drawer „Konverzácie“ — prepínanie, mazanie
- [x] Pamäť viazaná na `sessionId` (= conversationId)

### P8 — Server-side Builder unlock (Prompt 13)
- [x] `POST /api/builder/unlock` — len `BUILDER_UNLOCK_PASSWORD` (server)
- [x] `lib/chat/builder-unlock-client.ts` — žiadny client-side password
- [x] E2E story handoff na iPhone

### P9 — Per-session memory UI (Prompt 14)
- [x] `lib/memory/session-memory-summary.ts`
- [x] Drawer „Pamäť konverzácií“ — prehľad + otvorenie panelu per session

### P10 — Production hardening
- [x] Produkcia bez dev fallback hesla (503 bez env)
- [x] `BUILDER_UNLOCK_PASSWORD` na Vercel Production
- [x] Opravená duplicitná user správa po unlock
- [x] Mobile auto-switch na artifact počas plannera
- [x] PWA metadata + dark webmanifest
- [x] GitHub push: 9+ commitov na `main`

### P11 — Production polish + iPhone UX (Prompt 15)
- [x] Story nudge: 45s → **15s** (`JARVIS_STORY_NUDGE_DELAY_MS`)
- [x] Chat režim: pravý panel idle copy (`JARVIS_ORB_CHAT_IDLE`), nie build streaming text
- [x] Zvuky: `public/sounds/{click,record,launch}.mp3` — lokálne, bez Vercel Blob
- [x] `allowedDevOrigins` v `next.config.mjs` pre dev na `127.0.0.1:3141`
- [x] Regresný test: chat + mobile streaming nikdy neotvára artifact panel
- [x] Bundle audit: `BUILDER_UNLOCK_PASSWORD` / `2366` nie v client `.next/static`
- [x] Vitest **161/161**, E2E iPhone **8/8**, lint 0 errors, build OK

### P12 — Export backup + Supabase sync (Prompt 16)
- [x] **Export backup** — všetky konverzácie + IndexedDB pamäť → JSON (`lib/chat/jarvis-backup.ts`)
- [x] **Import backup** — obnova sessions + memory z JSON (menu drawer)
- [x] **Supabase sync** — `POST/GET /api/sessions/sync`, device `sync_key` v localStorage
- [x] Migrácia `supabase/migrations/001_jarvis_chat_sessions.sql`
- [x] Auto pull on load + debounced push (2s) keď je Supabase nakonfigurovaný
- [x] Vitest **170/170**, E2E iPhone **8/8**

---

## ⚠️ Známe limitácie (nie bugy, ale treba vedieť)

| Vec | Stav |
|-----|------|
| Supabase sync | **Voliteľné** — vyžaduje `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + SQL migráciu |
| Chat sessions | localStorage primárne; cloud sync per device key keď je Supabase zapnutý |
| Build history | Globálna (IndexedDB), nie per-session |
| Story nudge | 15s delay v Chat mode |
| Preview env Vercel | `BUILDER_UNLOCK_PASSWORD` môže chýbať na Preview deployoch |
| Playwright snapshot | `darwin.png` — môže sa líšiť na Linux CI |
| Globálny gitignore | `~/.gitignore_global` blokuje `app/api/build/` — výnimka v `.gitignore` |

---

## 🔧 Backlog — opravy (priorita)

### P1 — Bezpečnosť & ops
- [ ] Zmeniť produkčné heslo z `2366` na silnejšie
- [ ] Pridať `BUILDER_UNLOCK_PASSWORD` do Vercel **Preview** env
- [ ] Rotácia / audit Vercel env premenných

### P2 — UX
- [ ] História buildov per-session
- [ ] Jasnejší copy v menu: nový chat ≠ vymazanie pamäte
- [ ] Loading stav pri server-side unlock (už čiastočne)

### P3 — Technický dlh
- [ ] Playwright snapshot cross-platform (Linux baseline)
- [ ] CI smoke test s reálnym Mistral key (voliteľný secret)
- [ ] `todo.md` / docs sync v CI check (voliteľné)

---

## 🚀 Backlog — nové features (voliteľné)

- [ ] Supabase auth (multi-device pod jedným účtom namiesto device key)
- [ ] Sync pamäte (IndexedDB) do cloudu — zatiaľ len sessions
- [ ] Globálny memory search naprieč sessions
- [ ] Real-device E2E (BrowserStack / Safari remote)
- [ ] Rate limiting na `/api/builder/unlock`
- [ ] Batch eval / continuous monitoring (Foundry pattern)

---

## 📋 Príkazy

```bash
pnpm dev                    # http://127.0.0.1:3141/chat
pnpm test                   # 170 Vitest
pnpm test:e2e:iphone        # 8 Playwright
pnpm test:all               # Vitest + E2E
pnpm build                  # production build
```

---

## 📚 Dokumentácia

| Súbor | Obsah |
|-------|--------|
| `docs/README.md` | Index dokumentácie |
| `docs/architecture.md` | Build pipeline, sessions, memory, mobile |
| `docs/environment.md` | Vercel env, lokálny dev |
| `docs/operations.md` | Deploy, test, troubleshoot |
| `docs/diagnostic-prompt.md` | **AI diagnostický prompt** — anomálie + očakávané správanie |
| `docs/devmate-integration-prompts.md` | Historické implementačné prompty 1–9 |

---

## 🔍 Diagnostika

Pre kompletný audit spusti obsah `docs/diagnostic-prompt.md` v AI agentovi (Cursor/Grok) s otvoreným projektom.