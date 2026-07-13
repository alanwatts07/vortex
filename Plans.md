# Vortex — Plans

A location-based **presence** app. Flip your light on to become a colored dot on
a radar — a quiet signal that you're open to connect **right here, right now**.
The color is your **aura** (a chakra read on your current mood). You find each
other **in person, by color** — no pinging, no texting, no profiles, no accounts.

> "So… are you purple?" — the color *is* the introduction.

---

## Core principles (don't break these)

- **No logins, no profiles.** Anonymous, ephemeral. A throwaway per-session ID
  is fine (needed to tell dots apart / route a future "wave"); a persistent
  account is not.
- **Presence is ephemeral.** When you go dark or leave, you're gone. No history,
  no "who was here" log. (Supabase Realtime Presence is in-memory — this is free.)
- **Location only while your light is on.** Never in the background, never stored.
- **The app ends at the introduction.** It tells you who's here and open; the
  actual meeting happens face to face. Resist adding in-app chat — it kills the
  thesis.
- **Local storage only** for small device prefs (aura, seen-intro).

---

## Status — done

- [x] Radar UI (canvas: sweep, rings, blips flare on pass, your center dot)
- [x] Single on/off switch, tinted to your aura
- [x] Geolocation via `watchPosition` while on
- [x] Real-time presence over Supabase (in-memory, no DB) — *needs keys to activate*
- [x] Demo mode fallback (simulated colored dots) when unconfigured
- [x] Aura onboarding — 3-tap mood quiz → chakra color, saved to local storage
- [x] Colored dots by chakra (yours + everyone else's)
- [x] Radius ~200 ft (61 m)
- [x] Old-iOS Safari fallback sweep (no `createConicGradient`)
- [x] Intro splash (what / why / find-by-color), reopenable via "?"
- [x] Deployed to Vercel: https://greenlight-five-mu.vercel.app

---

## Next: make the "test together" real

- [ ] Create free Supabase project → add `NEXT_PUBLIC_SUPABASE_URL` +
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel env → redeploy. Then two phones
      within 200 ft see each other's real auras.
- [ ] Sanity-check GPS jitter at 200 ft (consumer GPS is ±10–30 m — may need to
      show a soft "distance ring" rather than pretending pixel-precision).

## Next: safety & trust (before any public use)

- [ ] **Location jitter** — snap/blur precise coords so the dot means "around
      here," not "exactly here."
- [ ] **In-session block** — hide a dot you don't want to see; no account needed.
- [ ] **Report** — lightweight abuse signal + server-side rate limiting.
- [ ] **Rate-limit presence writes** — stop coordinate spam / spoof floods.
- [ ] Clear consent copy on first location prompt (partly covered by splash).

## Basic UI / UX polish

- [ ] **Aura legend** — tiny key mapping the 7 colors → moods (helps "are you
      purple?" land). Toggle or long-press.
- [ ] **Distance + bearing hint** on a dot ("~40 ft, north") to guide walking.
- [ ] **Empty state** when you're the only one on ("You're the only light here —
      invite someone").
- [ ] **Onboarding micro-animation** — aura reveal could pulse/breathe.
- [ ] **Retune affordance** — already in header; consider a mood re-check nudge
      after N minutes.
- [ ] **PWA install** — manifest + icons so it feels like an app on the home
      screen (still just a URL, no store).
- [ ] **Haptics** on flip-on / when a new dot appears (mobile web `navigator.vibrate`).
- [ ] Accessibility pass — the radar is `aria-hidden`; add a text summary of
      nearby count/colors for screen readers.

## Identity (done + ideas)

- [x] **Pick, don't quiz.** Direct color + shape picker instead of mood
      questions — self-expression, not interrogation (avoids the "datey" vibe).
- [x] **Color × shape identity** — "are you the purple triangle?" More distinct
      identities, still easy to name out loud for IRL recognition.
- [ ] Consider a few extra flourishes (pulse rate, trail) as *unlockables* tied
      to the gamification below — cosmetic only, never pay-to-win.

## Gamification — "Pac-Man" energy (brainstorm)

Concept: the more real connections you make, the more **energy** you gain —
your dot grows / glows brighter / gains a trail or halo. Light gameplay that
*rewards actually meeting people* without turning into a points-grind or
impeding the core "quiet presence" map.

Ideas for how it could feel:
- **Energy = meetups, not screen time.** You only gain when two dots confirm a
  real meet (mutual "we met" tap, or being co-located + both waving). This keeps
  it honest — you can't farm it by sitting on the app.
- **Dot grows / brightens / gains a halo or orbiting sparks** with energy.
- **Energy decays over time** so it reflects *recent* social presence, not a
  lifetime high score — nudges you to keep going out.
- **Aura deepens/saturates** with connections (subtle, not a level number).
- Keep it **ambient and personal** — no public leaderboards (that reintroduces
  status/profile dynamics we're avoiding). Maybe only *you* see your energy.

The local-storage tension (raised by the team):
- Pure local storage means energy is **per-device and wipeable** — clearing the
  browser or switching phones loses it. Fine for a toy, weak for progression.
- Ways to keep the no-login ethos *and* some persistence:
  - **Accept ephemerality as a feature** — energy is a "current charge" that
    naturally fades; losing it on wipe is consistent with the whole app.
  - **Anonymous device key** — a random ID in local storage backs a tiny
    server-side record of energy. No login, no profile, but survives refresh.
    Lost if storage is cleared (acceptable, recoverable-by-nobody = private).
  - **Optional "claim your vortex"** — a one-tap passkey/anonymous cloud sync
    *only if* a user wants cross-device continuity. Off by default.
  - **Session-scoped only** — energy lives for one outing and resets; leans hard
    into "be here now."
- Decision needed later: is progression **persistent** (needs a key) or
  **ephemeral** (pure local / session)? Ephemeral is most on-brand; persistent
  is stickier. Could ship ephemeral first, add optional sync later.

### Recommended cut: "charge, not score"

The cleanest version that respects every other principle:

- Energy is a **charge**, not a score — a glow you build by *meeting people* and
  that **quietly fades** when you don't. No number, no total, no rank.
- **Visible mostly to you.** Your own dot brightens / grows a halo / gains a
  soft orbit as you charge up. Others might sense it faintly (a warmer glow) but
  there's nothing to compare or compete over.
- **Gamifies the right verb** — going out and actually connecting — without
  creating a leaderboard or a profile-like status people chase.
- **Pac-Man feel** = you move through the world collecting real encounters, and
  that literally lights you up; go quiet and the charge dims. The "power" is
  presence + connection, not points.
- **Survives pure-ephemeral local storage.** Since a charge naturally fades,
  losing it on a browser wipe or new device is *consistent* with the app's
  "be here now" ethos — not a broken save file. So we can ship this with no
  backend and no login, and only add optional anonymous sync later if wanted.

Suggested first prototype: purely visual + local — your dot gains glow/size from
a local "charge" value that ticks up on a (mocked, later real) meet event and
decays over time. No server, no account. Validate the *feel* before any
persistence decision.

## Bigger ideas (parking lot)

- [ ] **The "wave"** — tap a dot to send an anonymous, ephemeral ping; if they
      wave back, both dots brighten/beacon so you can find each other. Still no
      text — just mutual signal. (Keeps the "meet in person" rule.)
- [ ] **Color-match nudges** — subtly highlight compatible/complementary auras.
- [ ] **Ephemeral rooms / events** — a shared vortex scoped to a venue, festival,
      campus, or a QR code, instead of pure GPS radius.
- [ ] **"Beacon" mode** — briefly broadcast a stronger pulse so a specific person
      can spot you in a crowd.
- [ ] **Range control** — let users widen/narrow the radar (party vs plaza).
- [ ] **Aura history for yourself only** — private mood diary, never shared.
- [ ] **Native wrapper (Expo)** — reuse the UI, add background presence +
      geofencing *only if* the foreground model proves too limiting.

## Tech debt / hardening

- [ ] Rename repo/package from `greenlight` → `vortex` (cosmetic; deploy alias
      still works).
- [ ] Presence reconnect handling (dropped socket, tab sleep/wake).
- [ ] Error boundary around the radar canvas.
- [ ] Basic analytics that respect the no-tracking ethos (aggregate counts only).
