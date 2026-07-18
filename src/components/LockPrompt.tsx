"use client";

import { useEffect, useRef, useState } from "react";
import { auraRgb } from "@/lib/aura";
import type { Link } from "@/hooks/usePresence";

const HOLD_MS = 1600;

type Props = {
  link: Link;
  onConfirm: () => void;
  onDecline: () => void;
};

/**
 * The mutual-lock prompt. Once two people have reached for each other, both
 * press and hold to confirm they've locked eyes — a hold (not a tap) so there
 * are no accidental confirmations. When both confirm, they've found each other.
 */
export default function LockPrompt({ link, onConfirm, onDecline }: Props) {
  const rgb = auraRgb(link.aura);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const tick = (now: number) => {
    if (!holdingRef.current) return;
    const p = Math.min(1, (now - startRef.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      holdingRef.current = false;
      setHolding(false);
      onConfirm();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };
  const start = () => {
    if (link.mine || link.done) return;
    holdingRef.current = true;
    setHolding(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  };
  const end = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
  };

  if (link.done) {
    return (
      <div
        className="flex flex-col items-center gap-1 rounded-2xl border px-6 py-4 text-center"
        style={{
          borderColor: `rgba(${rgb},0.6)`,
          background: `rgba(${rgb},0.14)`,
          boxShadow: `0 0 44px -6px rgba(${rgb},0.85)`,
        }}
      >
        <span className="text-lg font-semibold" style={{ color: `rgb(${rgb})` }}>
          You found each other
        </span>
        <span className="text-xs text-emerald-100/50">the rest is yours</span>
      </div>
    );
  }

  if (link.mine) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border px-4 py-3"
        style={{
          borderColor: `rgba(${rgb},0.4)`,
          background: `rgba(${rgb},0.08)`,
        }}
      >
        <span
          className="h-3 w-3 animate-pulse rounded-full"
          style={{ background: `rgb(${rgb})` }}
        />
        <span className="text-sm text-emerald-50/80">
          locked on your side — waiting for them…
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl border px-4 py-3"
      style={{
        borderColor: `rgba(${rgb},0.4)`,
        background: `rgba(${rgb},0.08)`,
      }}
    >
      <span className="text-sm text-emerald-50/85">Eyes met?</span>
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        className="relative w-56 select-none overflow-hidden rounded-full border py-3 text-sm font-medium"
        style={{ borderColor: `rgb(${rgb})`, touchAction: "none" }}
      >
        <span
          className="absolute left-0 top-0 h-full"
          style={{
            width: `${progress * 100}%`,
            background: `rgb(${rgb})`,
            transition: holding ? "none" : "width 200ms ease",
          }}
        />
        <span
          className="relative z-10"
          style={{ color: progress > 0.55 ? "#000" : `rgb(${rgb})` }}
        >
          {progress > 0 ? "hold…" : "Hold to confirm"}
        </span>
      </button>
      <button
        type="button"
        onClick={onDecline}
        className="text-xs text-emerald-100/40 transition-colors hover:text-emerald-100/70"
      >
        not this one
      </button>
    </div>
  );
}
