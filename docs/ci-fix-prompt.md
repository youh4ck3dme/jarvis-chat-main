# Jarvis — Opravný prompt pre CI (lint + E2E iPhone)

Použi tento prompt keď GitHub Actions padá na **lint** alebo **e2e-iphone** jobe.

Projekt: `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
Repo: https://github.com/youh4ck3dme/jarvis-chat-main

---

## Prompt (skopíruj celý blok)

```
Kontext:
- Projekt: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
- CI workflow: .github/workflows/ci.yml
- Joby: test, e2e-iphone, build, lint (paralelne)
- Produkcia: https://jarvis-ten-omega.vercel.app/chat

Úloha: Oprav padajúce GitHub Actions — lint a/alebo E2E iPhone testy musia byť zelené.

---

## 1) Diagnostika (spusti lokálne v tomto poradí)

pnpm install
pnpm lint
pnpm test
pnpm exec tsc --noEmit
pnpm test:e2e:iphone

Ak padá lint:
- Skontroluj či existuje eslint.config.mjs
- Skontroluj devDependencies: eslint@9, eslint-config-next@16
- ESLint 10 NIE JE kompatibilný s eslint-plugin-react — drž sa ESLint 9.x

Ak padá e2e-iphone:
- Čítaj playwright-report/ alebo CI artifact
- Typické príčiny: pixel snapshot OS mismatch (darwin vs linux), flaky timeout, chýbajúci BUILDER_UNLOCK_PASSWORD v webServer env

---

## 2) Lint — očakávaná konfigurácia

Súbory:
- eslint.config.mjs — flat config s eslint-config-next/core-web-vitals + typescript
- package.json — "lint": "eslint .", devDeps eslint@9 + eslint-config-next

Pravidlá pre existujúci kód (bez masívneho refactoru):
- react-hooks/set-state-in-effect: off
- react-hooks/refs: off
- react-hooks/preserve-manual-memoization: off
- react-hooks/immutability: off
- react-hooks/purity: off
- @typescript-eslint/no-explicit-any: warn
- @typescript-eslint/no-unused-vars: warn

Ignorované cesty:
- .next/**, out/**, build/**, copied-from-visual-html/**, playwright-report/**, test-results/**

Overenie: `pnpm lint` → exit code 0 (warnings OK, errors NIE)

---

## 3) E2E iPhone — stabilný prístup (bez pixel snapshotov)

Súbory:
- e2e/iphone-17-air.spec.ts
- e2e/iphone-build-handoff.spec.ts
- playwright.config.ts

NEPOUŽÍVAJ toHaveScreenshot() v CI — fonty a rendering sa líšia medzi macOS (darwin) a ubuntu-latest (linux).

Namiesto pixel PNG snapshotu používame:
- **JSON layout metrics** (`e2e/iphone-layout-snapshot.spec.ts` + `e2e/helpers/iphone-layout.ts`)
- Regenerácia: `pnpm test:e2e:update-layout-snapshots`

Štrukturálne layout asercie (bez snapshotu):
- viewport width = 420
- scrollWidth <= clientWidth (žiadny horizontal overflow)
- data-testid="workspace-header", "jarvis-empty-state", "workspace-footer" viditeľné
- touch targets >= 44px
- header.top < emptyState.top < footer.top (vertikálne poradie bez overlapu)

Build handoff test:
- BUILDER_UNLOCK_PASSWORD v CI env (playwright webServer alebo test fixture)
- POST /api/builder/unlock → 401 wrong password, 200 correct
- Po unlock: storyboard telemetry, artifact panel na mobile

Overenie: `pnpm test:e2e:iphone` → 15/15 passed

---

## 4) CI workflow checklist

.github/workflows/ci.yml:
- lint job: pnpm lint (nezávislý, nemusí čakať na test)
- e2e-iphone: playwright install chromium, workers: 1 na CI, retries: 2
- build: MISTRAL_API_KEY=ci-placeholder-key
- e2e-iphone: `BUILDER_UNLOCK_PASSWORD: ${{ secrets.BUILDER_UNLOCK_PASSWORD }}` (Playwright webServer)

Samostatný workflow `.github/workflows/mistral-smoke.yml`:
- `pnpm smoke:mistral` — live Mistral API (prompt `JARVIS_SMOKE_OK`)
- Bez `secrets.MISTRAL_API_KEY` → skip (exit 0), nepadá CI
- S reálnym secretom → overí kľúč + model `mistral-small-latest`

---

## 5) Commit a push

git add eslint.config.mjs package.json pnpm-lock.yaml e2e/ docs/ci-fix-prompt.md
git commit -m "fix(ci): eslint flat config + stable iPhone E2E layout assertions"
git push origin main

Over na GitHub → Actions → všetky 4 joby zelené.

---

## 6) Výstupný report (povinný formát)

| Job | Stav | Poznámka |
|-----|------|----------|
| test | ?/157 | |
| lint | ? | errors/warnings count |
| e2e-iphone | ?/8 | |
| build | ? | |

Zmenené súbory:
- (zoznam)

Čo zostáva (backlog):
- postupné zapínanie react-hooks strict rules
- eslint warnings → 0
- Preview env BUILDER_UNLOCK_PASSWORD na Vercel
```

---

## Známe chyby a fixy

| Chyba v CI | Príčina | Fix |
|------------|---------|-----|
| `ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file` | Chýba flat config | Pridať `eslint.config.mjs` + `eslint` devDep |
| `getFilename is not a function` | ESLint 10 + react plugin | Downgrade na `eslint@9` |
| `Screenshot comparison failed` (darwin vs linux) | Pixel snapshot na macOS | Použiť JSON layout snapshot (`iphone-layout-snapshot.spec.ts`), nie PNG |
| `Executable doesn't exist at .../webkit-.../pw_run.sh` | `devices["iPhone 14"]` = WebKit, CI inštaluje len Chromium | V `playwright.config.ts` nastaviť `browserName: "chromium"` |
| `BUILDER_UNLOCK_PASSWORD is not configured` | Chýba env v dev serveri | Nastaviť v playwright webServer env alebo `.env.local` |
| Password dialog nezmizne po 2366 na CI | `lib/env.ts` vyžaduje `MISTRAL_API_KEY` pri importe unlock route | Pridať `MISTRAL_API_KEY` + `BUILDER_UNLOCK_PASSWORD` do `playwright.config.ts` webServer.env |
| Flaky empty state timeout | Dev server pomalý na CI | `timeout: 30_000` v beforeEach, `retries: 2` v playwright.config |