"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Radar, { type Blip } from "@/components/Radar";
import VortexSwitch from "@/components/VortexSwitch";
import AuraField from "@/components/AuraField";
import IntroSplash from "@/components/IntroSplash";
import { usePresence } from "@/hooks/usePresence";
import { isPresenceConfigured } from "@/lib/supabase";
import type { Coords } from "@/lib/geo";
import {
  AURA_COLORS,
  auraRgb,
  DEFAULT_AURA,
  isAuraId,
  type AuraId,
} from "@/lib/aura";

type GeoState = "idle" | "asking" | "granted" | "denied" | "unsupported";

const AURA_KEY = "vortex.aura";
const INTRO_KEY = "vortex.seenIntro";

// Deterministic drifting blips for demo mode — a spread of aura colors.
function makeBlips(n: number): Blip[] {
  const out: Blip[] = [];
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < n; i++) {
    const color = AURA_COLORS[Math.floor(rand() * AURA_COLORS.length)];
    out.push({
      angle: rand() * Math.PI * 2,
      dist: 0.25 + rand() * 0.7,
      drift: (rand() - 0.5) * 0.15,
      color: color.rgb,
    });
  }
  return out;
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [aura, setAura] = useState<AuraId | null>(null);
  const [editingAura, setEditingAura] = useState(false);
  const [seenIntro, setSeenIntro] = useState(false);
  const [reopenIntro, setReopenIntro] = useState(false);

  const [on, setOn] = useState(false);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const watchId = useRef<number | null>(null);

  const accent = auraRgb(aura);
  const demoBlips = useMemo(() => makeBlips(7), []);
  const { blips: realBlips, peerCount } = usePresence(
    on,
    coords,
    aura ?? DEFAULT_AURA,
  );

  const blips = realBlips ?? (on ? demoBlips : []);
  const nearbyCount = realBlips ? peerCount : on ? demoBlips.length : 0;

  // load saved aura + intro flag once, after hydration (mount-time read is intentional)
  useEffect(() => {
    let savedAura: string | null = null;
    let intro: string | null = null;
    try {
      savedAura = localStorage.getItem(AURA_KEY);
      intro = localStorage.getItem(INTRO_KEY);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAuraId(savedAura)) setAura(savedAura);
    if (intro === "1") setSeenIntro(true);
    setReady(true);
  }, []);

  const dismissIntro = () => {
    setSeenIntro(true);
    setReopenIntro(false);
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // ignore
    }
  };

  const saveIdentity = ({ color }: { color: AuraId }) => {
    setAura(color);
    setEditingAura(false);
    try {
      localStorage.setItem(AURA_KEY, color);
    } catch {
      // ignore
    }
  };

  // live timer while on
  useEffect(() => {
    if (!on) {
      startedAt.current = null;
      return;
    }
    startedAt.current = Date.now();
    const t = setInterval(() => {
      if (startedAt.current) {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [on]);

  const startWatch = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo("unsupported");
      return;
    }
    setGeo("asking");
    const onPos = (pos: GeolocationPosition) => {
      setGeo("granted");
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };
    // network-based location: fast and reliable indoors (a bar), where
    // high-accuracy GPS often stalls. ~city-block precision is plenty at 200 ft.
    const opts = { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 };
    // seed an immediate fix so the radar can place people right away…
    navigator.geolocation.getCurrentPosition(onPos, () => {}, opts);
    // …then keep it fresh as you move around the room.
    watchId.current = navigator.geolocation.watchPosition(
      onPos,
      () => setGeo("denied"),
      opts,
    );
  };

  const stopWatch = () => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setCoords(null);
  };

  const toggle = (next: boolean) => {
    if (next) {
      setElapsed(0);
      startWatch();
    } else {
      stopWatch();
    }
    setOn(next);
  };

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;

  const geoLabel =
    geo === "granted"
      ? "located"
      : geo === "asking"
        ? "locating…"
        : geo === "denied"
          ? "no location"
          : geo === "unsupported"
            ? "geo n/a"
            : "";

  // gate: onboarding until an aura is chosen (or when re-tuning)
  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <span className="h-3 w-3 animate-ping rounded-full bg-emerald-400/70" />
      </main>
    );
  }
  if (reopenIntro || (!seenIntro && aura === null)) {
    return <IntroSplash onDone={dismissIntro} />;
  }
  if (aura === null || editingAura) {
    return <AuraField onDone={saveIdentity} />;
  }

  return (
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-between overflow-hidden px-6 py-10">
      {/* ambient background glow, tinted to your aura */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(60% 50% at 50% 42%, rgba(${accent},${
            on ? 0.16 : 0.04
          }), transparent 70%)`,
          transition: "background 600ms ease",
        }}
      />

      {/* header */}
      <header className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full transition-all"
            style={{
              background: `rgb(${accent})`,
              boxShadow: on ? `0 0 12px 2px rgba(${accent},0.9)` : "none",
              opacity: on ? 1 : 0.5,
            }}
          />
          <h1 className="text-lg font-semibold tracking-tight">vortex</h1>
          <button
            type="button"
            onClick={() => setReopenIntro(true)}
            aria-label="How vortex works"
            className="ml-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[11px] text-emerald-100/50 transition-colors hover:border-white/35 hover:text-emerald-100/80"
          >
            ?
          </button>
        </div>
        <p className="max-w-xs text-sm text-emerald-100/50">
          Flip your light on to appear on the radar. A quiet signal that
          you&rsquo;re open to connect — right here, right now.
        </p>

        <button
          type="button"
          onClick={() => setEditingAura(true)}
          className="mt-1 flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-emerald-100/60 transition-colors hover:border-white/25"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: `rgb(${accent})`,
              boxShadow: `0 0 10px 1px rgba(${accent},0.8)`,
            }}
          />
          change
        </button>

        {!isPresenceConfigured && (
          <span className="mt-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] text-amber-200/80">
            demo mode · nearby dots simulated
          </span>
        )}
      </header>

      {/* radar */}
      <div className="relative flex w-full max-w-sm flex-1 items-center justify-center py-6">
        <div className="relative aspect-square w-full max-w-[22rem]">
          <Radar live={on} blips={blips} accent={accent} />
        </div>
      </div>

      {/* status + switch */}
      <footer className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex h-10 items-center justify-center text-center text-sm">
          {on ? (
            <div className="flex items-center gap-4 font-[family-name:var(--font-geist-mono)] text-emerald-200/70">
              <span>{nearbyCount} nearby</span>
              <span className="text-emerald-100/25">•</span>
              <span>{mmss} live</span>
              <span className="text-emerald-100/25">•</span>
              <span>{geoLabel}</span>
            </div>
          ) : (
            <span className="text-emerald-100/35">
              You&rsquo;re invisible. Flip on when you&rsquo;re open.
            </span>
          )}
        </div>

        <VortexSwitch on={on} onChange={toggle} color={accent} />

        <p className="h-4 text-xs text-emerald-100/30">
          {on ? "Tap again to go dark" : "No profile. No history. Just presence."}
        </p>
      </footer>
    </main>
  );
}
