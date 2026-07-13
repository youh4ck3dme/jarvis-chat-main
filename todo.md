# Jarvis — Stav projektu & backlog

**Projekt:** `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
**Produkcia:** https://jarvis-ten-omega.vercel.app/chat  
**GitHub:** https://github.com/youh4ck3dme/jarvis-chat-main  
**Model:** `mistral/mistral-small-latest`  
**Posledná aktualizácia:** júl 2026

---

## ✅ Hotové (Prompt 1–21)

### P21 — Desktop Voice Agent (Mark XXXIX-OR monorepo)
- [x] Fáza 0–A: shared prompt, tool manifest (18 tools), sync scripts
- [x] Fáza B–D: Next.js status badge, health client hook, voice panel, cloud memory sync
- [x] Fáza E: 18 macOS-native actions (vrátane `agent_task`)
- [x] Fáza F–G: PyQt6 interface, FastAPI health port 8765, auth export button
- [x] Voice Lite: desktop-voice-panel, desktop-auth-export, memory UI badge
- [x] Parallel ops: `desktop:health`, `jarvis-stack.sh`, CI workflow, composer mic hint
- [x] Vitest: lib/desktop-agent, lib/prompts, lib/speech-recognition
- [x] Memory sync E2E (desktop → web) — `scripts/setup-desktop-auth-e2e.ts` + `scripts/memory-sync-e2e.sh` (local + Vercel prod PASS, júl 2026)

### P1–P10 — Foundation → Production hardening
- [x] Build pipeline, orchestrátor, telemetry, multi-session chat, server-side unlock
- [x] iPhone 17 Air QA, PWA, CI (test → e2e → build → lint)
- [x] Story nudge 15s, lokálne zvuky, mobile chat streaming regression

### P11 — Export backup + Supabase session sync (P16)
- [x] Export/Import backup JSON (sessions + pamäť)
- [x] `POST/GET /api/sessions/sync` + device `sync_key`

### P12 — Memory cloud sync (P17)
- [x] `POST/GET /api/memory/sync` — pamäť per conversation + user profile
- [x] Vercel env: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

### P13 — Supabase Auth multi-device (P18)
- [x] Magic link (`/auth/callback`), `JarvisAuthPanel`
- [x] Sync API vyžaduje JWT; migrácia device → user
- [x] Vercel: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### P14 — Export projektu ZIP (Prompt F)
- [x] Menu → **Export projektu (ZIP)** — sessions + pamäť + build history + `latest-build.html`
- [x] `backup.json` importovateľný cez Import backup

### P15 — Prílohy JPEG/HEIC/PNG/WebP/PDF/HTML
- [x] `lib/chat/jarvis-attachments.ts` — HEIC→JPEG, MIME routing, system prompt
- [x] Composer accept všetkých formátov; API multimodal pre image/PDF, inline HTML
- [x] Export tlačidlá v assistant správach (HTML/PNG/PDF)
- [x] Testy: **216** unit + **14** E2E (`e2e/ux-polish.spec.ts`)

### P16 — Ops & bezpečnosť (Prompt A)
- [x] Builder heslo rotované — len `BUILDER_UNLOCK_PASSWORD` env (bez hardcoded fallback v kóde)
- [x] `BUILDER_UNLOCK_PASSWORD` na Vercel **Production + Preview + Development**
- [x] CI/E2E/playwright používajú nové heslo
- [x] Odstránený hardcoded dev fallback v `lib/builder-unlock.ts` (P0-1)

### P20 — Vercel env audit (P1 Ops)
- [x] `lib/ops/vercel-env-manifest.ts` + `lib/ops/vercel-env-audit.ts`
- [x] `pnpm audit:vercel-env` + `.github/workflows/vercel-env-audit.yml` (mesačne)
- [x] Live sondy: builder unlock, Supabase status, legacy heslo `2366`
- [x] **Preview:** doplniť `MISTRAL_API_KEY` + model defaults (cez `vercel env add --non-interactive`)

### P19 — Playwright layout snapshot (cross-platform)
- [x] JSON layout metrics snapshot namiesto pixel PNG (žiadny darwin/linux drift)
- [x] `e2e/helpers/iphone-layout.ts` + `e2e/iphone-layout-snapshot.spec.ts`
- [x] `pnpm test:e2e:update-layout-snapshots` pre regeneráciu baseline
- [x] Testy: **228** unit + **15** E2E

### P18 — Builder unlock rate limiting
- [x] `/api/builder/unlock` — 10 pokusov / IP / 15 min, odpoveď `429` + `Retry-After`
- [x] Env: `BUILDER_UNLOCK_RATE_LIMIT_MAX`, `BUILDER_UNLOCK_RATE_LIMIT_WINDOW_SEC`
- [x] Testy: **228** unit + **14** E2E

### P17 — UX polish (Prompt B)
- [x] História buildov per-session (IndexedDB `sessionId`, max 50 na chat)
- [x] Drag & drop + hromadný upload príloh (max 10, batch send queue)
- [x] Jasnejší copy v menu: nový chat ≠ vymazanie pamäte
- [x] Testy: **216** unit + **14** E2E (`e2e/ux-polish.spec.ts`)

---

## ⚠️ Známe limitácie

| Vec | Stav |
|-----|------|
| Supabase sync | Vyžaduje prihlásenie (magic link) + env na Vercel |
| Chat sessions | localStorage primárne; cloud sync pod `auth.users.id` |
| Build history | Per-session (IndexedDB), max 50 na chat |
| Story nudge | 15s delay v Chat mode |
| Playwright snapshot | JSON layout metrics (cross-platform), nie pixel PNG |
| Globálny gitignore | `~/.gitignore_global` blokuje `app/api/build/` — výnimka v `.gitignore` |

---

## 🔧 Backlog — opravy (priorita)

### P1 — Ops
- [x] Rotácia / audit Vercel env premenných (periodický) — `pnpm audit:vercel-env` + workflow mesačne
- [x] Redeploy produkcie po zmene hesla — overené cez Vercel env (staré `2366` zamietnuté)

### P2 — UX
- [x] História buildov per-session
- [x] Drag & drop + hromadný upload príloh
- [x] Jasnejší copy v menu: nový chat ≠ vymazanie pamäte

### P3 — Technický dlh
- [x] Playwright snapshot cross-platform (JSON layout baseline, nie darwin PNG)
- [x] CI smoke test s reálnym Mistral key (voliteľný secret `MISTRAL_API_KEY` v GitHub Secrets)

---

## 🚀 Backlog — nové features (voliteľné)

- [ ] Dedikovaný Supabase projekt pre Jarvis (free tier limit 2 projekty)
- [ ] OAuth providers (Google/GitHub) okrem magic linku
- [ ] Globálny memory search naprieč sessions
- [ ] Real-device E2E (BrowserStack / Safari remote)
- [x] Rate limiting na `/api/builder/unlock` (10/IP/15 min, `429` + `Retry-After`)
- [ ] Batch eval / continuous monitoring (Foundry pattern)

### 💥 Bomba nápady (Builder P2/P3)

Detail: [README.md#bomba-nápady-builder-p2p3](./README.md#bomba-nápady-builder-p2p3)

- [x] **#1** Diff-based Snapshot Timeline s vizuálnym A/B preview (P2)
- [x] **#2** Prompt-to-Component Library — local RAG (P2, závisí na #1)
- [ ] **#3** Multi-Artifact Workspace — mini „pages“ (P2)
- [x] **#4** Sandbox Runtime Inspector — Console + Network overlay (P3)
- [x] **#5** „Fix it“ self-heal loop (P3, závisí na #4)
---

## 📋 Príkazy

```bash
pnpm dev                    # http://127.0.0.1:3141/chat
pnpm audit:vercel-env:full  # Vercel env audit + CLI matrix (odporúčané)
pnpm audit:vercel-env       # Vercel env audit (len live sondy)
pnpm smoke:mistral          # live Mistral API smoke (skip bez kľúča)
pnpm test                   # 240 Vitest
pnpm test:e2e:iphone        # 15 Playwright
pnpm test:all               # Vitest + E2E
pnpm build                  # production build
```

**Builder heslo:** `BUILDER_UNLOCK_PASSWORD` v `.env.local` / Vercel (nie v repozitári)

---

## 📚 Dokumentácia

| Súbor | Obsah |
|-------|--------|
| `docs/README.md` | Index dokumentácie |
| `docs/architecture.md` | Build pipeline, sessions, memory, mobile |
| `docs/environment.md` | Vercel env, lokálny dev |
| `docs/operations.md` | Deploy, test, troubleshoot |
| `docs/diagnostic-prompt.md` | AI diagnostický prompt |
| `docs/desktop-agent.md` | Hlasový Desktop Agent ( setup, run, troubleshooting ) |