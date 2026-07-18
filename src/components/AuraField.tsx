"use client";

import { useEffect, useRef, useState } from "react";
import { AURA_COLORS, type AuraId } from "@/lib/aura";

type Props = {
  onDone: (aura: { color: AuraId }) => void;
};

type Orb = {
  id: AuraId;
  rgb: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rx: number;
  ry: number;
  rot: number;
  vrot: number;
  pulse: number;
};

const smooth = (t: number) => t * t * (3 - 2 * t);

function makeField(w: number, h: number): Orb[] {
  const base = Math.max(15, Math.min(30, Math.min(w, h) * 0.05));
  // one orb per color, shuffled so the spectrum isn't laid out in a rainbow line
  const colors = [...AURA_COLORS].sort(() => Math.random() - 0.5);
  return colors.map((c) => {
    const r = base * (0.75 + Math.random() * 0.55);
    const m = r * 2;
    return {
      id: c.id,
      rgb: c.rgb,
      x: m + Math.random() * Math.max(1, w - m * 2),
      y: m + Math.random() * Math.max(1, h - m * 2),
      vx: (Math.random() - 0.5) * 24,
      vy: (Math.random() - 0.5) * 24,
      rx: r * (1 + Math.random() * 0.35), // gently oval
      ry: r * (0.8 + Math.random() * 0.2),
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.25,
      pulse: Math.random() * Math.PI * 2,
    };
  });
}

/** A soft glowing orb — radial falloff so it reads as energy, not a hard dot. */
function paintOrb(
  ctx: CanvasRenderingContext2D,
  o: Orb,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha: number,
) {
  const rMax = Math.max(rx, ry);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot);

  // outer bloom
  const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, rMax * 2.1);
  bloom.addColorStop(0, `rgba(${o.rgb}, ${0.4 * alpha})`);
  bloom.addColorStop(0.5, `rgba(${o.rgb}, ${0.12 * alpha})`);
  bloom.addColorStop(1, `rgba(${o.rgb}, 0)`);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 2.1, ry * 2.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = bloom;
  ctx.fill();

  // core
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, rMax);
  core.addColorStop(0, `rgba(${o.rgb}, ${0.98 * alpha})`);
  core.addColorStop(0.55, `rgba(${o.rgb}, ${0.8 * alpha})`);
  core.addColorStop(1, `rgba(${o.rgb}, 0)`);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();

  ctx.restore();
}

/**
 * A drifting field of colored energy orbs. Tap the one you're drawn to and it
 * swells to the center — that color becomes your aura. No labels, no names.
 */
export default function AuraField({ onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);
  const selectedRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [chosen, setChosen] = useState<{ color: AuraId; rgb: string } | null>(
    null,
  );
  const [stirNonce, setStirNonce] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let last = performance.now();
    const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { w, h } = size();
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (orbsRef.current.length === 0) orbsRef.current = makeField(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { w, h } = size();
      const orbs = orbsRef.current;
      const sel = selectedRef.current;

      if (sel !== null) {
        progressRef.current = Math.min(1, progressRef.current + dt / 0.45);
      }
      const p = smooth(progressRef.current);
      const targetX = w / 2;
      const targetY = h * 0.4;
      const bigR = Math.min(w, h) * 0.15;

      ctx.clearRect(0, 0, w, h);

      orbs.forEach((o, i) => {
        if (!reduced && sel === null) {
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          const m = Math.max(o.rx, o.ry) * 2.2;
          if (o.x < -m) o.x = w + m;
          if (o.x > w + m) o.x = -m;
          if (o.y < -m) o.y = h + m;
          if (o.y > h + m) o.y = -m;
          o.rot += o.vrot * dt;
        }
        o.pulse += dt * 1.4;

        const isSel = i === sel;
        let x = o.x;
        let y = o.y;
        let rx = o.rx;
        let ry = o.ry;
        let alpha = 1;

        if (sel !== null) {
          if (isSel) {
            x = o.x + (targetX - o.x) * p;
            y = o.y + (targetY - o.y) * p;
            rx = o.rx + (bigR - o.rx) * p;
            ry = o.ry + (bigR - o.ry) * p;
          } else {
            alpha = 1 - p * 0.9;
          }
        }

        const breathe = reduced ? 1 : 1 + Math.sin(o.pulse) * 0.05;
        paintOrb(ctx, o, x, y, rx * breathe, ry * breathe, alpha);
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // rebuild the field on "stir"
  useEffect(() => {
    if (stirNonce === 0) return;
    const canvas = canvasRef.current;
    if (canvas) {
      orbsRef.current = makeField(canvas.clientWidth, canvas.clientHeight);
    }
  }, [stirNonce]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let hit: number | null = null;
    let bestDist = Infinity;
    orbsRef.current.forEach((o, i) => {
      const d = Math.hypot(px - o.x, py - o.y);
      const reach = Math.max(o.rx, o.ry) * 1.25 + 10;
      if (d < reach && d < bestDist) {
        bestDist = d;
        hit = i;
      }
    });

    if (hit !== null) {
      const o = orbsRef.current[hit];
      selectedRef.current = hit;
      progressRef.current = 0;
      setChosen({ color: o.id, rgb: o.rgb });
    } else if (selectedRef.current === null) {
      stir();
    }
  };

  const stir = () => {
    selectedRef.current = null;
    progressRef.current = 0;
    setChosen(null);
    setStirNonce((n) => n + 1);
  };

  // return to the floating field, keeping the same orbs (just re-choose)
  const deselect = () => {
    selectedRef.current = null;
    progressRef.current = 0;
    setChosen(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050a07]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1 px-6 pt-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-100/40">
          Finding Us
        </p>
        <p className="text-lg font-medium text-emerald-50/90">
          Choose your energy
        </p>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointer}
        className="h-full w-full flex-1"
        style={{ touchAction: "none" }}
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 px-6 pb-10">
        {chosen ? (
          <>
            <button
              type="button"
              onClick={() => onDone({ color: chosen.color })}
              className="w-full max-w-xs rounded-full px-6 py-4 text-base font-medium text-black transition-transform active:scale-[0.99]"
              style={{
                background: `rgb(${chosen.rgb})`,
                boxShadow: `0 0 44px -4px rgba(${chosen.rgb},0.85)`,
              }}
            >
              Start finding
            </button>
            <button
              type="button"
              onClick={deselect}
              className="text-xs text-emerald-100/45 transition-colors hover:text-emerald-100/80"
            >
              change
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-emerald-100/45">
              Tap the one you&rsquo;re drawn to
            </p>
            <button
              type="button"
              onClick={stir}
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-emerald-100/50 transition-colors hover:border-white/25 hover:text-emerald-100/80"
            >
              stir them up ↻
            </button>
          </>
        )}
      </div>
    </div>
  );
}
