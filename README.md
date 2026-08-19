# Water Tracker

A simple, fast, mobile-first PWA for tracking daily water intake. 100% client-side — no backend, no accounts, no external APIs. All data lives in the browser's `localStorage`.

## Stack

- Next.js 16 (App Router) + TypeScript
- React 19
- Tailwind CSS v4
- lucide-react icons
- Hand-rolled service worker for offline support (no third-party PWA plugin)

## Project structure

```
app/            routes (/, /stats, /history, /settings), manifest, icons, layout
components/     UI components (presentational + a few client widgets)
hooks/          useWaterData (entries/settings state + persistence), useToast
lib/            calculations.ts, date.ts, storage.ts, constants.ts — all business logic
types/          shared TypeScript types
public/sw.js    service worker (offline caching)
```

Business logic (progress %, streaks, weekly averages, day grouping, etc.) lives entirely in `lib/calculations.ts` as pure, unit-testable functions — components only call them.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run lint
npm run build
npm run start
```

The service worker only registers in production builds (`npm run start` or a deployed build), so use `npm run build && npm run start` to test offline behavior locally.

## Deploy to Vercel

1. Push this repository to GitHub (or your Git provider of choice).
2. Go to https://vercel.com/new and import the repository.
3. Vercel auto-detects Next.js — no environment variables or extra config are required.
4. Deploy. That's it — the app is fully static/client-side with no backend to configure.

Or via the CLI:

```bash
npm install -g vercel
vercel
```

## Notes

- Data (water entries + settings) is stored in `localStorage` under versioned keys and is validated/sanitized on load, so corrupted or missing data never crashes the app.
- "Today" is always computed from the device's local calendar date (never UTC), so day boundaries are correct regardless of timezone.
- Streaks count a day as "met" once its total reaches the daily goal; today never breaks an existing streak before the day is over.
