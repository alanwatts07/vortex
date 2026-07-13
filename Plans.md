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

## Strategy — the cold-start problem & event mode

**The existential risk.** A presence app is worthless until enough people are on
*in the same place at the same time*. Launch it "everywhere" and the failure
mode is brutal: everyone opens it, sees an empty radar, and leaves. Density —
not features — is what makes or breaks this. This kills more social apps than
any bug.

**The unlock: launch as *scenes*, not a global map.** A vortex scoped to a
specific place or event — a festival, a bar, a campus, a conference — joined via
a shared code or QR. Everyone there lands on the same radar. Density is
*manufactured* instead of hoped for. The open-ended global version comes later,
once the behavior is proven in a bounded crowd.

Why event mode is likely the right *first* shape (it fixes several problems at
once):
- **Solves cold-start** — a bounded, co-located crowd guarantees dots to see.
- **Fits foreground-only web** — at an event you're *there* and you open the
  app on purpose; no need for background location or a native app yet.
- **Makes safety tractable** — a scoped crowd (event attendees) is far easier to
  trust and moderate than "any stranger nearby."
- **Turns the color into real-world magic** — in a defined space, "are you the
  purple triangle?" actually resolves. That's the whole thesis, working.

**Make the color exist offline too.** The find-by-color mechanic is the genuinely
novel thing, so let it leave the screen: pins / stickers / wristbands in the 7
aura colors at an event, or a color you can flash on your lock screen. Then the
app is just the radar, and recognition happens in the physical world — exactly
the "you gotta actually meet" ethos.

### Related concerns to design around

- **GPS jitter vs. radar precision.** Consumer GPS is ±10–30 ft; a radar that
  says "40 ft north" implies accuracy we don't have. Show a *fuzzy zone /
  direction*, not a false-precise pinpoint, or it reads as broken. (Ties into
  the location-jitter safety work — same fix serves both.)
- **Foreground-only = no passive discovery** on web. You must actively hold the
  app open to appear. Fine — even ideal — for event mode; a real limitation for
  an always-on global map (which would eventually need the native wrapper).

**Bet:** event-mode is the unlock. It fixes cold-start, fits the current tech,
eases safety, and makes the color mechanic land. Global/ambient discovery is a
*later* expansion, not the launch.

### Open question — how "native" does it need to be?

The deciding question (worth thinking about early, it shapes a lot):

> **Do you need to appear on the radar *without holding the app open*, and get
> *pinged* when someone's near?**

- **No** (event-mode: you're there, you open it on purpose) → a **PWA**
  ("Add to Home Screen") is plenty — installs like an app, no store needed,
  ~an afternoon of work.
- **Yes** (always-on ambient presence) → you need a real app: **wrap the current
  web code with Capacitor** (~a few days, reuses ~everything, ships to both
  stores, unlocks background location + push), or fully rebuild in **Expo /
  React Native** (weeks) only if native presence becomes the whole point.

Short version: PWA now → Capacitor when we want store presence + notifications →
full native rebuild only if "be a dot while it's in your pocket" is core.

---

## Adoption & onboarding — ideas

### First beachhead: karaoke nights 🎤

The single best launch environment we have — a recurring event the host already
runs. It hands us, for free, everything cold-start usually costs a fortune:

- **A crowd already there, together, on their phones** — instant density.
- **A host with a mic** — can literally tell the whole room "flip your light on
  and pick your color," making everyone go live *at the same moment*. That
  synchronized flip-on is what makes the radar feel alive instead of empty.
- **It repeats weekly** — a real, recurring feedback loop with real humans. See
  what lands, tweak, run it again next week.
- **Low-stakes, social by default** — a karaoke bar is already about being a
  little brave and social, so "go find the purple triangle" fits right in.

Ways to make it land at the night:
- **QR to join the night's vortex** — on the karaoke screen between songs, on
  tables, on a flyer. One scan → you're on the radar.
- **Host-driven "everyone on!" moment** — the mic triggers the mass flip-on.
- **Color as the night's icebreaker** — "there's an orange star who wants to
  duet — go find them." Optionally give auras a meaning for the night
  (e.g. down-to-duet vs. just vibing).
- **Keep join → pick color/shape → on to a few seconds** — in a bar, any
  friction kills it. No account, works on any phone from the link/QR.

### The growth loop

Nail one recurring night → you've got a **repeatable playbook**: take the same
"host owns the room" motion to the next bar, the next event, the next scene.
Adoption is **venue-by-venue and host-led**, not a global launch. Vortex goes
from "someday, everyone" to "this Thursday, this room" — and that's a path you
can actually walk.

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
