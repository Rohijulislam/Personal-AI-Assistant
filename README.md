<div align="center">

<img src="public/readme/banner.svg" alt="My Assistant banner" width="100%" />

# My Assistant

**A personal, multi-provider AI toolkit for everyday writing and dev workflows.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=0a0a0a)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![Groq](https://img.shields.io/badge/Groq-LLM-F55036?logo=groq&logoColor=white)](https://groq.com)

</div>

---

## What is this?

**My Assistant** is a single-user productivity dashboard that wraps several everyday AI tasks — turning raw notes into a daily status update, rewriting rough prompts, refining tone, and generating structured dev tasks — behind one clean, keyboard-friendly UI. It also includes a **Command Center** that acts as an intelligent orchestrator (describe any task, it figures out which tool to use) and a **Chat** page for open-ended, multi-turn conversations. The whole thing is designed to feel like a focused internal tool, not a generic chatbot: pick a card, paste your text, get a formatted result, copy it, move on.

It talks to **two AI providers** (Google Gemini and Groq) with an automatic primary/backup fallback, so a rate limit or outage on one provider doesn't stop your work.

## ✨ Features

| Tool                      | What it does                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| 📊 **Dashboard**          | At-a-glance usage stats and quick links into every tool                                               |
| 🧠 **Command Center**     | Intelligent orchestrator — describe any task and it routes to the right specialist tool automatically |
| 💬 **Chat**               | General-purpose AI conversation — no routing, no templates, just a direct multi-turn chat             |
| 📋 **Daily Status**       | Converts raw standup notes into your exact reporting format                                           |
| ✨ **Prompt Rewriter**    | Turns a rough prompt into a clearer, more effective one                                               |
| ✎ **Text Refiner**        | Rewrites messages in a selectable tone (formal, casual, concise…)                                     |
| ☑ **Task Generator**      | Turns a loose idea into structured, actionable dev tasks                                              |
| ⌘ **Command Library**     | Saved shell commands, shortcuts, and snippets, searchable in one place                                |
| 🔖 **Saved Instructions** | Reusable system prompts/instructions per workflow                                                     |
| ↺ **History**             | Every generation you've made, with the ability to revisit or copy it again                            |
| ⚙️ **Settings**           | Choose your primary and backup AI provider/model                                                      |

### Command Center vs Chat

Both are AI-powered chat interfaces, but they serve different purposes:

- **Command Center** — goal-oriented. Describe a task (format my standup, rewrite this prompt, create a ticket) and an orchestrator automatically routes it to the right specialist tool, each with its own tuned system prompt and temperature.
- **Chat** — conversation-oriented. A direct, persistent multi-turn conversation with no routing or templates. Best for questions, brainstorming, explaining concepts, or anything that doesn't fit a structured workflow.

Other niceties: a `⌘K` command palette for jumping between tools, one-click copy on every result, a mobile nav drawer, and per-tool usage charts on the dashboard.

<p align="center">
  <img src="public/readme/dashboard.png" alt="Dashboard screenshot" width="90%" />
</p>

## 🧠 AI Providers

Every model below is verified with a real API request (`npm run test:live`), not
just configured. Latencies are measured medians for a short completion.

| Provider          | Model                   | ~Latency | $/1M in · out | Role                      |
| ----------------- | ----------------------- | -------- | ------------- | ------------------------- |
| **Groq**          | `qwen/qwen3.8-27b`      | 0.14s    | 0.80 · 4.00   | Fastest (preview tier)    |
| **Groq**          | `openai/gpt-oss-20b`    | 0.6s     | 0.10 · 0.50   | Fast + cheap              |
| **Groq**          | `openai/gpt-oss-120b`   | 0.7s     | 0.15 · 0.60   | Default backup            |
| **Google Gemini** | `gemini-3.5-flash-lite` | 1.1s     | 0.30 · 2.50   | Current-gen lite          |
| **Google Gemini** | `gemini-2.5-flash`      | 1.2s     | 0.30 · 2.50   | Default primary           |
| **Google Gemini** | `gemini-3.1-flash-lite` | 1.8s     | 0.25 · 1.50   | Cheapest Gemini           |
| **Google Gemini** | `gemma-4-26b-a4b-it`    | 2.3s     | **free**      | Zero-cost, own quota pool |

`gemma-4-26b-a4b-it` has no paid tier at all — it is free of charge on the
Gemini API, and it draws on its own quota, so it keeps working after the
Gemini Flash daily cap is spent.

`qwen/qwen3.8-27b` sits on Groq's preview tier ("evaluation only, may be
discontinued at short notice"), so it is labelled as preview in Settings and
is never a default. It is actively maintained — Groq lists it as the successor
to qwen3.6-27b — and `npm run audit:models` will flag it if that changes.

Set a primary provider/model and an optional backup in **Settings** — if the
primary call fails, the app automatically retries on the backup.

> **Free-tier note:** `gemini-2.5-flash` allows only **20 requests/day** on the
> Gemini free tier. Past that it returns 429 and the app falls back to Groq.
> The Groq models have no such daily cap, so make `openai/gpt-oss-120b` your
> primary in Settings if you hit the limit often.

### Maintaining the model list

Provider model ranges change often, and models disappear without the app
noticing — a model can still be listed by the provider's API yet return 404 on
an actual request. These scripts are how the set is kept honest:

```bash
npm run audit:models       # do the configured models still exist for our keys?
npm run probe:models       # discover every model the keys serve, and probe each
npm run probe:reliability  # sample each model N times for pass rate + latency
npm run probe:quality      # compare real rewrite output across candidates
```

### Tests

```bash
npm test         # offline: callback contract, fallback, cancellation, timeouts
npm run test:live  # live: every model, end to end (needs both API keys)
```

`npm run test:live` checks each model for authentication, request, response
parsing, streaming and non-streaming, timeouts, cancellation, error
classification and the callback contract. A model is not considered supported
until it passes.

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, [Framer Motion](https://www.framer.com/motion/) for animation
- **UI primitives:** Radix UI (dialog, switch), [cmdk](https://cmdk.paco.me/) for the command palette, [lucide-react](https://lucide.dev/) icons
- **AI SDKs:** `@google/genai`, `groq-sdk`

## 🚀 Getting Started

**1. Clone and install**

```bash
git clone <your-repo-url>
cd assistant
npm install
```

**2. Add your API keys**

Create a `.env.local` file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

- Get a free Gemini key from [Google AI Studio](https://aistudio.google.com/apikey)
- Get a free Groq key from [console.groq.com](https://console.groq.com/keys)

**3. Run it**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — that's it.

## ☁️ Deploy for free (access it from anywhere)

This app deploys to [Vercel](https://vercel.com) in a couple of clicks — free tier, automatic HTTPS, and a public URL you can open from your phone or any device:

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add `GEMINI_API_KEY` and `GROQ_API_KEY` as environment variables in the project settings.
4. Deploy — Vercel builds and hosts it automatically on every push.

## 📁 Project Structure

```
src/
├── app/
│   ├── chat/             # Normal Chat — general-purpose multi-turn AI conversation
│   ├── command-center/   # Command Center — orchestrator that routes to specialist tools
│   ├── daily-status/
│   ├── prompt-rewriter/
│   ├── text-refiner/
│   ├── task-generator/
│   ├── command-library/
│   ├── saved-instructions/
│   ├── history/
│   ├── settings/
│   └── api/generate/     # Single shared API route for all AI calls (streaming + non-streaming)
├── components/
│   ├── layout/           # Sidebar, mobile nav, command palette, page shell
│   ├── tools/            # Cards, panels, charts used across tool pages
│   └── ui/               # Buttons, badges, textarea, skeletons — shared primitives
├── lib/
│   ├── ai/               # Provider clients (Gemini, Groq), model config, generation logic
│   └── hooks/            # Local-storage-backed hooks for history, library, settings
└── types/                # Shared TypeScript types
```

## 🔒 Privacy

Everything you save (commands, instructions, history) stays in your browser's local storage — nothing is sent anywhere except the AI provider you choose, and only the text you submit for generation. Your API keys live in environment variables and are never exposed to the browser.

---

<div align="center">
<sub>Built as a personal productivity tool — not a ChatGPT clone.</sub>
</div>
