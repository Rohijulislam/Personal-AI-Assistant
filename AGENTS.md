<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# My Assistant — Agent Guide

Personal, multi-provider AI productivity dashboard (Next.js 16 App Router, React 19, TypeScript). Product scope, features, and setup live in [README.md](README.md). Target design system: [UI_VISION.md](UI_VISION.md). Original one-paragraph brief: [projects.md](projects.md).

## AI layer — read the source, not this file

`src/lib/ai/` is the single source of truth for how generation works, and it's documented in place, not here:

- `generate.ts` — the orchestrator: plans primary/backup attempts, retries transient errors once on the same model, falls back to the backup provider, returns a `GenerateResult` or throws an `AIError`.
- `errors.ts` — the one error type every provider adapter must translate into (`AIError`, with a stable `code`). Read `codeForStatus` before adding a new provider adapter.
- `callbacks.ts` — the callback contract (`CallbackGate`) every caller can rely on: exactly one of `onSuccess`/`onError`/`onCancel`, then `onSettled`, nothing after cancellation. Read the block comment at the top before touching streaming or cancellation.
- `providers/gemini.ts`, `providers/groq.ts` — thin adapters: produce text or throw `AIError`. Timeouts, retries, fallback, and callbacks are deliberately handled above them, so behavior can't drift between providers.

Don't add retry/fallback/timeout logic inside a provider adapter — it belongs in `generate.ts` / `callbacks.ts` so every provider gets it for free.

## Adding or changing an AI tool page

Each tool (`daily-status`, `prompt-rewriter`, `text-refiner`, `task-generator`, `chat`, `command-center`) owns its system prompt and temperature inline in its own `src/app/<tool>/page.tsx`. There is no centralized prompt registry — follow that pattern for a new tool rather than extracting one.

Command Center (`src/app/command-center/page.tsx`) is a second layer on top of this: an orchestrator call (its own system prompt, temperature 0.2) decides which tool to route to, then a second `generate` call runs that tool's own prompt. If a new tool should be reachable from Command Center, update its orchestrator prompt and `ToolName` union too — a working standalone tool page is not enough to make it routable.

## Persistence: localStorage only, hydration-flag pattern

There is no backend database. Everything a user saves (saved instructions, command library, daily-status log, generation history, model settings) lives in the browser via hooks in `src/lib/hooks/`, all following the same shape — see `useSavedInstructions.ts` as the reference:

1. `useState` starts empty (SSR-safe).
2. One `useEffect` on mount loads from `localStorage` and sets a `hydrated` flag.
3. A second `useEffect`, gated on `hydrated`, persists on every change.

The `hydrated` gate matters: persisting before hydration completes would overwrite real saved data with the initial empty state. Reuse this shape for any new persisted hook.

## Testing

`npm test` is offline (mocked providers) and safe to run anytime. `npm run test:live` and the `probe:*` / `audit:models` scripts make real, metered calls to Gemini and Groq — confirm with the user before running them, and only when both API keys are set in `.env.local`.

Provider APIs can list a model that then 404s on an actual request. Don't trust a model id from memory or from README.md's table as still-working; `npm run audit:models` is the ground truth for what currently works with the configured keys.

## Design system

UI work should move toward the token system and dark-mode strategy specified in [UI_VISION.md](UI_VISION.md) rather than add more ad hoc Tailwind color literals — that file documents both the current state and the specific target to implement toward.
