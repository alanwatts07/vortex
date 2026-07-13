"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHAKRAS,
  CHAKRA_ORDER,
  SHAPES,
  type ChakraId,
  type DotShape,
} from "@/lib/chakra";
import { paintShape } from "@/lib/shapePaint";

type Props = {
  onDone: (aura: { color: ChakraId; shape: DotShape }) => void;
};

type FloatItem = {
  color: ChakraId;
  rgb: string;
  shape: DotShape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  pulse: number;
};

const COUNT = 14;
const smooth = (t: number) => t * t * (3 - 2 * t);

function makeField(w: number, h: number): FloatItem[] {
  const items: FloatItem[] = [];
  const base = Math.max(16, Math.min(30, Math.min(w, h) * 0.055));
  for (let i = 0; i < COUNT; i++) {
    const color = CHAKRA_ORDER[i % CHAKRA_ORDER.length];
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const m = base * 2;
    items.push({
      color,
      rgb: CHAKRAS[color].rgb,
      shape,
      x: m + Math.random() * (w - m * 2),
      y: m + Math.random() * (h - m * 2),
      vx: (Math.random() - 0.5) * 26,
      vy: (Math.random() - 0.5) * 26,
      r: base * (0.8 + Math.random() * 0.5),
      pulse: Math.random() * Math.PI * 2,
    });
  }
  return items;
}

/**
 * A drifting constellation of colored shapes. Tap the one you're drawn to and it
 * swells to the center — that becomes your aura. No labels, no names: interpret
 * the color and form however you like.
 */
export default function AuraField({ onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemsRef = useRef<FloatItem[]>([]);
  const selectedRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [chosen, setChosen] = useState<{
    color: ChakraId;
    rgb: string;
    shape: DotShape;
  } | null>(null);
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
      if (itemsRef.current.length === 0) itemsRef.current = makeField(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { w, h } = size();
      const items = itemsRef.current;
      const sel = selectedRef.current;

      if (sel !== null) {
        progressRef.current = Math.min(1, progressRef.current + dt / 0.45);
      }
      const p = smooth(progressRef.current);
      const targetX = w / 2;
      const targetY = h * 0.4;
      const bigR = Math.min(w, h) * 0.14;

      ctx.clearRect(0, 0, w, h);

      items.forEach((it, i) => {
        // drift + wrap
        if (!reduced && sel === null) {
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          const m = it.r * 2;
          if (it.x < -m) it.x = w + m;
          if (it.x > w + m) it.x = -m;
          if (it.y < -m) it.y = h + m;
          if (it.y > h + m) it.y = -m;
        }
        it.pulse += dt * 1.5;

        const isSel = i === sel;
        let x = it.x;
        let y = it.y;
        let r = it.r;
        let alpha = 1;

        if (sel !== null) {
          if (isSel) {
            x = it.x + (targetX - it.x) * p;
            y = it.y + (targetY - it.y) * p;
            r = it.r + (bigR - it.r) * p;
          } else {
            alpha = 1 - p * 0.88; // fade the rest away
          }
        }

        const breathe = reduced ? 1 : 1 + Math.sin(it.pulse) * 0.06;
        const rr = r * breathe;

        // halo
        const haloR = rr * (isSel && sel !== null ? 2.4 : 1.9);
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        halo.addColorStop(0, `rgba(${it.rgb}, ${0.45 * alpha})`);
        halo.addColorStop(1, `rgba(${it.rgb}, 0)`);
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        paintShape(ctx, x, y, rr, it.shape, `rgba(${it.rgb}, ${0.95 * alpha})`);
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
      itemsRef.current = makeField(canvas.clientWidth, canvas.clientHeight);
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
    itemsRef.current.forEach((it, i) => {
      const d = Math.hypot(px - it.x, py - it.y);
      const reach = it.r * 1.5 + 14;
      if (d < reach && d < bestDist) {
        bestDist = d;
        hit = i;
      }
    });

    if (hit !== null) {
      const it = itemsRef.current[hit];
      selectedRef.current = hit;
      progressRef.current = 0;
      setChosen({ color: it.color, rgb: it.rgb, shape: it.shape });
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

  // return to the floating field, keeping the same shapes (just re-choose)
  const deselect = () => {
    selectedRef.current = null;
    progressRef.current = 0;
    setChosen(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050a07]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1 px-6 pt-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-100/40">
          vortex
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
              onClick={() =>
                onDone({ color: chosen.color, shape: chosen.shape })
              }
              className="w-full max-w-xs rounded-full px-6 py-4 text-base font-medium text-black transition-transform active:scale-[0.99]"
              style={{
                background: `rgb(${chosen.rgb})`,
                boxShadow: `0 0 44px -4px rgba(${chosen.rgb},0.85)`,
              }}
            >
              Enter the vortex
            </button>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={deselect}
                className="text-xs text-emerald-100/45 transition-colors hover:text-emerald-100/80"
              >
                ← choose a different one
              </button>
              <button
                type="button"
                onClick={stir}
                className="text-xs text-emerald-100/40 transition-colors hover:text-emerald-100/70"
              >
                stir ↻
              </button>
            </div>
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
