# Jarvis — Integrácia patternov z devmate

**Zdroj:** https://github.com/rajdesai17/devmate (forenzná analýza, júl 2026)  
**Projekt:** `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
**Produkcia:** https://jarvis-ten-omega.vercel.app/chat  
**Default model:** `mistral/mistral-small-latest` (MISTRAL_API_KEY)

## Záver

Celý devmate **nekopírovať**. Brať: multi-agent orchestrátor, evaluator + refinement loop, typed env, telemetry UI, Zod API pattern.

## Čo NIE (nekopírovať)

- `lib/db/*`, `drizzle/*`, `scripts/seed*.ts`, `install-pgvector.ps1`
- `lib/agents/executor.ts` (vector teammate search)
- OpenRouter — Jarvis používa priamy Mistral API

## Priorita P1 — Foundation

- [x] `lib/env.ts` — Zod validácia: `MISTRAL_API_KEY`, `DEFAULT_AI_MODEL`, `NEXT_PUBLIC_DEFAULT_AI_MODEL`, `BLOB_READ_WRITE_TOKEN`, `PORT`
- [x] `lib/agents/build-orchestrator.ts` — Planner → Stream → Evaluator → refinement (max 2×)
- [x] `lib/agents/build-evaluator.ts` — wrap `validateJarvisHtmlArtifact()` + scoring + `shouldRefine`
- [x] `types/build.ts` — `BuildTrace`, `BuildPlan`, `BuildEvaluation`, `PlannerResult`
- [x] API pattern `{ success, data, error }` v error responses (chat + build/plan routes)

## Priorita P2 — UI & Planner

- [x] `components/workspace/build-metrics.tsx` — `MetricTile`, `formatLatency`, `StrategyBadge` (tmavý Lovable štýl)
- [x] `components/workspace/build-reasoning-panel.tsx` — timeline Plan → Stream → Validate → Refine
- [x] `lib/agents/build-planner.ts` — `generateObject` + Zod: sekcie, farby, CTA, jazyk pred streamom
- [x] Integrovať metriky do `chat-shell.tsx` / preview oblasti
- [x] `lib/agents/build-experience.ts` — localStorage posledných 10 evaluácií + script hint
- [x] `docs/architecture.md` — mermaid build pipeline

## Priorita P3 — Voliteľné

- [x] IndexedDB história buildov (`lib/build-history/build-history-store.ts`)
- [x] API pattern `{ success, data, error }` aj v `/api/chat` error responses
- [x] `lib/api-response.ts` — `jsonError`, `jsonSuccess`, `readApiErrorMessage`

## Architektúra (cieľ)

```
Planner (Mistral Small, JSON) → Builder (stream ```html```) → Evaluator (local validate)
  → ak issues: Refine pass (max 2×) → Live Preview → IndexedDB history
```

## Už hotové v Jarvis

- [x] Lovable workspace UI (chat + preview + footer)
- [x] `copied-from-visual-html/` — jarvis-artifacts, preview panel, advisor prompt
- [x] `DEFAULT_AI_MODEL=mistral/mistral-small-latest` (local + Vercel)
- [x] Deploy: jarvis-ten-omega.vercel.app
- [x] 5 implementačných promptov — `docs/devmate-integration-prompts.md`

## Priorita P4 — Test coverage

- [x] Prompt 6 — `test:coverage`, threshold 80%, `resolve-api-key`, `default-model`, `build-planner` testy
- [x] Prompt 7 — IndexedDB CRUD testy + HTML fixtures + pipeline simulation
- [x] Prompt 8 — extrakcia `build-pipeline.ts` z chat-shell + integračný test
- [x] Prompt 9 — TS cleanup, coverage lib/chat, odstránenie mŕtveho sidebaru, Vercel deploy

## Implementačné prompty

→ **`docs/devmate-integration-prompts.md`** (Prompt 1–9)