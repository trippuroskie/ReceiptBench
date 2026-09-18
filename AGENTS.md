# ReceiptBench – Agent Guide

ReceiptBench is a **benchmarking tool for OCR pipelines**. Users evaluate vision/LLM models (via OpenRouter) on receipt images with configurable prompts and ground-truth JSON, and compare accuracy, inference time, cost, and throughput.

## Stack

- **Frontend:** React 19, TypeScript, Vite
- **API:** OpenRouter (vision/chat completions); requires `OPENROUTER_API_KEY` in `.env.local`.
  Only that name is read by `vite.config.ts`; it is exposed to the app under *both*
  `process.env.OPENROUTER_API_KEY` and `process.env.API_KEY` (the latter is what
  `services/openrouter.ts` actually reads). Setting `API_KEY` in `.env.local` does nothing.
- **Storage:** localStorage (`ocr_prompts`, `ocr_results`, `ocr_custom_models`) for prompts, results and
  custom models; IndexedDB (`ReceiptBenchDB` / `receipts`) for images and base64 data

## Key Concepts

- **Prompts** – OCR instructions; versioned and stored in state.
- **Receipts** – Images plus ground-truth JSON used to compute extraction accuracy.
- **Models** – Built-in list in `constants.tsx` + `types.ts`; users can add custom OpenRouter model IDs via the Benchmark UI (stored in `customModels`).
- **Benchmark** – Runs a selected set of (prompt × model × receipt), calls OpenRouter per task, then records accuracy, inference time, cost, tokens.
- **Results / Leaderboard** – Results are per-run; Leaderboard aggregates by model and supports ranking by accuracy, inference time, cost, or tokens/sec.

## Project Layout

- `App.tsx` – Root state (view, receipts, prompts, customModels, results), batch run logic, persistence.
- `types.ts` – `ViewState`, `ModelId`, `BenchmarkResult`, `BenchmarkMetrics`, `Receipt`, `Prompt`, `CustomModel`.
  Note: `ViewState` includes `models` and `matrix`; only `matrix` has a branch in `App.tsx`, and neither
  has a `Sidebar` nav item, so they are unreachable in the UI today.
- `constants.tsx` – `MODEL_CONFIGS` (name, pricing, color), `SYSTEM_PROMPT_PREFIX`, default ground-truth template.
- `services/openrouter.ts` – `OpenRouterService`: `runOCR(modelId, prompt, imageBase64, mimeType)`, `refinePrompt(...)`.
- `utils/evaluator.ts` – `calculateAccuracy(actualJson, groundTruthJson)`, token estimation, JSON path helpers.
- `components/` – `Sidebar`, `Dashboard`, `PromptManager`, `ReceiptManager`, `BenchmarkRunner`,
  `ResultsHistory`, `Compare`, `Leaderboard`, `CostAccuracyMatrix`.
- `scripts/seed-demo-data.js` – synthetic prompts/receipts/results for demoing the UI with no API key.
  Paste into the browser console and reload. Used to produce the README screenshots.

## Conventions

- **Views:** Controlled by `ViewState` in `App.tsx`; sidebar drives `setView`. Adding a view = new `ViewState` + nav item in `Sidebar` + branch in `App.tsx`.
- **Models:** To add a built-in model: add a config to `MODEL_CONFIGS` in `constants.tsx`. By convention
  also add the ID to `ModelIdValues` in `types.ts` and reference it — but `ModelId` is `string`, so that
  step is readability, not type safety. Custom models need no code change (UI only), but get placeholder
  pricing from `BenchmarkRunner.tsx`, so their cost numbers are not meaningful.
- **Env:** Set `OPENROUTER_API_KEY` in `.env.local`; see `.env.example`. Do not commit secrets.
- **Key exposure:** `vite.config.ts` inlines the key into the client bundle via `define`, and the browser
  calls OpenRouter directly. The key is therefore readable by anyone loading the page. Never deploy a
  build publicly; treat `dist/` as secret. Never add code that logs the key or sends it off-origin.

## Run Locally

```bash
npm install
# Set OPENROUTER_API_KEY in .env.local
npm run dev
```

Build: `npm run build`. Preview: `npm run preview`.

## Gotchas

- **Failed runs are silently dropped.** `processTask` in `App.tsx` catches errors, logs to console, and
  records nothing — only 402/quota re-throws as `CRITICAL_STOP` to abort the batch. There is no failure
  row in history, so a short run count means errors, not fewer tasks.
- **Cancel is cooperative.** `cancelBenchmarkRef` is checked at task start and chunk boundaries only;
  in-flight fetches are not aborted, still bill, and still call `setResults`.
- **Concurrency is fixed batching, not a rolling pool** — `Promise.all` over slices of 5, so each batch
  waits for its slowest member.
- **`metrics.latencyMs` is wall-clock** around the whole fetch (network + queueing included), even though
  the UI labels it "inference time".
- **The token-estimate fallback is buggy**: `estimateTokens(task.prompt.content + task.receipt.base64.length / 4)`
  concatenates a number onto a string, so the image contributes ~4 chars. It only runs when the API
  omits `usage`.
- **`ReferenceArea` `fill` fails typecheck** in `Compare.tsx` and `CostAccuracyMatrix.tsx` under Recharts 3
  (2 errors from `npx tsc --noEmit`). Works at runtime; Vite does not typecheck.
