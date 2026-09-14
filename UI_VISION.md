# UI Vision — Personal AI Assistant

## Context

`projects.md` defines the product: a personal productivity tool that stores instructions, prompts, commands, and workflows, with tools for Daily Status, Prompt Rewriter, Text Refiner, Task Generator, Command Library, Saved Instructions, Search/Favorites, History, and a Dashboard. The explicit UX brief is: *"feel like a personal productivity tool, not a ChatGPT clone"* — speed, simplicity, copy-to-clipboard, keyboard shortcuts, clean navigation, minimal clicks.

**Current state (as implemented today):**
- Tailwind v4, CSS-first config (`globals.css`), no design tokens — colors are inline literals (`violet-600`, `rose-600`, `emerald`, `amber`, `zinc` neutrals) repeated per component instead of themed.
- Dark mode follows OS preference only; no manual toggle, no persisted choice.
- Fixed dark sidebar (`w-60`) + single-column content via `PageShell`; dashboard content is capped at `max-w-4xl`, wasting space on wide screens.
- Components (`Button`, `Card`, `Badge`, `Textarea`, `CopyButton`, `InstructionCard`) are internally consistent but ad hoc — no shared token system behind them.
- One hand-rolled modal (`InstructionFormModal`) with manual focus/escape handling, a hand-built toggle switch, no animation library.
- No loading/skeleton states beyond one inline spinner SVG in `Button`. No toast/notification system. No empty-state or error-state components.
- No charts or data visualization anywhere, despite a Dashboard and History view that are natural fits for them.
- Icons via `lucide-react`, conditional classes via `clsx` — both fine, keep using them.

This document is the target to redesign toward. It should read as **specific enough to implement directly**, not aspirational copy.

## Design Principles

1. **Fast tool, not a chatbot.** Every screen should feel like a keyboard-driven utility (think Raycast, Linear, Superhuman) — dense but breathable, never a marketing page pretending to be an app.
2. **One system, not per-page decisions.** Every color, spacing value, radius, and shadow comes from a token, never a literal Tailwind class chosen ad hoc.
3. **Quiet by default, confident at the moment of action.** Muted neutrals for structure; a single vibrant accent reserved for primary actions, active states, and AI-generated output — so the eye always knows what matters.

## Design System

### Color tokens
Define in `globals.css` under `@theme inline` (Tailwind v4 CSS-first config):
- `--color-surface` / `--color-surface-raised` / `--color-surface-sunken` — layered neutrals (replace bare `zinc-*` literals) for background, cards, and inset areas (code blocks, saved-instruction previews).
- `--color-border`, `--color-border-subtle` — two border weights instead of one repeated `border-zinc-800`.
- `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`.
- `--color-accent` (keep violet — it's already the product's identity — but formalize it as a token with `-hover`/`-active`/`-subtle` variants) for primary actions and active nav/tab state.
- Semantic tokens: `--color-success`, `--color-warning`, `--color-danger`, `--color-info` — map existing `emerald`/`amber`/`rose`/`blue` one-offs onto these instead of re-picking a shade per component.
- Full light + dark pair for every token, switched by both `prefers-color-scheme` **and** a `data-theme` attribute (see Dark Mode below).

### Typography
- Keep Geist Sans/Mono (already loaded) — it's already a good tech-forward choice, just formalize the scale: define `text-xs` through `text-2xl` usage rules (e.g., page title = `text-xl font-semibold`, card title = `text-sm font-medium`, body = `text-sm`, meta/caption = `text-xs text-muted`) so every page picks from the same 5–6 sizes instead of improvising.
- Tabular numerals (`font-variant-numeric: tabular-nums`) for any timestamps, counts, or metrics so the Dashboard and History views don't visually jitter.

### Spacing, radius, elevation
- 4px base spacing scale (Tailwind default is fine — just apply consistently: card padding always `p-5`, section gaps always `gap-6`, etc.).
- Two radii only: `rounded-lg` for controls, `rounded-xl` for cards/modals — stop the current mix of `rounded-md`/`rounded-xl`/`rounded-full` chosen per component.
- Shadow used sparingly: `shadow-sm` for resting cards, a slightly stronger shadow only on hover/focus or floating elements (modal, dropdown, toast) — never decorative.

