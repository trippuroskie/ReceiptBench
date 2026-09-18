# Contributing to ReceiptBench

Thanks for your interest. ReceiptBench is a small, dependency-light project, and
the goal is to keep it that way.

## Maintenance status

ReceiptBench is **not actively maintained**. Contributions and bug reports are
welcome, but there is no promise of a response, release timeline, or ongoing
compatibility with model providers, OpenRouter, or its dependencies.

## Disclaimer

ReceiptBench is provided for local experimentation and benchmarking only. It is
not production software, and its accuracy, cost, latency, and throughput
measurements are estimates that may vary by model, provider, prompt, and input.
Review outputs before relying on them, and do not upload documents containing
sensitive information unless you understand and accept the privacy and retention
policies of the services involved. See the README's [Security](README.md#security)
section for important limitations, including client-side API key exposure.

## Setup

```bash
npm install
cp .env.example .env.local   # add your OpenRouter key
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run preview              # serve the build locally
```

You do **not** need an API key to work on UI, charts, or scoring logic. Seed the
synthetic dataset instead — paste [`scripts/seed-demo-data.js`](scripts/seed-demo-data.js)
into the browser console and reload. This is also how the README screenshots are
produced, so use it when a change affects them.

## Before you open a PR

There is no test suite or linter configured yet. Please verify manually:

- `npm run build` succeeds. (Vite does not typecheck; run `npx tsc --noEmit` separately.)
- `npx tsc --noEmit` reports no *new* errors. There are currently **2 known baseline errors** —
  `ReferenceArea` in `Compare.tsx` and `CostAccuracyMatrix.tsx` rejects the `fill` prop under
  Recharts 3's types. The prop works correctly at runtime (the shaded quadrant renders); the
  typings are simply incomplete. Fixing these properly is a welcome PR.
- The view you touched still renders with the seeded demo data, and with **empty** state (clear storage and reload — empty states are easy to break).
- If you changed scoring, note in the PR what the accuracy number was before and after on the seeded data.
- No API key, `.env.local`, or `dist/` output is included in the diff.

## Security ground rules

The API key is inlined into the client bundle by design (see the Security
section of the README), which makes a few rules non-negotiable:

- Never commit a real key. `.gitignore` covers `.env`, `.env.*`, and `dist/` — don't weaken it.
- Never add code that logs the key, or that sends it anywhere other than `openrouter.ai`.
- Don't paste real benchmark output into an issue without checking it for personal data — model output echoes the contents of whatever document you uploaded.
- If you add fixture or demo data, it must be synthetic. Use fictional business names and reserved `555-01xx` phone numbers, as `scripts/seed-demo-data.js` does.

If you find a security issue, please open a regular issue — this is a local-only
dev tool with no deployed surface, so there's no private disclosure channel.

## Conventions

[AGENTS.md](AGENTS.md) is the short reference for project structure and the
mechanics of common changes. In brief:

- **Adding a view:** new `ViewState` in `types.ts` → nav item in `Sidebar.tsx` → branch in `App.tsx`.
- **Adding a built-in model:** config in `MODEL_CONFIGS` (`constants.tsx`); by convention also add the ID to `ModelIdValues` (`types.ts`). Keep pricing current with [OpenRouter](https://openrouter.ai/models); it is stored per-token, not per-million.
- **Styling:** Tailwind utility classes via the CDN build, matching the existing slate/indigo palette. No CSS files.
- **State:** lifted into `App.tsx` and persisted there. `localStorage` for metadata, IndexedDB for images.
- Match the surrounding code's style. TypeScript, functional components, hooks.

## Especially welcome

- **A server-side proxy for the API key** — the single change that would make ReceiptBench safely deployable.
- Smarter accuracy scoring: numeric tolerance, fuzzy string matching, per-field weighting. `calculateAccuracy` is a pure function and easy to extend.
- **Recording failed runs.** Errors are currently swallowed (console only) instead of surfacing in history — see Known limitations in the README.
- **A pricing field for custom models**, so UI-added models report real cost instead of placeholder pricing.
- Aborting in-flight requests on cancel, so cancelling actually stops billing.
- Exporting results to CSV/JSON.
- Document types beyond receipts (invoices, IDs, forms) — the pipeline is generic, but the UI copy assumes receipts.
- Tests. There are none; a first suite around `utils/evaluator.ts` would be a good start.

## License

Contributions are accepted under the [MIT License](LICENSE).
