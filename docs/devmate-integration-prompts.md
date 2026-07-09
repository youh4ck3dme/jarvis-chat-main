# 4 prompty — integrácia devmate → Jarvis

**Projekt:** `/Users/erikbabcan/HUB/JARVIS/jarvis-chat-main`  
**Referencia:** https://github.com/rajdesai17/devmate  
**Nekopírovať:** Postgres, pgvector, `lib/agents/executor.ts`, seed skripty, OpenRouter

Spúšťaj **postupne 1 → 2 → 3 → 4**.

---

## Prompt 1 — P1 Foundation: typed env + typy + evaluator

```
Kontext:
- Projekt: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
- Next.js 16, Mistral Small (DEFAULT_AI_MODEL=mistral/mistral-small-latest)
- HTML preview už funguje cez copied-from-visual-html/ (jarvis-artifacts, preview panel)
- Inšpirácia: https://github.com/rajdesai17/devmate — len pattern, nie celý repo

Úloha P1 (Foundation):

1. Vytvor lib/env.ts podľa patternu devmate/lib/env.ts (Zod):
   - Povinné: MISTRAL_API_KEY
   - Voliteľné: DEFAULT_AI_MODEL, NEXT_PUBLIC_DEFAULT_AI_MODEL, BLOB_READ_WRITE_TOKEN, PORT
   - Pri chybe: throw s čitateľnou správou pri štarte/importe

2. Vytvor types/build.ts:
   - BuildPhase: "planner" | "builder" | "evaluator" | "refine"
   - BuildPlan: { summary, sections: string[], primaryColor?, ctaLabel?, mustHaveScript: boolean }
   - BuildEvaluation: { ok: boolean, score: number, issues: string[], shouldRefine: boolean }
   - BuildTrace: { phases: BuildPhaseMetric[], totalLatencyMs, refinementRounds }
   - BuildPhaseMetric: { phase, latencyMs, detail? }

3. Vytvor lib/agents/build-evaluator.ts:
   - Použi existujúcu validateJarvisHtmlArtifact() z copied-from-visual-html/lib/jarvis-artifacts.ts
   - Pridaj scoring 0–1 (kompletnosť </html>, <script>, anchor ids, sekcie)
   - Export: evaluateBuildArtifact(html: string | null): BuildEvaluation
   - shouldRefine=true ak chýba </html>, <script>, alebo score < 0.7

4. Zapoj evaluator do chat-shell.tsx po dokončení streamu (namiesto len setError)

Pravidlá:
- Nemigruj na Postgres/OpenRouter
- Nemeň copied-from-visual-html/ — len importuj
- Spusti pnpm test a pnpm build na konci
- Žiadne zmeny mimo scope

Výstup: zoznam súborov + čo sa zmenilo v chat-shell.
```

---

## Prompt 2 — P1 Orchestrátor: refinement loop (devmate pattern)

