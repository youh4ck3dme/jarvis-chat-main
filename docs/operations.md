# Jarvis — Operations (deploy, test, troubleshoot)

---

## Deploy

### Automatický (odporúčané)

```bash
git push origin main
```

GitHub Actions → Vercel auto-deploy na https://jarvis-ten-omega.vercel.app

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
| e2e-iphone | `pnpm test:e2e:iphone` | Chromium, port 3141 |
| build | `pnpm build` | `MISTRAL_API_KEY=ci-placeholder-key` |
| lint | `pnpm lint` | ESLint |

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

**Príčina:** Snapshot z macOS (`darwin.png`) vs Linux rendering.  
**Fix:** Regenerovať snapshot na CI alebo použiť `maxDiffPixelRatio` (už 0.02).

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