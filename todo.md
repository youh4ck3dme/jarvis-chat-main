# Jarvis — Stav projektu & backlog

**Projekt:** `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
**Produkcia:** https://jarvis-ten-omega.vercel.app/chat  
**GitHub:** https://github.com/youh4ck3dme/jarvis-chat-main  
**Model:** `mistral/mistral-small-latest`  
**Posledná aktualizácia:** júl 2026

---

## ✅ Hotové (Prompt 1–19)

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
- [x] Testy: **210** unit + **11** E2E

### P16 — Ops & bezpečnosť (Prompt A)
- [x] Builder heslo zmenené z `2366` → **`223513900`**
- [x] `BUILDER_UNLOCK_PASSWORD` na Vercel **Production + Preview + Development**
- [x] CI/E2E/playwright používajú nové heslo
- [x] Dev fallback: `DEV_BUILDER_PASSWORD_FALLBACK` v `lib/builder-unlock.ts`

---

## ⚠️ Známe limitácie

| Vec | Stav |
|-----|------|
| Supabase sync | Vyžaduje prihlásenie (magic link) + env na Vercel |
| Chat sessions | localStorage primárne; cloud sync pod `auth.users.id` |
| Build history | Globálna (IndexedDB), nie per-session |
| Story nudge | 15s delay v Chat mode |
| Playwright snapshot | `darwin.png` — môže sa líšiť na Linux CI |
| Globálny gitignore | `~/.gitignore_global` blokuje `app/api/build/` — výnimka v `.gitignore` |

---

## 🔧 Backlog — opravy (priorita)

### P1 — Ops
- [ ] Rotácia / audit Vercel env premenných (periodický)
- [ ] Redeploy produkcie po zmene hesla (ak staré heslo ešte funguje)

### P2 — UX
- [ ] História buildov per-session
- [ ] Drag & drop + hromadný upload príloh
- [ ] Jasnejší copy v menu: nový chat ≠ vymazanie pamäte

### P3 — Technický dlh
- [ ] Playwright snapshot cross-platform (Linux baseline)
- [ ] CI smoke test s reálnym Mistral key (voliteľný secret)

---

## 🚀 Backlog — nové features (voliteľné)

- [ ] Dedikovaný Supabase projekt pre Jarvis (free tier limit 2 projekty)
- [ ] OAuth providers (Google/GitHub) okrem magic linku
- [ ] Globálny memory search naprieč sessions
- [ ] Real-device E2E (BrowserStack / Safari remote)
- [ ] Rate limiting na `/api/builder/unlock`
- [ ] Batch eval / continuous monitoring (Foundry pattern)

---

## 📋 Príkazy

```bash
pnpm dev                    # http://127.0.0.1:3141/chat
pnpm test                   # 210 Vitest
pnpm test:e2e:iphone        # 11 Playwright
pnpm test:all               # Vitest + E2E
pnpm build                  # production build
```

**Builder heslo:** `223513900` (lokálny dev fallback + Vercel env)

---

## 📚 Dokumentácia

| Súbor | Obsah |
|-------|--------|
| `docs/README.md` | Index dokumentácie |
| `docs/architecture.md` | Build pipeline, sessions, memory, mobile |
| `docs/environment.md` | Vercel env, lokálny dev |
| `docs/operations.md` | Deploy, test, troubleshoot |
| `docs/diagnostic-prompt.md` | AI diagnostický prompt |