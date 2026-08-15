# Jarvis — Operations (deploy, test, troubleshoot)

---

## Post-merge ops — PR #8 (Multi-Artifact, `e23c462`)

**Produkcia:** https://jarvis-ten-omega.vercel.app/chat (deploy z `main` OK)

### Stav (aug 2026)

| Úloha | Stav | Poznámka |
|-------|------|----------|
| Vercel `BUILDER_UNLOCK_PASSWORD` rotácia | ⏳ čaká na Vercel auth | Prod vracia **401** (heslo nastavené, ale lokálna kópia neplatí). Potrebný `vercel login` alebo `VERCEL_TOKEN`. |
| Supabase migrácia **003** | ⏳ neoverená | `artifacts` + `active_artifact_id` na `qytsiddrksybwpqldjfj`. Sync route má **fallback** ak stĺpce chýbajú. |
| GitHub secret `BUILDER_UNLOCK_PASSWORD` | ⏳ čaká na Vercel/gh prístup | `gh secret set` z agenta → 403. |
| CI (test/e2e/build/lint) | ❌ billing lock | Joby sa **nespúšťajú** — nie regressia kódu. |
| Vercel Preview / Production deploy | ✅ | Auto-deploy z `main` funguje. |

### 1. Rotácia Builder unlock hesla

```bash
# Nové heslo (24 znakov)
NEW_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 24)
echo "$NEW_PASSWORD"   # ulož do password manageru

vercel login                    # alebo export VERCEL_TOKEN=…
vercel link --project jarvis --scope h4ck3d --yes

# Production + Preview (sensitive)
printf '%s' "$NEW_PASSWORD" | vercel env add BUILDER_UNLOCK_PASSWORD production --sensitive
printf '%s' "$NEW_PASSWORD" | vercel env add BUILDER_UNLOCK_PASSWORD preview --sensitive
# Development (bez --sensitive ak CLI odmietne)
printf '%s' "$NEW_PASSWORD" | vercel env add BUILDER_UNLOCK_PASSWORD development

# GitHub Actions E2E
gh secret set BUILDER_UNLOCK_PASSWORD --body "$NEW_PASSWORD"

# Lokálne
# .env.local → BUILDER_UNLOCK_PASSWORD=$NEW_PASSWORD

vercel redeploy jarvis-ten-omega.vercel.app --scope h4ck3d
```

Overenie:

```bash
curl -s -X POST https://jarvis-ten-omega.vercel.app/api/builder/unlock \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$NEW_PASSWORD\"}"
# Očakávané: {"success":true,"data":{"unlocked":true}}
```

### 2. Supabase migrácia 003 (pred plným cloud sync multi-page)

**Projekt:** `googlabuilder-project` · ref `qytsiddrksybwpqldjfj`

**SQL editor** (Dashboard → SQL → New query):

```sql
-- supabase/migrations/003_jarvis_session_artifacts.sql
ALTER TABLE jarvis_chat_sessions
  ADD COLUMN IF NOT EXISTS artifacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_artifact_id TEXT;
```

**Alebo CLI / Management API:**

```bash
SUPABASE_ACCESS_TOKEN=sbp_… node scripts/apply-migration-003.mjs
```

Overenie:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'jarvis_chat_sessions'
  AND column_name IN ('artifacts', 'active_artifact_id');