```
Kontext:
- Projekt: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
- Prompt 1 musí byť hotový (lib/env.ts, types/build.ts, build-evaluator.ts)
- Pattern z devmate: lib/agents/orchestrator.ts — refinement max 2 kolá
- Jarvis má jeden Mistral stream cez /api/chat

Úloha P2 (Build Orchestrator):

1. Vytvor lib/agents/build-orchestrator.ts:
   - MAX_REFINEMENT_ROUNDS = 2
   - runBuildEvaluation(messages, isStreaming) → BuildTrace + BuildEvaluation
   - Ak shouldRefine a rounds < max: vráť refinementPrompt (SK/EN) typu:
     "Dokonči HTML dokument. Chýba: [issues]. Pridaj funkčný inline <script> pre všetky buttony."
   - Meraj latency per fáza (performance.now())

2. Uprav chat-shell.tsx sendMessage flow:
   - Po streame: orchestrator.evaluate()
   - Ak shouldRefine: automaticky pošli refinement message (1× alebo 2×) bez user input
   - Ulož BuildTrace do state pre UI (Prompt 3)

3. Voliteľne: nový endpoint POST /api/build/evaluate (len JSON, nie stream) ak je čistejšie

4. Zachovaj existujúci JARVIS_ADVISOR_SYSTEM_PROMPT; refinement je dodatočný user message

Pravidlá:
- Nekopíruj devmate executor.ts (vector search)
- Jeden model Mistral Small pre všetko
- Po refinemente znova validuj — loop kým ok alebo max rounds

Výstup: funguje auto-doplnenie useknutého HTML (test: simuluj useknutý ```html bez </html>).
```

---

## Prompt 3 — P2 UI: Build metrics + reasoning timeline

```
Kontext:
- Projekt: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
- BuildTrace state z Prompt 2
- UI štýl: tmavý Lovable (#111, #1a1a1a, #2a2a2a), Inter font
- Inšpirácia UI: devmate app/page.tsx — MetricTile, formatLatency, StrategyBadge (~riadky 90–620)

Úloha P3 (Telemetry UI):

1. Vytvor components/workspace/build-metrics.tsx:
   - MetricTile (label, value) — dark theme
   - StrategyBadge pre fázy: Plan → Stream → Validate → Refine
   - Export formatLatency(ms), formatPercent(0-1) z devmate patternu

2. Vytvor components/workspace/build-reasoning-panel.tsx:
   - Accordion/timeline: každá fáza z BuildTrace
   - Zobraz: latency, issues z evaluatora, refinement round count
   - Empty state keď ešte nebol build

3. Integruj do JarvisPreviewPanel alebo nad ním v chat-shell:
   - Viditeľné keď existuje artifact alebo prebieha stream
   - Na mobile: collapsible pod preview switcherom

4. Pridaj metriky: HTML veľkosť (chars), počet sekcií (heuristika), build latency

Pravidlá:
- Nerozbij existujúci footer (‹ Chat, Live Preview / Code, Ask Jarvis)
- Match farby workspace — nie devmate indigo/light theme

Výstup: screenshot-ready panel s metrikami po jednom build requeste.
```

---

## Prompt 4 — P2 Planner + experience + docs + deploy

```
Kontext:
- Projekt: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
- Prompty 1–3 hotové (evaluator, orchestrator, metrics UI)
- Pattern: devmate lib/agents/planner.ts — generateObject + Zod pred hlavným streamom
- Model: mistral/mistral-small-latest, API key z lib/env.ts

Úloha P4 (Planner + polish + deploy):

1. Vytvor lib/agents/build-planner.ts:
   - Input: user prompt (string)
   - Output: BuildPlan (Zod schema) — sekcie, CTA, farby, jazyk SK/CZ/EN
   - Použi AI SDK generateObject alebo streamText s JSON — čo funguje s Mistral
   - Trvanie cieľ < 3s

2. Pred stream v chat-shell: zavolaj planner, vlož plan do system promptu:
   "Build according to this plan: [JSON]"

3. Vytvor lib/agents/build-experience.ts (lightweight, bez Postgres):
   - Ukladaj posledných 10 BuildEvaluation do localStorage (key: jarvis-build-experience)
   - Ak >50% mali chýbajúci </script>: pridaj hint do planner/system prompt

4. Vytvor docs/architecture.md:
   - Mermaid: Planner → Builder → Evaluator → Refine → Preview
   - Sekcia "Čo sme prevzali z devmate" + čo nie

5. Aktualizuj todo.md — zaškrtni hotové položky

6. Spusti pnpm test && pnpm build && vercel --prod --yes

Pravidlá:
- Žiadny Postgres/pgvector
- Všetky buttony v generovanom HTML musia mať <script> (advisor prompt už to má — over)
- Deploy na jarvis-ten-omega.vercel.app

Výstup: URL deployu + súhrn zmien.
```

---

## Prompt 5 — P3 Polish: IndexedDB history + unified API

```
Kontext:
- Projekt: /Users/erikbabcan/HUB/JARVIS/jarvis-chat-main
- Prompty 1–4 hotové (planner, orchestrator, metrics, deploy)
- Zostáva z todo.md P3: IndexedDB história + unified API responses

Úloha P5 (Polish):

1. Vytvor lib/api-response.ts:
   - jsonError(error, status) → { success: false, error }
   - jsonSuccess(data) → { success: true, data }
   - readApiErrorMessage(payload) — podpora legacy { error } aj unified formátu

2. Uprav app/api/chat/route.ts:
   - Všetky JSON error responses cez jsonError()
   - Úspešný stream ostáva text/plain (bez zmeny)

3. Uprav app/api/build/plan/route.ts na jsonError/jsonSuccess

4. Vytvor lib/build-history/build-history-store.ts:
   - IndexedDB JarvisBuildHistory, store builds, max 50 záznamov
   - BuildHistoryRecord: prompt, evaluation, trace, htmlChars, planSummary
   - saveBuildHistory(), listBuildHistory(), clearBuildHistory()

5. chat-shell.tsx:
   - Po build-e ulož do IndexedDB
   - clearChat() vymaže aj históriu
   - readApiError() používa readApiErrorMessage()
   - Build reasoning panel ukáže počet uložených buildov

6. Aktualizuj todo.md, docs/architecture.md

7. pnpm test && pnpm build && vercel --prod --yes

Pravidlá:
- Žiadny Postgres
- Nerozbij footer ani stream chat UX
- Deploy jarvis-ten-omega.vercel.app

Výstup: URL + čo sa uloží do IndexedDB.
```

---

## Prompt 6 — P3 Test foundation (hotové)

```
Cieľ: coverage report + unit testy pre každý core modul build pipeline.

1. @vitest/coverage-v8 + script test:coverage
2. Threshold 80% na lib/agents/**, lib/api-response.ts, resolve-api-key, default-model
3. Nové testy: resolve-api-key, default-model, build-planner (mock), normalizeBuildPlan, recordPlannerPhase

Výstup: pnpm test:coverage zelený, 73+ testov.
```

---

## Prompt 7 — P4 IndexedDB + pipeline integrácia (hotové)

```
Výsledok:
- fake-indexeddb vo vitest.setup.ts
- lib/agents/__fixtures__/html-samples.ts
- build-pipeline-simulation.test.ts (refinement loop + experience hint 6/10)
- build-history-store CRUD testy (save/list/trim 50/clear)
- 82 testov, build-history coverage >70%
```

---

## Prompt 7 — P4 IndexedDB + pipeline integrácia (pôvodný plán)

```
Kontext:
- Prompt 6 hotový (73 testov, ~95% lines v lib/agents)
- Najväčšia medzera: build-history IndexedDB CRUD + chat-shell sendMessage loop

Úloha P7:

1. Pridaj fake-indexeddb (alebo jsdom IDB) do vitest setup

2. Rozšír lib/build-history/build-history-store.test.ts:
   - saveBuildHistory → listBuildHistory (zoradené od najnovšieho)
   - trim na max 50 záznamov
   - clearBuildHistory

3. Vytvor lib/agents/__fixtures__/html-samples.ts:
   - TRUNCATED_HTML, COMPLETE_HTML, NO_SCRIPT_HTML

4. Vytvor lib/agents/build-pipeline-simulation.test.ts:
   - Simuluj loop: evaluate → refine prompt → re-evaluate (max 2×)
   - Over experience hint: 6/10 builds bez script → getExperienceHint() !== null

5. Voliteľne: readExperienceHint() test s loadBuildExperience mock

Pravidlá:
- Žiadne zmeny v chat-shell UI (len testy + fixtures)
- Coverage lib/build-history/** min 70% po P7

Výstup: IndexedDB CRUD otestované + golden HTML scenáre dokumentované.
```

---

## Prompt 8 — P5 chat-shell extrakcia (hotové)

```
Extrahuj lib/chat/build-pipeline.ts z chat-shell sendMessage.
Testuj planner-before-stream, refinement loop, saveBuildHistory bez Reactu.
1 RTL smoke test chat-shell s mock fetch.
```

**Výstup:**
- `lib/chat/build-pipeline.ts` — `runBuildPipeline()`, `buildIncompleteHtmlError()`, hooky `fetchPlan` / `streamReply` / `onRefinementRound` / `onRoundComplete`
- `lib/chat/build-pipeline.test.ts` — planner-before-stream, refinement 2×, planner fallback, IndexedDB persist
- `components/chat/chat-shell.test.tsx` — RTL smoke s mock `fetch` (plan + stream)
- `chat-shell.tsx` — `sendMessage` deleguje na `runBuildPipeline()`

---

## Prompt 9 — P6 polish + CI (návrh)

```
1. TypeScript cleanup — vypnúť ignoreBuildErrors, opraviť všetky tsc chyby
2. Odstrániť mŕtvy chat-sidebar alebo zapojiť multi-session UI
3. Zladiť Message typ (imageData / attachment / attachmentName)
4. Coverage: lib/chat/** v vitest threshold
5. Playwright smoke: /chat send → preview visible
6. GitHub Action: pnpm test && pnpm build na push
7. vercel --prod po zelenej CI
```

**Cieľ:** čistý `tsc --noEmit`, automatický deploy, žiadne maskované build chyby.