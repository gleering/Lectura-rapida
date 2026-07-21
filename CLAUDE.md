# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build (Next.js standalone)
npm run lint         # ESLint
npm test             # vitest run (29 tests in __tests__/)
npx tsc --noEmit     # Type-check without emitting
```

Before finishing any task: run `npx tsc --noEmit`, `npm run build`, and `npm test` — all three must pass.

## Deploy

Production: https://readflow.gleering.com.ar
VPS: `root@217.216.84.44` — systemd timer pulls from `main` every 2 min and rebuilds.
Immediate deploy: `ssh root@217.216.84.44 systemctl start readflow-autodeploy.service`
A `git push origin main` is all that's needed; the VPS picks it up automatically.

## Architecture

**Next.js 15 App Router** (`output: "standalone"` Docker). All pages under `app/`. Client components use `"use client"`. API routes under `app/api/` (Gemini AI, Supabase).

**State:** Zustand stores in `store/` (`useSettingsStore`, `useToastStore`). Reader preferences persist to localStorage via Zustand middleware.

**Persistence:**
- Primary: IndexedDB via `idb` — books, word arrays, progress, stats.
- Auth + cloud sync: Supabase (`lib/supabase.ts` / `lib/serverSupabase.ts`).

**Core reading pipeline:**
1. PDF parsed in a Web Worker (`lib/pdfWorker*`) → word array stored in IndexedDB.
2. `app/reader/[id]/page.tsx` loads book → `components/Reader/ReaderScreen.tsx` orchestrates RSVP.
3. `components/Reader/WordDisplay.tsx` renders one chunk; auto-fits font via canvas `measureText` so words never overflow. ORP (Optimal Recognition Point) pivot letter always stays centered via `min-w-0 flex-1` flex halves.
4. `components/Reader/Controls.tsx` houses playback controls.

**RSVP display (`WordDisplay.tsx`):**
- `splitAtOrp` (`lib/orp.ts`) picks the pivot letter index.
- `bionicSplit` (`lib/bionic.ts`) bolds word heads for multi-word chunks.
- Canvas measurement shrinks `fontPx` so `pw/2 + max(bw,aw) ≤ (viewport−40)/2`. Floor: 16px.
- Vertical position uses `cqh` units (container query height) — the reading stage has `container-type: size` (`.reader-canvas` in `globals.css`).

**PWA / Service Worker:**
- `public/sw.js` — cache `"readflow-v{N}"`. Network-first for navigations; cache-first only for `/_next/static/` (content-hashed, safe to cache forever). Bump `CACHE` constant on any SW logic change.
- `next.config.mjs` sets `no-cache` on `/sw.js` so browsers always revalidate.
- `components/ServiceWorkerRegister.tsx` auto-reloads the page when a new SW takes control (skips first-install to avoid extra reload). Checks for updates on load, tab-focus, and every 30 min.

**Design system:** CSS variables for Focus Blue palette (`--color-focus-*`), fonts via `next/font` (`font-display` / `font-sans`), dark-mode-first with `light` class override. No raw hex values — use tokens.

## Key types (`types/index.ts`)

```ts
ReaderMode: 1 | 2 | 3          // words per flash
ReadingMethod: "rsvp" | "pacer" | "page"
ReaderSettings                  // fontSize(64), letterSpacing(0), verticalPosition(45), orpColor("#ef4444")
BookMeta / BookContent          // metadata vs word arrays
ReviewCard                      // SM-2 spaced repetition
```

## Constraints

- **No feature without user justification.** Don't add extras beyond what's asked.
- **Responsive + accessible** are requirements, not extras (mobile-first, contrast, keyboard nav).
- **PWA auto-update must never break.** Any SW/cache/asset change must preserve the pattern: users get new builds automatically on next open with zero manual action.
- **Commit only when asked.** Run validations first; offer to commit but wait for explicit approval.