-- Očakávané: 2 riadky
```

### 3. Smoke po migrácii + unlock

1. `GET /chat` → 200  
2. Builder unlock curl → `unlocked: true`  
3. Prihlásený user (magic link) → session sync push/pull bez **500**  
4. Multi-page build (`<!-- page:about -->` v druhom `\`\`\`html\`\`\` bloku) → taby v preview, klik na `about.html` prepne tab  

---

## Deploy

### Automatický (odporúčané)

```bash
git push origin main
```

GitHub Actions → Vercel auto-deploy na https://jarvis-ten-omega.vercel.app

**Mesačný ops audit:** workflow `vercel-env-audit.yml` (`pnpm audit:vercel-env`) — manifest + live sondy + voliteľný `VERCEL_TOKEN`.

**Mistral API smoke:** workflow `mistral-smoke.yml` (`pnpm smoke:mistral`) — týždenný + push/PR na `main`. Bez `secrets.MISTRAL_API_KEY` alebo s placeholderom test **preskočí** (exit 0).

### Manuálny

```bash
cd /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
vercel --prod
```

Po zmene env premenných na Vercel **vždy redeploy** — env sa načíta až pri novom deployi.

---

## CI pipeline (`.github/workflows/ci.yml`)

```
test (Vitest + tsc) → e2e-iphone (Playwright) → build → lint (parallel)
```

| Job | Príkaz | Poznámka |
|-----|--------|----------|
| test | `pnpm test` + `tsc --noEmit` | 157 testov |
| e2e-iphone | `pnpm test:e2e:iphone` | Chromium, port 3141, `secrets.BUILDER_UNLOCK_PASSWORD` |
| build | `pnpm build` | `MISTRAL_API_KEY=ci-placeholder-key` |
| lint | `pnpm lint` | ESLint |

### GitHub Actions billing lock (aug 2026)

Ak CI joby zlyhajú za **~2 s** s anotáciou:

> The job was not started because your account is locked due to a billing issue.

**Príčina:** GitHub účet/org má uzamknuté Actions kvôli fakturácii — runner sa nespustí, logy neexistujú.  
**Fix:** GitHub → Settings → Billing → Actions — uhradiť / odblokovať.  
**Nie je to regressia PR** — lokálne `pnpm test`, `tsc`, `pnpm test:e2e:iphone`, `pnpm build` prechádzajú; Vercel deploy funguje nezávisle.

### Mistral smoke (`.github/workflows/mistral-smoke.yml`)

Samostatný workflow — neblokuje hlavný CI build (tam zostáva `ci-placeholder-key`).

| Trigger | Kedy |
|---------|------|
| `push` / `pull_request` | `main` |
| `schedule` | Pondelok 06:00 UTC |
| `workflow_dispatch` | manuálne |

```bash
pnpm smoke:mistral   # lokálne — načíta .env.local ak existuje
```

**GitHub Secret:** Settings → Secrets and variables → Actions → `MISTRAL_API_KEY` (rovnaký kľúč ako na Vercel).

Voliteľné env:
- `SKIP_MISTRAL_SMOKE=1` — vynútený skip
- `SMOKE_FORCE=1` — vynútený beh aj s placeholderom (debug)
- `MISTRAL_SMOKE_MODEL` — override modelu (default z `DEFAULT_AI_MODEL`)

---

## Lokálne testovanie iPhone

```bash
pnpm dev          # terminál 1
pnpm test:e2e:iphone   # terminál 2
```

Playwright spustí dev server na `http://127.0.0.1:3141` ak nebeží.

### Manuálny test na reálnom iPhone

1. Safari → https://jarvis-ten-omega.vercel.app/chat
2. Pridať na plochu (PWA)
3. Chat: „Ahoj"
4. Build: „urob mi landing page pre kaviareň" → heslo Builder
5. Overiť: artifact panel, storyboard, preview bez horizontálneho scrollu

---

## Časté problémy

### Builder unlock 503

**Príčina:** Chýba `BUILDER_UNLOCK_PASSWORD` na Vercel pre dané prostredie.  
**Fix:** Vercel env → redeploy.

### Chat neodpovedá / 401

**Príčina:** Chýba `MISTRAL_API_KEY` (server aj client settings prázdne).  
**Fix:** Vercel env alebo ⚙️ Mistral key v UI.

### `supabase status` zlyhá

**Očakávané.** Jarvis nemá Supabase. Ignoruj.

### `git add app/api/build` zlyhá

**Príčina:** Globálny `~/.gitignore_global` s pravidlom `build`.  
**Fix:** V projekte je výnimka `!app/api/build/**` v `.gitignore`.

### Playwright snapshot fail na CI

**Príčina (historicky):** Pixel PNG snapshot z macOS (`darwin.png`) vs Linux rendering.  
**Fix (aktuálne):** Používame **JSON layout metrics** snapshot (`e2e/iphone-layout-snapshot.spec.ts`) — identický na macOS aj Linux CI.

Regenerácia baseline:
```bash
pnpm test:e2e:update-layout-snapshots
```

### Sessions / pamäť zmizla

**Príčina:** Vymazaný localStorage / IndexedDB v prehliadači.  
**Očakávané:** Dáta sú len v browseri, nie na serveri.

---

## Užitočné URL

| URL | Účel |
|-----|------|
| https://jarvis-ten-omega.vercel.app/chat | Produkcia |
| https://vercel.com/h4ck3d/jarvis | Vercel dashboard |
| https://github.com/youh4ck3dme/jarvis-chat-main | GitHub |

---

## Logy

```bash
vercel logs jarvis-ten-omega.vercel.app --cwd /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
```

API errors logujú `console.error` v route handlers (`/api/chat`, `/api/build/plan`, `/api/builder/unlock`).