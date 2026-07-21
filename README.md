# Finding Us 🌀

A location-based **presence** app. Flip your light on to become a colored dot on
a radar — a quiet signal that you're open to connect **right here, right now**.
The color is your **aura** — chosen from a drifting field of colors. You find
each other **in person, by color** — *"are you the teal one?"*

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

- **Intro splash** (`src/components/IntroSplash.tsx`) — the manifesto: turn your
  light on, look up, lock eyes.
- **Color picker** (`src/components/AuraField.tsx`) — a drifting field of glowing
  color orbs; tap the one you're drawn to. 30 colors plus the **void** (a black
  core with a white halo). Colors are **unique per live person**.
- **Eye radar** (`src/components/Radar.tsx`) — the radar rendered as a glowing
  eye: your light is the pupil, the sweep scans, other lights are colored dots.
  It opens when your light is on, blinks, and supports **pinch-to-zoom** for
  precise selection.
- **The light switch** (`src/components/LightSwitch.tsx`) — the one control,
  tinted to your color.
- **Real-time presence** (`src/hooks/usePresence.ts`, `src/lib/geo.ts`) — over
  Supabase broadcast: your live GPS + color are announced to everyone nearby and
  projected onto the radar. Listens even while your light is off (to know which
  colors are already taken).
- **The connection ritual** (`src/components/LockPrompt.tsx`) — reach out → they
  reach back → both **hold to confirm** you locked eyes → "you found each other"
  → you both drop off each other's radar (one chance; no re-pinging or stalking).
- **Sounds** (`src/lib/sound.ts`) — a soft sonar blip for new lights, a chime
  when someone reaches out.
- **Color palette** (`src/lib/aura.ts`) — the 30-color spectrum + the void.

Without Supabase env vars the app runs in **demo mode** (simulated colored dots).

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
