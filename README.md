# vortex 🌀

A location-based **presence** app. Flip your light on to become a colored dot on
a radar — a quiet signal that you're open to connect **right here, right now**.
The color is your **aura**; the shape is yours to pick. You find each other
**in person, by color** — *"are you the purple triangle?"*

**Not a dating app. Not a profile app.** No bios, no swiping, no in-app chat, no
accounts. Just presence, and then you actually meet.

🔗 **Live:** https://greenlight-five-mu.vercel.app
📋 **Roadmap & ideas:** [Plans.md](./Plans.md)

---

## The idea

The whole product is one gesture: a switch. When it's on, you appear on the
radar of nearby people who are also open. When it's off, you vanish. Presence is
the entire value — it lowers the barrier to genuine, in-the-moment connection
without asking anyone to perform a profile.

The twist: the app **ends at the introduction**. The radar tells you who's here,
open, and what color they are — you walk over and recognize each other by color.
No pinging, no texting, no thread to hide behind. The color *is* the intro.

## Core principles

- **No logins, no profiles** — anonymous and ephemeral (a throwaway per-session
  ID is fine; a persistent account is not).
- **Presence is ephemeral** — go dark or leave and you're gone. No history.
- **Location only while your light is on** — never in the background, never stored.
- **The app ends at the introduction** — the meeting happens face to face.
- **Local storage only** for small device prefs (your aura, shape, seen-intro).

## What's built

- **Intro splash** (`src/components/IntroSplash.tsx`) — first-run explainer:
  what it is, why, and how you find each other by color.
- **Aura picker** (`src/components/AuraPicker.tsx`) — pick a **color** (one of 7
  chakra hues) and a **shape** (circle, ring, triangle, diamond, square, star).
  No quiz, no questions — just choose how you show up. Saved to local storage.
- **Radar** (`src/components/Radar.tsx`) — canvas radar with range rings, a
  rotating sweep, and blips that flare in their own aura color + shape as the
  beam passes. You sit at the glowing center. Includes an old-iOS Safari
  fallback sweep.
- **The switch** (`src/components/VortexSwitch.tsx`) — the one control, tinted
  to your aura.
- **Real presence** (`src/hooks/usePresence.ts`, `src/lib/geo.ts`) — when a
  Supabase project is configured, your live GPS is broadcast over Supabase
  Realtime Presence and everyone within **~200 ft** is projected onto your radar
  (north = up), colored + shaped by their chosen aura. No database, no auth —
  just the anon key.
- **Identity model** (`src/lib/chakra.ts`) — the 7 chakra colors + dot shapes.

Without Supabase env vars the app runs in **demo mode** (simulated colored/shaped
dots) so it still feels alive locally.

## Tech

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript · Supabase
Realtime (presence only) · deployed on Vercel.

## Run it (demo mode)

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Turn on real presence (~2 min, free, no server code)

1. Create a free project at <https://supabase.com> (no database setup needed).
2. **Settings → API** → copy the **Project URL** and the **anon / public** key.
3. Copy the env template and paste them in:
   ```bash
   cp .env.local.example .env.local
   # edit .env.local with your URL + anon key
   ```
4. `npm run dev` — the amber "demo mode" badge disappears. Realtime Presence is
   on by default for new Supabase projects, so nothing else to configure.

To ship it, add the same two vars to your Vercel project
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and deploy. Then
two phones within ~200 ft, lights on, see each other's real auras. (HTTPS is
required for geolocation — Vercel provides it automatically.)

## What's next

See [Plans.md](./Plans.md) for the full roadmap — production hardening (location
jitter, in-session block/report), UI polish (aura legend, distance/bearing
find-hint), and bigger ideas including the "charge, not score" Pac-Man-style
energy concept and the mutual-signal "wave."
