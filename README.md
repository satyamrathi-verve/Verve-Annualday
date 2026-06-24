# Operation Getaway — opening funnel

The opening **front-end funnel** for Verve Advisory's anniversary event, *Operation Getaway*
(an AI Build Sprint wrapped in an adventure/ARG). This slice covers the first five screens a
recruit sees, ending at the live **"Guess Your Crew"** team-assembly wheel.

> **Scope guard.** This repo is **only** the opening funnel — Landing → Vibe check →
> Sign-in → Briefing → Guess Your Crew. Everything from Stage 2 onward (individual/pair/team
> build mechanics, the 8 apps, etc.) is intentionally out of scope.

## The five screens

1. **Landing** — arrival after the real-world courier drop; sets the adventure tone.
2. **Vibe check** — tap-to-answer mood gate (no typing, not security).
3. **Sign-in** — mocked (pick-your-name). Architected to swap in real Google OAuth later.
4. **Briefing** — a "Captain Wanderlust" mission-hook with a placeholder for a host video.
5. **Guess Your Crew** — a **live, shared wheel**: match each teammate's personal-characteristics
   clue to the right colleague; every correct call lights a canister on the team's wheel, in
   real time, for everyone. Managers get a **God-Mode** override so an absent/stuck member never
   blocks the wheel.

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Supabase (realtime) · zod.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional for local dev (see below)
npm run dev                  # http://localhost:3000
```

**Without Supabase creds**, the app runs on a local **mock** realtime backend that syncs across
tabs of the same browser via `BroadcastChannel` — enough to demo the live wheel locally:

> Open the app in **two browser tabs**, sign in as two different people **on the same team**
> (e.g. *Aria Menon* and *Dev Iyer*, both Team Aurora), reach Guess Your Crew, and watch a
> correct guess in one tab light a canister in the other. Sign in as a **manager** (Aria Menon
> or Lina Fernandes) to see the God-Mode panel.

## Enabling real (cross-device) realtime — Supabase

1. Create a free project at [supabase.com](https://supabase.com) → **New project** (pick a region
   near your users).
2. **SQL Editor** → paste and run [`supabase/migrations/0001_canister_state.sql`](supabase/migrations/0001_canister_state.sql).
3. **Project Settings → API** → copy the **Project URL** and **anon public** key into `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

   (The anon key is safe in the browser; **never** commit the `service_role` key.)
4. Restart `npm run dev`. The wheel now syncs across devices. The Guess screen shows **● LIVE**
   when Supabase is active (vs **○ local demo** for the mock).

## Configuration — no people are hard-coded

All roster, teams, clues, and on-screen copy live in [`config/`](config/) and are validated with
zod at load ([`lib/data/schema.ts`](lib/data/schema.ts)). Drop in real (synthetic!) data by editing:

- [`config/event.json`](config/event.json) — all screen copy + the vibe questions.
- [`config/roster.json`](config/roster.json) — people, their daily group, team, manager flag, and clues.
- [`config/teams.json`](config/teams.json) — teams and their canister order.

> **Use synthetic/sample data only.** This is a prototype — no real PII, ever.

## Architecture — built so it grows without a rewrite

Every screen talks to **swappable backends** via hooks, never to a concrete implementation:

| Concern  | Today (this build)                        | Phase 2 swap (no UI change)                                    |
| -------- | ----------------------------------------- | ------------------------------------------------------------- |
| Auth     | `MockAuthBackend` (pick-your-name)        | Google OAuth → `lib/auth/`, set `NEXT_PUBLIC_AUTH_MODE=google` |
| Realtime | `SupabaseRealtimeBackend` / mock fallback | self-hosted WS / Pusher / Ably → new `RealtimeBackend`        |
| Data     | `config/*.json` (synthetic)               | Postgres-backed roster/teams                                  |

- Auth: [`lib/auth/`](lib/auth/) (interface, mock, factory) + [`components/providers/AuthContext.tsx`](components/providers/AuthContext.tsx).
- Realtime: [`lib/realtime/`](lib/realtime/) (interface, Supabase + mock backends, `useTeamWheel`).
- Supabase is used **only** for realtime wheel state — identity still comes from the mock sign-in.

## Deploying to your own domain (not Vercel)

The live wheel needs a long-running Node server (a static export can't hold websockets), so:

```bash
npm run build
npm run start        # serves on PORT (default 3000)
```

Run `npm run start` behind **Nginx or Caddy** on your VPS, terminate TLS for your domain
(Let's Encrypt), and point the domain at it. Set the same `NEXT_PUBLIC_SUPABASE_*` env vars in
production. (A `Dockerfile` + reverse-proxy config can be added when you're ready to ship.)

## Scripts

| Command         | What it does                 |
| --------------- | ---------------------------- |
| `npm run dev`   | Dev server (Turbopack)       |
| `npm run build` | Production build + typecheck |
| `npm run start` | Serve the production build   |
| `npm run lint`  | ESLint                       |