### Iconography
`lucide-react` stays as-is (it's already consistent and appropriately understated) — just enforce one size per context (16px inline, 18px in buttons, 20px in nav) instead of ad hoc sizing.

## Layout & Navigation

- Keep the sidebar + single-column pattern — it matches the "utility tool" brief better than a topbar-heavy SaaS layout — but:
  - Add a **command palette** (`⌘K`) as the primary navigation method, backed by the existing `nav-items.ts` plus saved instructions and recent history — this is the single highest-leverage addition for the "keyboard shortcuts, minimal clicks" UX goal.
  - Make content width responsive to viewport instead of a hard `max-w-4xl` cap: use the freed space on wide screens for a secondary rail (recent history, related saved instructions) rather than leaving it empty.
  - Sidebar sections: pin **Dashboard** and **Search** to the top, group the AI tools (Daily Status, Prompt Rewriter, Text Refiner, Task Generator) under one label, and Command Library / Saved Instructions / History under another — the current flat 8-item list doesn't communicate that grouping.

## Dark Mode

Add a manual toggle (sun/moon icon in sidebar footer) that sets `data-theme="light"|"dark"` on `<html>` and persists to `localStorage`, falling back to `prefers-color-scheme` when unset — upgrading from the current OS-only behavior without breaking it for users who never touch the toggle.

## Motion

Introduce Framer Motion for the handful of places where feedback matters, not decoration everywhere:
- Modal/dropdown/command-palette: fade + slight scale-in (~150ms), replacing the current instant-appear `InstructionFormModal`.
- Toast notifications (new — currently absent) for save/copy/error confirmations, sliding in from the corner.
- List reordering (pinned instructions, favorites) animates position changes instead of snapping.
- Copy-to-clipboard buttons already have a 2-state check/copy swap — keep that pattern, just animate the icon swap instead of an instant toggle.

Everything else (page transitions, hover states) stays CSS-transition-only (`transition-colors duration-150`) — fast and cheap, no motion library overhead for things that don't need it.

## AI Feedback Patterns

Every generate action (Daily Status, Prompt Rewriter, Text Refiner, Task Generator) should show, in order:
1. **Inline loading state** — replace the single `Button` spinner with a skeleton preview of the output area so the layout doesn't jump when the result arrives.
2. **Streaming text** where the provider supports it (Gemini/Groq both do) — render tokens as they arrive rather than waiting for the full response, which reads as noticeably more "AI-trendy" and responsive.
3. **Result state** — the generated text in a card with copy button (existing pattern), plus a subtle "regenerate" action and a provider/model badge (small `Badge` showing "Gemini" or "Groq — fallback") so the modular AI-provider design in `projects.md` is visible to the user, not just internal.
4. **Error state** (currently missing) — inline, specific ("Gemini unavailable — retried with Groq" rather than a generic failure), never a silent blank.

## Data Visualization

Dashboard and History currently show no charts despite being the natural home for them:
- **Dashboard**: a small usage strip — sparkline or bar of tool-use frequency over the last 7/30 days, and a "most used" ranked list (feeds a sense of a living, learned-from tool rather than a static launcher).
- **History**: group by day with lightweight counts per tool; a simple horizontal bar breakdown by tool type.
- Keep charts minimal and monochrome-plus-accent (no chart-library default rainbow palettes) — a lightweight library (Tremor, or hand-rolled SVG sparklines) is enough; this app doesn't need heavyweight charting.

## Accessibility

- All hand-rolled interactive elements (the modal, the toggle switch in `InstructionFormModal`, dropdowns) need proper roles/`aria-*` and full keyboard operability — worth migrating to Radix primitives (`@radix-ui/react-dialog`, `@radix-ui/react-switch`, `@radix-ui/react-dropdown-menu`) under the existing visual system rather than continuing to hand-roll focus/escape handling.
- Maintain WCAG AA contrast for every token pair (especially muted text on the sunken-surface token).
- Visible focus rings on every interactive element, not just default browser outline removal.

## Responsive Behavior

- Sidebar collapses to icon-only rail below `md`, full overlay drawer below `sm` (currently no responsive behavior specified for the fixed `w-60` sidebar).
- Tool grid on Dashboard: 1 column mobile → 2 tablet → 3+ desktop (already partially done — formalize as a token-driven breakpoint rule applied consistently across Command Library and Saved Instructions grids too).

## Why this makes it "sellable"

The functional gap today isn't features — `projects.md`'s feature list is already implemented or in progress. The gap is that nothing currently *shows* the product is AI-powered, fast, or considered: no loading choreography, no visible provider-fallback story, no data about the user's own usage, no dark-mode control, no command palette. Closing those gaps is what turns "a working Next.js app" into something that reads as a polished product a user would pay for or show off, without changing scope or adding new features beyond what's already specified.
